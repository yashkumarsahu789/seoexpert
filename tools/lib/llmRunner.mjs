/**
 * Server-side LLM runner — Groq / SambaNova / HuggingFace / Cloudflare Workers AI
 * DeepSeek intentionally skipped (user preference). Keys from .env (never VITE_).
 */

const GEMINI_MODELS = new Set([
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
])

const GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
])

const SAMBANOVA_MODELS = new Set([
  'Meta-Llama-3.1-405B-Instruct',
  'Meta-Llama-3.1-70B-Instruct',
  'Meta-Llama-3.1-8B-Instruct',
])

const CF_MODEL_MAP = {
  llama: '@cf/meta/llama-3.1-8b-instruct-fast',
  glm: '@cf/zai-org/glm-4.7-flash',
}

const FALLBACK_CHAIN = [
  'gemini-gemini-3.6-flash',
  'gemini-gemini-flash-latest',
  'groq-llama-3.3-70b-versatile',
  'groq-llama3-8b-8192',
  'sambanova-Meta-Llama-3.1-70B-Instruct',
  'hf-mistralai/Mistral-7B-Instruct-v0.3',
  'cf-llama',
  'cf-glm',
]

export function loadLlmEnv(env = process.env) {
  return {
    gemini: (env.GEMINI_API_KEY || env.GEMINI_API_KEY5 || env.GEMINI_API_KEY4 || env.VITE_GEMINI_API_KEY || '').trim(),
    groq: (env.grok || env.GROQ_API_KEY || '').trim(),
    sambanova: (env['sambanova.ai'] || env.SAMBANOVA_API_KEY || '').trim(),
    huggingface: (env.huggingface || env.HUGGINGFACE_TOKEN || '').trim(),
    cloudflare: {
      accountId: (env['cloudflare.account_id'] || env.CLOUDFLARE_ACCOUNT_ID || '').trim(),
      token: (env['cloudflare.api_token'] || env.CLOUDFLARE_API_TOKEN || '').trim(),
    },
  }
}

function agentToRoute(agentId, creds) {
  if (!agentId || agentId === 'github' || agentId.includes('deepseek')) return null

  if (agentId.startsWith('gemini-')) {
    if (!creds.gemini) return null
    const model = agentId.replace('gemini-', '')
    if (!GEMINI_MODELS.has(model)) return null
    return { provider: 'gemini', model, agentId }
  }

  if (agentId.startsWith('cf-')) {
    if (!creds.cloudflare.accountId || !creds.cloudflare.token) return null
    const key = agentId.replace('cf-', '')
    const model = CF_MODEL_MAP[key]
    if (!model) return null
    return { provider: 'cloudflare', model, agentId }
  }

  if (agentId.startsWith('groq-')) {
    if (!creds.groq) return null
    const model = agentId.replace('groq-', '')
    if (!GROQ_MODELS.has(model)) return null
    return { provider: 'groq', model, agentId }
  }

  if (agentId.startsWith('sambanova-')) {
    if (!creds.sambanova) return null
    const model = agentId.replace('sambanova-', '')
    if (!SAMBANOVA_MODELS.has(model)) return null
    return { provider: 'sambanova', model, agentId }
  }

  if (agentId.startsWith('hf-')) {
    if (!creds.huggingface) return null
    const model = agentId.replace('hf-', '')
    return { provider: 'huggingface', model, agentId }
  }

  return null
}

export function pickLlmRoute(preferredAgentId, creds, preferredList = []) {
  const tryIds = [
    preferredAgentId,
    ...(preferredList || []),
    ...FALLBACK_CHAIN,
  ].filter(Boolean)

  const seen = new Set()
  for (const id of tryIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const route = agentToRoute(id, creds)
    if (route) return route
  }
  return null
}

async function callGemini(apiKey, model, prompt, maxTokens) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.25 },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`)
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function callGroq(apiKey, model, prompt, maxTokens) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.25,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Groq HTTP ${res.status}`)
  return data?.choices?.[0]?.message?.content || ''
}

async function callSambanova(apiKey, model, prompt, maxTokens) {
  const res = await fetch('https://api.sambanova.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.25,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `SambaNova HTTP ${res.status}`)
  return data?.choices?.[0]?.message?.content || ''
}

async function callHuggingface(token, model, prompt, maxTokens) {
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: maxTokens, return_full_text: false },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `HuggingFace HTTP ${res.status}`)
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text
  if (typeof data?.generated_text === 'string') return data.generated_text
  return JSON.stringify(data)
}

async function callCloudflare(accountId, token, model, prompt, maxTokens) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      }),
    }
  )
  const data = await res.json()
  if (!res.ok || !data?.success) {
    throw new Error(data?.errors?.[0]?.message || `Cloudflare HTTP ${res.status}`)
  }
  const result = data?.result
  if (typeof result === 'string') return result
  if (result?.response) return result.response
  const choice = result?.choices?.[0]?.message?.content
  if (choice) return choice
  return JSON.stringify(result)
}

export async function runLlmChat({
  prompt,
  agentId = null,
  preferredAgents = [],
  maxTokens = 1024,
  env = process.env,
}) {
  const creds = loadLlmEnv(env)
  const tryIds = [
    agentId,
    ...(preferredAgents || []),
    ...FALLBACK_CHAIN,
  ].filter(Boolean)

  const seen = new Set()
  let lastError = null

  for (const id of tryIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const route = agentToRoute(id, creds)
    if (!route) continue

    try {
      let text = ''
      if (route.provider === 'gemini') {
        text = await callGemini(creds.gemini, route.model, prompt, maxTokens)
      } else if (route.provider === 'groq') {
        text = await callGroq(creds.groq, route.model, prompt, maxTokens)
      } else if (route.provider === 'sambanova') {
        text = await callSambanova(creds.sambanova, route.model, prompt, maxTokens)
      } else if (route.provider === 'huggingface') {
        text = await callHuggingface(creds.huggingface, route.model, prompt, maxTokens)
      } else if (route.provider === 'cloudflare') {
        text = await callCloudflare(
          creds.cloudflare.accountId,
          creds.cloudflare.token,
          route.model,
          prompt,
          maxTokens
        )
      }
      if (text) {
        return { text: String(text).trim(), agentId: route.agentId, provider: route.provider }
      }
    } catch (err) {
      lastError = err
      console.warn(`[llmRunner] Route "${id}" failed (${err.message}) — trying fallback...`)
    }
  }

  throw new Error(lastError?.message || 'Koi LLM provider configured nahi — Groq/SambaNova/HF ya Cloudflare keys .env me daalo')
}
