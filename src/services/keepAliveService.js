const N8N_BASE = (import.meta.env.VITE_N8N_BASE_URL || 'https://lifesolvenow.onrender.com').replace(
  /\/$/,
  ''
)
const KEEPALIVE_WEBHOOK =
  import.meta.env.VITE_N8N_KEEPALIVE_WEBHOOK_URL ||
  `${N8N_BASE}/webhook/render-lifetime-guard-ping`

const KEEPALIVE_INTERVAL_MS = 5 * 60 * 1000

function buildPingUrl(source) {
  const remote = KEEPALIVE_WEBHOOK.replace(/\/$/, '')
  const qs = `source=${encodeURIComponent(source)}`

  // Dev: Vite proxy se CORS avoid (vite.config.js → /api/n8n)
  if (import.meta.env.DEV && !remote.startsWith('/')) {
    const path = remote.replace(/^https?:\/\/[^/]+/, '')
    return `/api/n8n${path}?${qs}`
  }

  return `${remote}?${qs}`
}

function parseWebhookError(status, data) {
  const msg = data?.message || ''
  if (status === 404 && /not registered/i.test(msg)) {
    return 'Guard workflow active nahi — n8n mein "Render Lifetime Guard" on karo (npm run n8n:push -- render_lifetime_guard)'
  }
  return msg || `Keep-alive ping failed (${status})`
}

export function getKeepAliveWebhookUrl() {
  return KEEPALIVE_WEBHOOK
}

async function pingWithResponse(url) {
  const res = await fetch(url, {
    method: 'GET',
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(parseWebhookError(res.status, data))
    err.status = res.status
    throw err
  }

  const pingedAt = data?.pinged_at ? new Date(data.pinged_at) : new Date()
  return { status: res.status, data, pingedAt }
}

async function pingNoCors(url) {
  await fetch(url, { method: 'GET', mode: 'no-cors' })
  return {
    status: 0,
    data: null,
    pingedAt: new Date(),
    corsFallback: true,
  }
}

function isCrossOrigin(targetUrl) {
  if (typeof window === 'undefined' || !window.location?.origin) return false
  try {
    const target = new URL(targetUrl, window.location.href)
    return target.origin !== window.location.origin
  } catch {
    return false
  }
}

export async function pingKeepAlive(source = 'react_app') {
  const url = buildPingUrl(source)

  // In production cross-origin context (e.g. GitHub Pages -> Render),
  // sending a standard CORS fetch to an endpoint without Access-Control-Allow-Origin
  // causes the browser to forcefully log red CORS errors to the console.
  // Using no-cors transmits the GET request to wake Render without triggering browser CORS blocks.
  if (isCrossOrigin(url)) {
    try {
      return await pingNoCors(url)
    } catch (err) {
      return { status: 0, data: null, pingedAt: new Date(), error: err.message || 'Keep-alive ping failed' }
    }
  }

  try {
    return await pingWithResponse(url)
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      // Production fallback: browser CORS block — request still reaches n8n to wake Render
      const remoteUrl = `${KEEPALIVE_WEBHOOK.replace(/\/$/, '')}?source=${encodeURIComponent(source)}`
      try {
        return await pingNoCors(remoteUrl)
      } catch {
        return { status: 0, data: null, pingedAt: new Date(), error: 'CORS ping failed' }
      }
    }
    return {
      status: err.status || 500,
      data: null,
      pingedAt: new Date(),
      error: err.message,
    }
  }
}

export function startKeepAliveLoop(onResult) {
  const tick = async () => {
    try {
      const result = await pingKeepAlive('react_app')
      onResult?.({ ok: true, ...result })
    } catch (err) {
      onResult?.({ ok: false, error: err.message })
    }
  }

  tick()
  const timer = setInterval(tick, KEEPALIVE_INTERVAL_MS)
  return () => clearInterval(timer)
}

export { KEEPALIVE_INTERVAL_MS }
