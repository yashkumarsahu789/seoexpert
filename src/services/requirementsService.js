import { supabase } from '../supabaseClient'

function friendlyDbError(error) {
  const msg = error?.message || ''
  if (msg.includes('does not exist') || msg.includes('schema cache')) {
    return `Table missing — migration 005 run karo: ${msg}`
  }
  return msg || 'Database error'
}

export async function listRequirements(pillar) {
  let q = supabase
    .from('audit_requirements')
    .select('*')
    .eq('active', true)
    .order('pillar')
    .order('severity')
  if (pillar) q = q.eq('pillar', pillar)
  const { data, error } = await q
  if (error) throw new Error(friendlyDbError(error))
  return data || []
}

export async function listSyncLogs(limit = 10) {
  const { data, error } = await supabase
    .from('requirement_sync_log')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(friendlyDbError(error))
  return data || []
}

export async function listSiteRequirementChecks(auditRunId, pillar) {
  let q = supabase
    .from('site_requirement_checks')
    .select('*')
    .eq('audit_run_id', auditRunId)
    .order('severity')
  if (pillar) q = q.eq('pillar', pillar)
  const { data, error } = await q
  if (error) throw new Error(friendlyDbError(error))
  return data || []
}

export async function listKeywordRankings(websiteId, limit = 30) {
  const { data, error } = await supabase
    .from('keyword_rankings')
    .select('*')
    .eq('website_id', websiteId)
    .order('checked_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(friendlyDbError(error))
  return data || []
}

export async function listKeywordRankingsForRun(auditRunId, limit = 30) {
  const { data, error } = await supabase
    .from('keyword_rankings')
    .select('*')
    .eq('audit_run_id', auditRunId)
    .order('checked_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(friendlyDbError(error))
  return data || []
}

export async function listCompetitorSnapshots(auditRunId) {
  const { data, error } = await supabase
    .from('competitor_snapshots')
    .select('*')
    .eq('audit_run_id', auditRunId)
    .order('competitor_rank')
  if (error) throw new Error(friendlyDbError(error))
  return data || []
}

export const SOURCE_LABELS = {
  official: 'Engine Official',
  patent: 'Patents & Docs',
  tracker: 'Industry Trackers',
}

export const STATUS_LABELS = {
  present: 'Present on site',
  missing: 'Missing — add required',
  needs_update: 'Present — needs update',
  needs_remove: 'Harmful — remove/fix',
  not_applicable: 'N/A',
}

export function sourceBadgeClass(sourceType) {
  if (sourceType === 'official') return 'badge-official'
  if (sourceType === 'patent') return 'badge-patent'
  return 'badge-tracker'
}
