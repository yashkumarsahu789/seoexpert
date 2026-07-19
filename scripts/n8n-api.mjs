const DEFAULT_BASE = 'https://lifesolvenow.onrender.com'

function looksLikeN8nApiKey(key) {
  if (!key) return false
  if (key.startsWith('n8n_api_')) return true
  if (key.startsWith('eyJ')) return true
  return false
}

export function validateApiKey(key) {
  if (!key?.trim()) {
    throw new Error(
      'N8N_API_KEY missing — .env mein n8n Personal API Key add karo (Settings → n8n API → Create API key)'
    )
  }
  const trimmed = key.trim()
  if (!looksLikeN8nApiKey(trimmed)) {
    throw new Error(
      [
        'N8N_API_KEY galat lag rahi hai — yeh n8n Personal API Key nahi hai.',
        'Sahi key "n8n_api_..." ya "eyJ..." se start hoti hai.',
        'n8n UI → Settings → n8n API → Create API key → poori key copy karo.',
        'Render/env ka koi aur key (rnd_, webhook id, etc.) mat use karo.',
      ].join(' ')
    )
  }
  return trimmed
}

export function getN8nConfig() {
  const baseUrl = (process.env.N8N_API_URL || DEFAULT_BASE).replace(/\/$/, '')
  const apiKey = validateApiKey(process.env.N8N_API_KEY)
  return { baseUrl, apiKey }
}

async function n8nRequest(path, { method = 'GET', body } = {}) {
  const { baseUrl, apiKey } = getN8nConfig()
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `n8n API ${res.status}`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export function listWorkflows() {
  return n8nRequest('/workflows?limit=250')
}

export function getWorkflow(id) {
  return n8nRequest(`/workflows/${id}`)
}

export function createWorkflow(payload) {
  return n8nRequest('/workflows', { method: 'POST', body: payload })
}

export function updateWorkflow(id, payload) {
  return n8nRequest(`/workflows/${id}`, { method: 'PUT', body: payload })
}

export function activateWorkflow(id) {
  return n8nRequest(`/workflows/${id}/activate`, { method: 'POST', body: {} })
}

export function deactivateWorkflow(id) {
  return n8nRequest(`/workflows/${id}/deactivate`, { method: 'POST' })
}
