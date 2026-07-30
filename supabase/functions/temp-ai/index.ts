const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** LOCKED — only these 3 keys. Never read GEMINI_API_KEY / Google_API_KEY* / KEY4–9. */
const LOCKED_KEY_ENVS = ['TEMP_GOOGLE_API_KEY1', 'TEMP_GOOGLE_API_KEY2', 'TEMP_GOOGLE_API_KEY3']

const ALLOWED_MODELS = new Set([
  'gemini-2.0-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
])

/** Task → preferred models (client loop picks free slot; edge validates / fallback) */
const TASK_MODEL_MAP: Record<string, string[]> = {
  classify: ['gemini-2.0-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.0-flash'],
  seo_meta: ['gemini-2.0-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash'],
  keyword: ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],
  multilingual: ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'],
  summary: ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'],
  audit: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'],
  competitor: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
  action_plan: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
  deep_reason: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  general: ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
}

const MAX_OUTPUT_TOKENS = 2048

function cleanEnv(name: string): string {
  return (Deno.env.get(name) || '').trim().replace(/^['"]|['"]$/g, '')
}

function collectLockedKeys(): { name: string; key: string }[] {
  const out: { name: string; key: string }[] = []
  for (const name of LOCKED_KEY_ENVS) {
    const key = cleanEnv(name)
    if (key) out.push({ name, key })
  }
  return out
}

function resolveModel(modelKey?: string | null, taskType?: string | null): string {
  const raw = (modelKey || '').trim()
  if (raw && ALLOWED_MODELS.has(raw)) return raw

  const type = String(taskType || 'general').trim()
  const candidates = TASK_MODEL_MAP[type] || TASK_MODEL_MAP.general
  const picked = candidates.find((id) => ALLOWED_MODELS.has(id))
  if (!picked) {
    throw new Error(`taskType "${type}" ke liye koi allowed model nahi mila`)
  }
  return picked
}

function isRetryable(status: number, message: string): boolean {
  if (status === 429) return true
  const lower = message.toLowerCase()
  return lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource exhausted')
}

function extractText(data: Record<string, unknown>): string {
  const candidates = data?.candidates as Array<Record<string, unknown>> | undefined
  const content = candidates?.[0]?.content as Record<string, unknown> | undefined
  const parts = content?.parts as Array<{ text?: string }> | undefined
  return parts?.map((p) => p.text || '').join('').trim() || ''
}

async function callGeminiOnce(apiKey: string, model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
      },
    }),
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  const errObj = data?.error as { message?: string } | undefined
  const errMsg = errObj?.message || `Gemini HTTP ${res.status}`

  if (!res.ok) {
    const err = new Error(errMsg)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }

  const text = extractText(data)
  if (!text) throw new Error('Gemini ne khali jawab diya')
  return text
}

async function runWithLockedKeys(prompt: string, model: string) {
  const keys = collectLockedKeys()
  if (!keys.length) {
    throw new Error(
      'TEMP_GOOGLE_API_KEY1–3 missing — supabase secrets set TEMP_GOOGLE_API_KEY1=… (locked to /temp only)'
    )
  }

  let lastError = 'Unknown error'
  for (let i = 0; i < keys.length; i += 1) {
    const slot = keys[i]
    try {
      const text = await callGeminiOnce(slot.key, model, prompt)
      return { text, keySlot: slot.name, model }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = (err as Error & { status?: number }).status || 0
      lastError = message
      const hasMore = i < keys.length - 1
      if (hasMore && isRetryable(status, message)) continue
      throw new Error(message)
    }
  }
  throw new Error(`All TEMP keys failed. Last: ${lastError}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const action = String(body.action || 'generate')

  if (action === 'check-secrets') {
    const keys = collectLockedKeys()
    return new Response(
      JSON.stringify({
        ok: true,
        locked: true,
        folder: '/temp',
        keySlots: LOCKED_KEY_ENVS.map((name) => ({
          name,
          set: Boolean(cleanEnv(name)),
        })),
        count: keys.length,
        hint:
          keys.length === 3
            ? '3/3 TEMP keys — model task type se auto assign hota hai'
            : `${keys.length}/3 TEMP keys set — baaki supabase secrets me daalo`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (action !== 'generate') {
    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const prompt = String(body.prompt || '').trim()
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const model = resolveModel(body.model as string | undefined, body.taskType as string | undefined)

  try {
    const result = await runWithLockedKeys(prompt, model)
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
