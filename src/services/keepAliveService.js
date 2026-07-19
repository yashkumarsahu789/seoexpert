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

async function pingWithResponse(url, source) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-keepalive-source': source,
    },
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

export async function pingKeepAlive(source = 'react_app') {
  const url = buildPingUrl(source)

  try {
    return await pingWithResponse(url, source)
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      // Production: browser CORS block — request still reaches n8n to wake Render
      const remoteUrl = `${KEEPALIVE_WEBHOOK.replace(/\/$/, '')}?source=${encodeURIComponent(source)}`
      return pingNoCors(remoteUrl)
    }
    throw err
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
