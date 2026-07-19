import { supabase } from '../supabaseClient'

function isMissingSchemaError(error) {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  const msg = String(error.message || '')
  return msg.includes('does not exist') || msg.includes('schema cache')
}

export async function recordHeartbeat(source = 'react_app') {
  const { data, error } = await supabase.rpc('touch_n8n_heartbeat', { p_source: source })
  if (error) {
    if (isMissingSchemaError(error)) return null
    throw error
  }
  return data
}

export async function fetchHeartbeat() {
  const { data, error } = await supabase
    .from('n8n_heartbeat')
    .select('last_ping_at, source, status, instance_url, meta, updated_at')
    .eq('id', 'render_lifetime_guard')
    .maybeSingle()

  if (error) {
    if (isMissingSchemaError(error)) return null
    throw error
  }
  return data
}

export function formatRelativeTime(iso) {
  if (!iso) return 'Never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

export function heartbeatStatus(lastPingAt) {
  if (!lastPingAt) return 'unknown'
  const gapMin = (Date.now() - new Date(lastPingAt).getTime()) / 60000
  if (gapMin <= 8) return 'alive'
  if (gapMin <= 15) return 'warning'
  return 'sleeping'
}

/** Keep the newer timestamp — stale Supabase rows must not override a fresh webhook ping */
export function pickNewerPing(current, incoming) {
  if (!incoming) return current ?? null
  if (!current) return incoming
  return new Date(incoming) > new Date(current) ? incoming : current
}
