import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type FolderKey = {
  id: string
  provider: string
  api_key: string
  config_json: Record<string, unknown>
}

type AiRequest = {
  action?: string
  folderId?: string
  workflowId?: string
  stepId?: string
  inputJson?: Record<string, unknown>
  runId?: string
}

function isRetryable(status: number, message: string): boolean {
  if (status === 429) return true
  const lower = message.toLowerCase()
  return lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource exhausted')
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        return JSON.parse(match[1].trim())
      } catch {
        return null
      }
    }
    return null
  }
}

async function callGemini(key: FolderKey, prompt: string): Promise<string> {
  const model = String(key.config_json?.model || 'gemini-2.0-flash')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key.api_key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.2 },
    }),
  })
  const data = await res.json()
  const errMsg = data?.error?.message || `Gemini HTTP ${res.status}`
  if (!res.ok) {
    const err = new Error(errMsg)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || ''
  if (!text) throw new Error('Gemini ne khali jawab diya')
  return text
}

async function callOpenAi(key: FolderKey, prompt: string): Promise<string> {
  const model = String(key.config_json?.model || 'gpt-4o-mini')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key.api_key}`,
  }
  if (key.config_json?.organization) {
    headers['OpenAI-Organization'] = String(key.config_json.organization)
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  })
  const data = await res.json()
  const errMsg = data?.error?.message || `OpenAI HTTP ${res.status}`
  if (!res.ok) {
    const err = new Error(errMsg)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('OpenAI ne khali jawab diya')
  return text
}

async function callAnthropic(key: FolderKey, prompt: string): Promise<string> {
  const model = String(key.config_json?.model || 'claude-3-5-haiku-latest')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  const errMsg = data?.error?.message || `Anthropic HTTP ${res.status}`
  if (!res.ok) {
    const err = new Error(errMsg)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  const text = data?.content?.map((p: { text?: string }) => p.text || '').join('') || ''
  if (!text) throw new Error('Anthropic ne khali jawab diya')
  return text
}

async function callCustom(key: FolderKey, prompt: string): Promise<string> {
  const baseUrl = String(key.config_json?.base_url || '').replace(/\/$/, '')
  const model = String(key.config_json?.model || 'default')
  const authHeader = String(key.config_json?.auth_header || 'Authorization')
  const authPrefix = String(key.config_json?.auth_prefix ?? 'Bearer ')
  if (!baseUrl) throw new Error('Custom provider ke liye base_url chahiye')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [authHeader]: `${authPrefix}${key.api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  })
  const data = await res.json()
  const errMsg = data?.error?.message || `Custom API HTTP ${res.status}`
  if (!res.ok) {
    const err = new Error(errMsg)
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  const text = data?.choices?.[0]?.message?.content || data?.content?.[0]?.text || data?.output || ''
  if (!text) throw new Error('Custom API ne khali jawab diya')
  return typeof text === 'string' ? text : JSON.stringify(text)
}

async function callAiWithKeys(keys: FolderKey[], prompt: string): Promise<string> {
  if (!keys.length) throw new Error('Is folder me koi active API key nahi — pehle key add karo')

  let lastError = 'Unknown error'
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    try {
      if (key.provider === 'openai') return await callOpenAi(key, prompt)
      if (key.provider === 'anthropic') return await callAnthropic(key, prompt)
      if (key.provider === 'custom') return await callCustom(key, prompt)
      return await callGemini(key, prompt)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const status = (err as Error & { status?: number }).status || 0
      lastError = message
      if (i < keys.length - 1 && isRetryable(status, message)) continue
      throw new Error(message)
    }
  }
  throw new Error(`All API keys failed. Last: ${lastError}`)
}

async function loadFolderKeys(supabase: ReturnType<typeof createClient>, folderId: string) {
  const { data, error } = await supabase
    .from('folder_api_keys')
    .select('id, provider, api_key, config_json')
    .eq('folder_id', folderId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []) as FolderKey[]
}

const ANALYZE_PROMPT = (userPrompt: string) => `You are an automation architect. Break this user workflow into ordered steps.

Return ONLY valid JSON array. Each item:
{"category":"trigger|data|action|output","title":"short title","description":"what this step does"}

USER WORKFLOW:
"""
${userPrompt}
"""`

const BUILD_STEP_PROMPT = (workflowPrompt: string, step: { title: string; category: string; prompt?: string }) => `Design one automation step as JSON.

Return ONLY valid JSON:
{"nodeType":"webhook|schedule|http|supabase|llm|notify","config":{...},"inputs":[],"outputs":[],"notes":"..."}

WORKFLOW CONTEXT:
"""
${workflowPrompt}
"""

STEP:
Category: ${step.category}
Title: ${step.title}
Description: ${step.prompt || step.title}`

const COMPILE_PROMPT = (workflowPrompt: string, steps: unknown[]) => `Compile these automation steps into final spec + test UI.

Return ONLY valid JSON:
{
  "spec_json": {"trigger":{},"nodes":[],"edges":[],"envVars":[]},
  "ui_schema": {"title":"","description":"","fields":[{"name":"","label":"","type":"text|url|textarea|select","options":[]}],"submitLabel":"Run Test"}
}

WORKFLOW:
"""
${workflowPrompt}
"""

STEPS:
${JSON.stringify(steps, null, 2)}`

const TEST_RUN_PROMPT = (spec: unknown, input: unknown) => `Simulate running this automation with the given input. Return ONLY valid JSON:
{"ok":true,"summary":"human readable result","output":{},"steps_executed":[]}

SPEC:
${JSON.stringify(spec, null, 2)}

INPUT:
${JSON.stringify(input, null, 2)}`

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

  let body: AiRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { action, folderId, workflowId, stepId, inputJson, runId } = body
  if (!action || !folderId || !workflowId) {
    return new Response(JSON.stringify({ error: 'action, folderId, workflowId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: workflow, error: wfErr } = await supabase
    .from('folder_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('folder_id', folderId)
    .maybeSingle()
  if (wfErr || !workflow) {
    return new Response(JSON.stringify({ error: 'Workflow not found for folder' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const keys = await loadFolderKeys(supabase, folderId)

  try {
    if (action === 'analyze') {
      const text = await callAiWithKeys(keys, ANALYZE_PROMPT(workflow.user_prompt))
      const parsed = extractJson(text)
      if (!Array.isArray(parsed) || !parsed.length) {
        throw new Error('AI ne valid steps nahi diye — dubara try karo')
      }

      await supabase.from('folder_workflow_steps').delete().eq('workflow_id', workflowId)

      const rows = parsed.map((step: { category?: string; title?: string; description?: string }, i: number) => ({
        workflow_id: workflowId,
        step_order: i + 1,
        category: step.category || 'action',
        title: step.title || `Step ${i + 1}`,
        status: 'pending',
        prompt: step.description || step.title || '',
      }))

      const { error: insertErr } = await supabase.from('folder_workflow_steps').insert(rows)
      if (insertErr) throw new Error(insertErr.message)

      await supabase
        .from('folder_workflows')
        .update({
          generation_stage: 'building_steps',
          generation_progress: { currentStep: 0, totalSteps: rows.length },
          error_message: null,
        })
        .eq('id', workflowId)

      return new Response(JSON.stringify({ ok: true, stepsCreated: rows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'build_step') {
      if (!stepId) throw new Error('stepId required')

      const { data: step, error: stepErr } = await supabase
        .from('folder_workflow_steps')
        .select('*')
        .eq('id', stepId)
        .eq('workflow_id', workflowId)
        .maybeSingle()
      if (stepErr || !step) throw new Error('Step not found')

      const text = await callAiWithKeys(keys, BUILD_STEP_PROMPT(workflow.user_prompt, step))
      const parsed = extractJson(text) || { raw: text }

      await supabase
        .from('folder_workflow_steps')
        .update({ status: 'done', ai_response: parsed })
        .eq('id', stepId)

      const { data: allSteps } = await supabase
        .from('folder_workflow_steps')
        .select('id, status')
        .eq('workflow_id', workflowId)

      const doneCount = (allSteps || []).filter((s) => s.status === 'done').length
      const total = (allSteps || []).length
      const pending = (allSteps || []).some((s) => s.status === 'pending')

      await supabase
        .from('folder_workflows')
        .update({
          generation_progress: { currentStep: doneCount, totalSteps: total },
          generation_stage: pending ? 'building_steps' : 'compiling',
        })
        .eq('id', workflowId)

      return new Response(JSON.stringify({ ok: true, stepId, doneCount, total, pending }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'compile') {
      const { data: steps, error: stepsErr } = await supabase
        .from('folder_workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('step_order', { ascending: true })
      if (stepsErr) throw new Error(stepsErr.message)

      const text = await callAiWithKeys(keys, COMPILE_PROMPT(workflow.user_prompt, steps || []))
      const parsed = extractJson(text) as { spec_json?: unknown; ui_schema?: unknown } | null
      if (!parsed?.spec_json || !parsed?.ui_schema) {
        throw new Error('Compile failed — spec_json / ui_schema missing')
      }

      await supabase
        .from('folder_workflows')
        .update({
          spec_json: parsed.spec_json,
          ui_schema: parsed.ui_schema,
          status: 'ready',
          generation_stage: 'ready',
          generation_progress: {
            currentStep: (steps || []).length,
            totalSteps: (steps || []).length,
          },
          error_message: null,
        })
        .eq('id', workflowId)

      return new Response(JSON.stringify({ ok: true, status: 'ready' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'edit_step') {
      if (!stepId) throw new Error('stepId required')
      const { data: step, error: stepErr } = await supabase
        .from('folder_workflow_steps')
        .select('*')
        .eq('id', stepId)
        .maybeSingle()
      if (stepErr || !step) throw new Error('Step not found')

      const text = await callAiWithKeys(keys, BUILD_STEP_PROMPT(workflow.user_prompt, step))
      const parsed = extractJson(text) || { raw: text }

      await supabase
        .from('folder_workflow_steps')
        .update({ status: 'done', ai_response: parsed })
        .eq('id', stepId)

      return new Response(JSON.stringify({ ok: true, stepId, aiResponse: parsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'test_run') {
      const text = await callAiWithKeys(keys, TEST_RUN_PROMPT(workflow.spec_json, inputJson || {}))
      const parsed = extractJson(text) || { ok: true, summary: text, output: { raw: text } }

      if (runId) {
        await supabase
          .from('folder_workflow_runs')
          .update({
            status: parsed.ok === false ? 'failed' : 'completed',
            output_json: parsed,
            error_message: parsed.ok === false ? String(parsed.summary || 'Test failed') : null,
          })
          .eq('id', runId)
      }

      return new Response(JSON.stringify({ ok: true, output: parsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    if (action !== 'test_run') {
      await supabase
        .from('folder_workflows')
        .update({ status: 'failed', generation_stage: 'failed', error_message: message })
        .eq('id', workflowId)
    }

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
