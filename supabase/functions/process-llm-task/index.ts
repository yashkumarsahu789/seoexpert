import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = 'gemini-flash-latest'
const ALLOWED_MODELS = new Set([
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite-001',
])

const MAX_OUTPUT_TOKENS = 1024

type BulkTaskRecord = {
  id: number
  input_text: string
  model_key?: string | null
}

type DbWebhookPayload = {
  type?: string
  table?: string
  record?: BulkTaskRecord
  schema?: string
}

function cleanEnv(name: string): string {
  return (Deno.env.get(name) || '').trim().replace(/^['"]|['"]$/g, '')
}

function resolveModel(overrideKey?: string | null): string {
  const raw = (overrideKey || cleanEnv('GEMINI_MODEL') || DEFAULT_MODEL).trim()
  if (ALLOWED_MODELS.has(raw)) return raw
  return DEFAULT_MODEL
}

function collectGeminiKeys(): string[] {
  const keys: string[] = []
  const primary = cleanEnv('GEMINI_API_KEY')
  if (primary) keys.push(primary)

  const env = Deno.env.toObject()
  const numbered = Object.entries(env)
    .filter(([name, value]) => /^(GEMINI_API_KEY|Google_API_KEY)\d+$/i.test(name) && value?.trim())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))

  for (const [, value] of numbered) {
    keys.push(value!.trim())
  }

  return [...new Set(keys)]
}

function extractRecord(body: DbWebhookPayload | BulkTaskRecord): BulkTaskRecord | null {
  if ('record' in body && body.record?.id && body.record?.input_text) {
    return body.record
  }
  if ('id' in body && 'input_text' in body && body.input_text) {
    return body as BulkTaskRecord
  }
  return null
}

function isRetryableGeminiError(status: number, message: string): boolean {
  if (status === 429) return true
  const lower = message.toLowerCase()
  return lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource exhausted')
}

function extractGeminiText(data: Record<string, unknown>): string {
  const candidates = data?.candidates as Array<Record<string, unknown>> | undefined
  const parts = candidates?.[0]?.content as Record<string, unknown> | undefined
  const textParts = parts?.parts as Array<{ text?: string }> | undefined
  const text = textParts?.map((p) => p.text || '').join('').trim()
  return text || ''
}

async function callGeminiOnce(apiKey: string, model: string, inputText: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: inputText }] }],
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

  const text = extractGeminiText(data)
  if (!text) {
    throw new Error('Gemini ne khali jawab diya — chhota input try karo ya dubara run karo.')
  }
  return text
}

async function runGemini(inputText: string, modelKey?: string | null): Promise<string> {
  const keys = collectGeminiKeys()
  if (!keys.length) {
    throw new Error('GEMINI_API_KEY missing — supabase secrets set GEMINI_API_KEY=<AIza-key>')
  }

  const model = resolveModel(modelKey)
  let lastError = 'Unknown error'

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    try {
      return await callGeminiOnce(key, model, inputText)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = (err as Error & { status?: number }).status || 0
      lastError = message

      const hasMore = i < keys.length - 1
      if (hasMore && isRetryableGeminiError(status, message)) {
        continue
      }
      throw new Error(message)
    }
  }

  throw new Error(`All Gemini keys failed. Last: ${lastError}`)
}

function secretDiagnostics() {
  const keys = collectGeminiKeys()
  return {
    geminiKeys: {
      count: keys.length,
      primarySet: Boolean(cleanEnv('GEMINI_API_KEY')),
      rotationPool: keys.length > 1,
    },
    model: resolveModel(),
  }
}

async function markFailed(supabase: ReturnType<typeof createClient>, id: number, message: string) {
  await supabase
    .from('bulk_tasks')
    .update({ status: 'failed', ai_response: `[error] ${message}` })
    .eq('id', id)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase service env missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: DbWebhookPayload | BulkTaskRecord & { action?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if ('action' in body && body.action === 'check-secrets') {
    const diag = secretDiagnostics()
    let hint = `${diag.geminiKeys.count} Gemini key(s) configured — try Classify.`
    if (!diag.geminiKeys.primarySet && diag.geminiKeys.count === 0) {
      hint = 'GEMINI_API_KEY missing — supabase secrets set GEMINI_API_KEY=<AIza-key>'
    } else if (!diag.geminiKeys.primarySet) {
      hint = 'Primary GEMINI_API_KEY missing — rotation pool keys only.'
    }
    return new Response(JSON.stringify({ ok: true, diagnostics: diag, hint }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const record = extractRecord(body)
  if (!record) {
    return new Response(JSON.stringify({ error: 'Missing record.id and record.input_text' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: locked, error: lockErr } = await supabase
    .from('bulk_tasks')
    .update({ status: 'processing' })
    .eq('id', record.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (lockErr) {
    return new Response(JSON.stringify({ error: lockErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!locked) {
    return new Response(JSON.stringify({ skipped: true, reason: 'not pending or already processing' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const aiResponse = await runGemini(record.input_text, record.model_key)

    const { error: doneErr } = await supabase
      .from('bulk_tasks')
      .update({ ai_response: aiResponse, status: 'completed' })
      .eq('id', record.id)

    if (doneErr) throw new Error(doneErr.message)

    return new Response(JSON.stringify({ ok: true, id: record.id, status: 'completed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await markFailed(supabase, record.id, message)

    return new Response(JSON.stringify({ ok: false, id: record.id, status: 'failed', error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
