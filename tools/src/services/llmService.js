/**
 * Browser → dev server /api/llm proxy (keys server-side only)
 */

export async function callLlmFromBrowser({ prompt, agentId, preferredAgents, maxTokens = 1024 }) {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, agentId, preferredAgents, maxTokens }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `LLM HTTP ${res.status}`)
  return data
}

export async function isLlmAvailable() {
  try {
    const res = await fetch('/api/llm', { method: 'OPTIONS' })
    return res.status !== 404
  } catch {
    return false
  }
}
