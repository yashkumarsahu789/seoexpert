import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  exportActionPlanCsv,
  getAuditReportHtml,
  getAuditRun,
  getLatestAuditRunForWebsite,
  listAuditRuns,
  pollAuditRun,
} from '../services/auditService'
import {
  listCompetitorSnapshots,
  listKeywordRankings,
  listKeywordRankingsForRun,
  listRequirements,
  listSiteRequirementChecks,
  listSyncLogs,
} from '../services/requirementsService'
import { listWebsites, reAuditWebsite, submitWebsite } from '../services/websiteService'

const AuditContext = createContext(null)

export function AuditProvider({ children }) {
  const [mode, setMode] = useState('full')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [activeRun, setActiveRun] = useState(null)
  const [runs, setRuns] = useState([])
  const [websites, setWebsites] = useState([])
  const [reqChecks, setReqChecks] = useState([])
  const [competitors, setCompetitors] = useState([])
  const [rankHistory, setRankHistory] = useState([])
  const [catalogSize, setCatalogSize] = useState({ seo: 0, aeo: 0, geo: 0 })
  const [lastSync, setLastSync] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportHtml, setReportHtml] = useState('')
  const [activePillar, setActivePillar] = useState('seo')

  const loadMeta = useCallback(async () => {
    const [auditData, siteData, reqs, syncs] = await Promise.all([
      listAuditRuns(),
      listWebsites(),
      listRequirements(),
      listSyncLogs(1),
    ])
    setRuns(auditData)
    setWebsites(siteData)
    setCatalogSize({
      seo: reqs.filter((r) => r.pillar === 'seo').length,
      aeo: reqs.filter((r) => r.pillar === 'aeo').length,
      geo: reqs.filter((r) => r.pillar === 'geo').length,
    })
    setLastSync(syncs[0]?.synced_at || null)
  }, [])

  const loadRunDetails = useCallback(async (run) => {
    const full = await getAuditRun(run.id)
    setActiveRun(full)
    setError(null)
    const [checks, comps] = await Promise.all([
      listSiteRequirementChecks(run.id),
      listCompetitorSnapshots(run.id),
    ])
    let ranks = []
    if (full.website_id) {
      ranks = await listKeywordRankings(full.website_id)
    }
    if (!ranks.length) {
      ranks = await listKeywordRankingsForRun(run.id)
    }
    setReqChecks(checks)
    setCompetitors(comps)
    setRankHistory(ranks)
    return full
  }, [])

  useEffect(() => {
    loadMeta().catch((e) => setError(e.message))
  }, [loadMeta])

  useEffect(() => {
    if (activeRun || !runs.length) return
    loadRunDetails(runs[0]).catch(() => {})
  }, [runs, activeRun, loadRunDetails])

  async function openSiteResults(websiteId) {
    setError(null)
    const latest = await getLatestAuditRunForWebsite(websiteId)
    if (!latest) {
      setError('Is site ka audit abhi nahi mila — Re-audit dabao pehli baar scan ke liye')
      return null
    }
    await loadRunDetails(latest)
    setSuccessMsg(`${latest.domain} — last audit load ho gaya (WOS ${latest.wos_score ?? '—'})`)
    return latest
  }

  async function runAudit(url) {
    if (!url?.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const row = await submitWebsite(url, { mode })
      if (row.auditRunId) {
        setSuccessMsg('Audit chal rahi hai…')
        const completed = await pollAuditRun(row.auditRunId, { maxAttempts: 120, intervalMs: 5000 })
        await loadRunDetails({ id: completed.id })
        setSuccessMsg(`Done — WOS ${completed.wos_score ?? '—'}`)
      }
      await loadMeta()
      return row
    } catch (err) {
      if (err.code === 'DUPLICATE_WEBSITE' && err.existingId) {
        await openSiteResults(err.existingId)
        return { duplicate: true, websiteId: err.existingId }
      }
      setError(err.message)
      throw err
    } finally {
      setSubmitting(false)
    }
  }

  async function reAudit(websiteId) {
    setSubmitting(true)
    setError(null)
    try {
      const row = await reAuditWebsite(websiteId, { mode })
      if (row.auditRunId) {
        const completed = await pollAuditRun(row.auditRunId, { maxAttempts: 120, intervalMs: 5000 })
        await loadRunDetails({ id: completed.id })
        setSuccessMsg(`Re-audit done — WOS ${completed.wos_score ?? '—'}`)
      }
      await loadMeta()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function openReport() {
    if (!activeRun?.id) return
    setReportHtml(activeRun.report_html || (await getAuditReportHtml(activeRun.id)))
    setReportOpen(true)
  }

  /** Rank rows: summary → keywords jsonb → keyword_rankings table */
  const rankFromRun =
    activeRun?.summary?.rankResults ||
    activeRun?.keywords?.rankResults ||
    []

  const rankResults = (() => {
    if (rankFromRun.length) return rankFromRun
    if (rankHistory.length) {
      return rankHistory.map((r) => ({
        keyword: r.keyword,
        ourRank: r.rank_position,
        ourUrl: r.rank_url,
        serpFeatures: r.serp_features || {},
        checked_at: r.checked_at,
      }))
    }
    return []
  })()

  /** Competitor rows: table → summary → competitors jsonb on audit_runs */
  const competitorSnapshots = (() => {
    if (competitors.length) return competitors
    const fromSummary = activeRun?.summary?.competitorSnapshots
    if (Array.isArray(fromSummary) && fromSummary.length) {
      return fromSummary.map((s, i) => ({ ...s, id: s.id || `summary-${i}` }))
    }
    const fromJson = activeRun?.competitors?.snapshots
    if (Array.isArray(fromJson) && fromJson.length) {
      return fromJson.map((s, i) => ({ ...s, id: s.id || `json-${i}` }))
    }
    return []
  })()

  const value = {
    mode,
    setMode,
    submitting,
    error,
    setError,
    successMsg,
    setSuccessMsg,
    activeRun,
    runs,
    websites,
    reqChecks,
    competitors,
    competitorSnapshots,
    rankHistory,
    catalogSize,
    lastSync,
    reportOpen,
    setReportOpen,
    reportHtml,
    activePillar,
    setActivePillar,
    loadMeta,
    loadRunDetails,
    openSiteResults,
    runAudit,
    reAudit,
    openReport,
    exportCsv: () => exportActionPlanCsv(activeRun?.summary?.actionPlan || [], activeRun?.domain),
    actionPlan: activeRun?.summary?.actionPlan || [],
    rankResults,
    bestKeywords: activeRun?.summary?.bestKeywords || activeRun?.keywords?.bestKeywords || [],
    phaseKeywords: activeRun?.phase_keywords || {},
    phaseCompetitors: activeRun?.phase_competitors || {},
  }

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>
}

export function useAudit() {
  const ctx = useContext(AuditContext)
  if (!ctx) throw new Error('useAudit must be used inside AuditProvider')
  return ctx
}
