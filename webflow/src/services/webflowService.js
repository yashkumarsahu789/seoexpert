import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { getWebflowWebhookUrl } from '../data/webflow'

const N8N_BASE = (import.meta.env.VITE_N8N_BASE_URL || 'https://lifesolvenow.onrender.com').replace(/\/$/, '')

const WEBFLOW_WEBHOOK_REMOTE =
  getWebflowWebhookUrl() || `${N8N_BASE}/webhook/webflow-site-spawn`

function webhookUrl() {
  const remote = WEBFLOW_WEBHOOK_REMOTE.replace(/\/$/, '')
  if (import.meta.env.DEV && !remote.startsWith('/')) {
    const path = remote.replace(/^https?:\/\/[^/]+/, '')
    return `/api/n8n${path}`
  }
  return remote
}

export function isWebflowAutomationReady() {
  return Boolean(WEBFLOW_WEBHOOK_REMOTE?.trim())
}

function parseWebhookError(status, data) {
  const msg = data?.message || data?.error || ''
  if (status === 404 && /not registered/i.test(msg)) {
    return 'Webflow workflow active nahi — n8n me push karo: npm run n8n:push -- webflow_site_spawn'
  }
  if (msg) return msg
  return `Webflow spawn failed (${status})`
}

/** User requirement bhejo → n8n AI + Webflow API → live site URL */
export async function spawnWebflowSite(requirement, { dryRun = false } = {}) {
  const text = String(requirement || '').trim()
  if (!text) throw new Error('Pehle batao kya banana hai — requirement khali hai')

  const url = webhookUrl()
  if (!url?.trim()) {
    throw new Error('VITE_N8N_WEBFLOW_WEBHOOK_URL missing — .env me set karo')
  }

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement: text, dryRun, event: 'Webflow Site Spawn' }),
    })
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error(
        'n8n tak request nahi pahunchi. Dev me Vite restart karo aur webflow_site_spawn workflow activate karo.'
      )
    }
    throw err
  }

  const raw = await res.text()
  let data = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = { raw }
  }

  if (!res.ok) {
    throw new Error(parseWebhookError(res.status, data))
  }

  if (data?.ok === false) {
    throw new Error(data.error || 'Webflow site spawn failed')
  }

  return data
}

export async function listWebflowSites(limit = 20) {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('webflow_sites')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data || []
}

export { webhookUrl }
