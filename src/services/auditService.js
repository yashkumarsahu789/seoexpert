import { supabase } from '../supabaseClient'
import { websiteDomain } from './websiteService'

const RUN_COLUMNS =
  'id, website_id, website_url, domain, status, mode, wos_score, s_seo, s_aeo, s_geo, phase_keywords, phase_competitors, summary, keywords, competitors, started_at, completed_at'

function friendlyDbError(error) {
  const msg = error?.message || ''
  if (msg.includes('audit_runs') && (msg.includes('schema cache') || msg.includes('does not exist'))) {
    return 'audit_runs table missing — Supabase migration 002_audit_pipeline.sql run karo'
  }
  return msg || 'Database error'
}

export async function getLatestAuditRunForWebsite(websiteId) {
  const { data, error } = await supabase
    .from('audit_runs')
    .select(RUN_COLUMNS)
    .eq('website_id', websiteId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(friendlyDbError(error))
  if (data) return data

  const { data: site, error: siteErr } = await supabase
    .from('websites')
    .select('url')
    .eq('id', websiteId)
    .single()

  if (siteErr || !site?.url) return null

  const domain = websiteDomain(site.url)
  const { data: byDomain, error: domErr } = await supabase
    .from('audit_runs')
    .select(RUN_COLUMNS)
    .eq('domain', domain)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (domErr) throw new Error(friendlyDbError(domErr))
  return byDomain
}

export async function listAuditRuns(limit = 20) {
  const { data, error } = await supabase
    .from('audit_runs')
    .select(
      'id, website_id, website_url, domain, status, mode, wos_score, s_seo, s_aeo, s_geo, phase_seo, phase_aeo, phase_geo, phase_keywords, phase_competitors, summary, started_at, completed_at'
    )
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(friendlyDbError(error))
  return data || []
}

export async function getAuditReportHtml(auditRunId) {
  const { data, error } = await supabase
    .from('audit_runs')
    .select('report_html')
    .eq('id', auditRunId)
    .single()

  if (error) throw error
  return data?.report_html || ''
}

export async function getAuditRun(auditRunId) {
  const { data, error } = await supabase
    .from('audit_runs')
    .select('*')
    .eq('id', auditRunId)
    .single()

  if (error) throw error
  return data
}

export async function listAuditFindings(auditRunId) {
  const { data, error } = await supabase
    .from('audit_findings')
    .select('*')
    .eq('audit_run_id', auditRunId)
    .order('severity', { ascending: true })

  if (error) throw error
  return data || []
}

export async function pollAuditRun(auditRunId, { maxAttempts = 60, intervalMs = 5000 } = {}) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const run = await getAuditRun(auditRunId)
    if (run.status === 'completed' || run.status === 'failed') return run
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error('Audit timed out — n8n workflow still running')
}

export function scoreLabel(score) {
  if (score == null) return '—'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  return 'Needs work'
}

export function exportActionPlanCsv(actionPlan, domain = 'audit') {
  if (!actionPlan?.length) return
  const header = ['step', 'priority', 'type', 'code', 'title', 'remediation', 'category', 'status']
  const rows = actionPlan.map((r) =>
    [r.step, r.priority, r.type, r.code, r.title, r.remediation, r.category, r.status]
      .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
      .join(',')
  )
  const csv = [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `action-plan-${domain}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function severityOrder(severity) {
  const order = { critical: 0, high: 1, medium: 2, low: 3 }
  return order[severity] ?? 9
}
