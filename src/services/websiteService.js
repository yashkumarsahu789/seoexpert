import { supabase } from '../supabaseClient'
import { executeNativeAudit } from './nativeAuditEngine'

const SITE_NAME = import.meta.env.VITE_SITE_NAME || 'LifeSolveNow'

const WEBSITE_COLUMNS = 'id, url, status, site_name, created_at'

export function normalizeUrl(input) {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Website URL required')
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  new URL(withProtocol)
  return withProtocol
}

/** Same site = same hostname (ignores www, http/https, trailing slash) */
export function websiteDomain(input) {
  const normalized = normalizeUrl(input)
  const parsed = new URL(normalized)
  return parsed.hostname.replace(/^www\./i, '').toLowerCase()
}

export function canonicalWebsiteUrl(input) {
  const normalized = normalizeUrl(input)
  const parsed = new URL(normalized)
  const domain = parsed.hostname.replace(/^www\./i, '').toLowerCase()
  const path = parsed.pathname.replace(/\/$/, '')
  return path ? `https://${domain}${path}` : `https://${domain}`
}

export function withDomain(site) {
  if (!site) return site
  return { ...site, domain: websiteDomain(site.url) }
}

export async function listWebsites() {
  const { data, error } = await supabase
    .from('websites')
    .select(WEBSITE_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data || []).map(withDomain)
}

export async function findWebsiteByDomain(rawUrl) {
  const domain = websiteDomain(rawUrl)
  const sites = await listWebsites()
  return sites.find((s) => s.domain === domain) || null
}

export async function submitWebsite(rawUrl, { mode = 'full', onProgress } = {}) {
  const url = canonicalWebsiteUrl(rawUrl)

  const existing = await findWebsiteByDomain(rawUrl)
  if (existing) {
    const err = new Error(
      `Ye site pehle se saved hai. Run Audit mat dabao — Saved Sites se "View Results" kholo, ya "Re-audit" se naya scan chalao.`
    )
    err.code = 'DUPLICATE_WEBSITE'
    err.existingId = existing.id
    throw err
  }

  const { data: row, error: insertError } = await supabase
    .from('websites')
    .insert({ url, site_name: SITE_NAME, status: 'pending' })
    .select(WEBSITE_COLUMNS)
    .single()

  if (insertError) throw insertError

  const site = withDomain(row)

  const result = await executeNativeAudit({
    websiteId: site.id,
    websiteUrl: site.url,
    mode,
    onProgress,
  })

  return { ...site, auditRunId: result.auditRunId, completedRun: result }
}

export async function reAuditWebsite(websiteId, { mode = 'full', onProgress } = {}) {
  const { data: row, error } = await supabase
    .from('websites')
    .select(WEBSITE_COLUMNS)
    .eq('id', websiteId)
    .single()

  if (error) throw error

  const { error: updateError } = await supabase
    .from('websites')
    .update({ status: 'pending' })
    .eq('id', websiteId)

  if (updateError) throw updateError

  const site = withDomain(row)
  const result = await executeNativeAudit({
    websiteId: site.id,
    websiteUrl: site.url,
    mode,
    onProgress,
  })

  return { ...site, auditRunId: result.auditRunId, completedRun: result }
}

export async function deleteWebsite(websiteId) {
  const { data: runs, error: runsError } = await supabase
    .from('audit_runs')
    .select('id')
    .eq('website_id', websiteId)

  if (runsError) throw runsError

  const runIds = (runs || []).map((r) => r.id)
  if (runIds.length > 0) {
    const { error: findingsError } = await supabase
      .from('audit_findings')
      .delete()
      .in('audit_run_id', runIds)
    if (findingsError) throw findingsError

    const { error: auditDeleteError } = await supabase
      .from('audit_runs')
      .delete()
      .in('id', runIds)
    if (auditDeleteError) throw auditDeleteError
  }

  const { error } = await supabase.from('websites').delete().eq('id', websiteId)
  if (error) throw error

  return { deletedRuns: runIds.length }
}
