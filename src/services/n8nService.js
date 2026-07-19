const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'LifeSolveNow'
const AUDIT_WEBHOOK = import.meta.env.VITE_N8N_AUDIT_WEBHOOK_URL || ''
const ERROR_WEBHOOK = import.meta.env.VITE_N8N_ERROR_WEBHOOK_URL || AUDIT_WEBHOOK

export function isN8nConfigured() {
  return Boolean(AUDIT_WEBHOOK?.trim())
}

export async function triggerAuditWorkflow({ websiteId, websiteUrl, event, shop, ...extra }) {
  if (!AUDIT_WEBHOOK?.trim()) {
    throw new Error('n8n audit webhook missing — VITE_N8N_AUDIT_WEBHOOK_URL set karo')
  }

  const payload = {
    event: event || 'Website Audit Request',
    site: SITE_NAME,
    websiteId,
    websiteUrl,
    shop: shop || null,
    timestamp: new Date().toISOString(),
    source: 'seoexpert-react',
    ...extra,
  }

  const res = await fetch(AUDIT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(data?.message || `n8n webhook failed (${res.status})`)
    err.status = res.status
    throw err
  }

  if (!data?.auditRunId) {
    const err = new Error(
      'n8n ne audit start nahi kiya — auditRunId missing. n8n execution logs check karo (Normalize URL node).'
    )
    err.status = res.status
    throw err
  }

  return { status: res.status, data, auditRunId: data.auditRunId }
}

export async function reportErrorToN8N(errorDetails = {}) {
  if (!ERROR_WEBHOOK?.trim()) return { skipped: true }

  try {
    await fetch(ERROR_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site: SITE_NAME,
        event: 'Website Error Logged',
        errorMessage: errorDetails.message || 'Unknown Error',
        statusCode: errorDetails.statusCode || 500,
        websiteUrl: errorDetails.websiteUrl || null,
        timestamp: new Date().toISOString(),
        source: 'seoexpert-react',
      }),
    })
  } catch (err) {
    console.error('Failed to send log to n8n:', err)
  }
}
