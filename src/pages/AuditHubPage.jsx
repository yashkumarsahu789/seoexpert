import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  exportActionPlanCsv,
  getAuditReportHtml,
  getAuditRun,
  listAuditRuns,
  pollAuditRun,
  scoreLabel,
} from '../services/auditService'
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  listCompetitorSnapshots,
  listKeywordRankings,
  listRequirements,
  listSiteRequirementChecks,
  listSyncLogs,
  sourceBadgeClass,
} from '../services/requirementsService'
import { deleteWebsite, listWebsites, reAuditWebsite, submitWebsite } from '../services/websiteService'

const STEPS = [
  { id: 1, key: 'requirements', label: 'SEO / AEO / GEO', desc: 'Daily requirements vs your site' },
  { id: 2, key: 'keywords', label: 'Keywords & Rank', desc: 'Best keywords + daily position' },
  { id: 3, key: 'competitors', label: 'Competitors', desc: 'Who ranks + how to beat them' },
  { id: 4, key: 'action', label: 'Action Plan', desc: 'All fixes in priority order' },
]

const PILLARS = ['seo', 'aeo', 'geo']

function PhaseCard({ label, score, summary }) {
  if (!summary?.total) return null
  return (
    <div className="phase-card">
      <span className="phase-label">{label}</span>
      <strong className="phase-score">{score ?? '—'}</strong>
      <small>
        {summary.present}/{summary.total} present · {summary.missing} missing · {summary.needs_update}{' '}
        update
      </small>
    </div>
  )
}

function RequirementRow({ row }) {
  return (
    <li className={`req-row req-${row.status}`}>
      <div className="req-row-head">
        <span className={`badge ${sourceBadgeClass(row.source_type)}`}>
          {SOURCE_LABELS[row.source_type] || row.source_type}
        </span>
        <span className={`badge badge-${row.severity}`}>{row.severity}</span>
        <strong>{row.title}</strong>
      </div>
      <p className="req-status">{STATUS_LABELS[row.status] || row.status}</p>
      {row.detail && <small>{row.detail}</small>}
      {row.remediation && row.status !== 'present' && (
        <p className="req-fix">{row.remediation}</p>
      )}
      {row.source_name && (
        <small className="req-source">
          Source: {row.source_name}
          {row.metadata?.source_url && (
            <>
              {' '}
              ·{' '}
              <a href={row.metadata.source_url} target="_blank" rel="noreferrer">
                docs
              </a>
            </>
          )}
        </small>
      )}
    </li>
  )
}

export default function AuditHubPage() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState('full')
  const [activeStep, setActiveStep] = useState(1)
  const [activePillar, setActivePillar] = useState('seo')
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

  useEffect(() => {
    loadMeta().catch((e) => setError(e.message))
  }, [loadMeta])

  const loadRunDetails = useCallback(async (run) => {
    const full = await getAuditRun(run.id)
    setActiveRun(full)
    const [checks, comps] = await Promise.all([
      listSiteRequirementChecks(run.id),
      listCompetitorSnapshots(run.id),
    ])
    setReqChecks(checks)
    setCompetitors(comps)
    if (full.website_id) {
      const ranks = await listKeywordRankings(full.website_id)
      setRankHistory(ranks)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const row = await submitWebsite(url, { mode })
      if (row.auditRunId) {
        setSuccessMsg('Audit pipeline chal rahi hai — 4 steps transparent run ho rahe hain…')
        const completed = await pollAuditRun(row.auditRunId, { maxAttempts: 120, intervalMs: 5000 })
        await loadRunDetails(completed)
        setSuccessMsg(`${completed.domain} audit complete — WOS ${completed.wos_score ?? '—'}`)
      }
      setUrl('')
      await loadMeta()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReAudit(websiteId) {
    setSubmitting(true)
    setError(null)
    try {
      const row = await reAuditWebsite(websiteId, { mode })
      if (row.auditRunId) {
        const completed = await pollAuditRun(row.auditRunId, { maxAttempts: 120, intervalMs: 5000 })
        await loadRunDetails(completed)
        setSuccessMsg(`Re-audit complete — WOS ${completed.wos_score ?? '—'}`)
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
    const html = activeRun.report_html || (await getAuditReportHtml(activeRun.id))
    setReportHtml(html)
    setReportOpen(true)
  }

  const pillarChecks = useMemo(
    () => reqChecks.filter((c) => c.pillar === activePillar),
    [reqChecks, activePillar]
  )

  const actionPlan = activeRun?.summary?.actionPlan || []
  const rankResults = activeRun?.summary?.rankResults || activeRun?.phase_keywords?.rankResults || []

  return (
    <div className="audit-hub">
      <header className="audit-hub-header">
        <div>
          <p className="audit-hub-eyebrow">Primary Feature · LifeSolveNow</p>
          <h1>Website Audit</h1>
          <p className="audit-hub-sub">
            SEO, AEO & GEO — daily updated requirements (Official · Patents · Trackers) checked against
            your site, keywords ranked daily, competitors analyzed.
          </p>
        </div>
        <Link to="/workflows" className="audit-hub-link">
          Background jobs →
        </Link>
      </header>

      <section className="audit-sources-banner">
        <div>
          <strong>Requirement sources (daily sync)</strong>
          <ul>
            <li>
              <span className="badge badge-official">Official</span> Google, Bing, OpenAI, Anthropic
              docs
            </li>
            <li>
              <span className="badge badge-patent">Patents</span> Ranking & entity signals
            </li>
            <li>
              <span className="badge badge-tracker">Trackers</span> Schema.org, industry RSS feeds
            </li>
          </ul>
          {lastSync && (
            <small>Last sync: {new Date(lastSync).toLocaleString()} · Catalog: SEO {catalogSize.seo} · AEO{' '}
              {catalogSize.aeo} · GEO {catalogSize.geo}</small>
          )}
        </div>
      </section>

      <form className="audit-form audit-hub-form" onSubmit={handleSubmit}>
        <input
          type="url"
          className="audit-input"
          placeholder="https://your-primary-site.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={submitting}
        />
        <select className="audit-select" value={mode} onChange={(e) => setMode(e.target.value)} disabled={submitting}>
          <option value="full">Full audit</option>
          <option value="quick">Quick scan</option>
        </select>
        <button type="submit" disabled={submitting || !url.trim()}>
          {submitting ? 'Running 4-step audit…' : 'Run Audit'}
        </button>
      </form>

      {error && <p className="status error">{error}</p>}
      {successMsg && <p className="status ok">{successMsg}</p>}

      <nav className="audit-step-nav">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={activeStep === s.id ? 'active' : ''}
            onClick={() => setActiveStep(s.id)}
          >
            <span className="step-num">{s.id}</span>
            {s.label}
          </button>
        ))}
      </nav>

      {activeRun && (
        <section className="audit-result audit-hub-result">
          <div className="audit-scores">
            <div className="audit-score-card primary">
              <span>WOS</span>
              <strong>{activeRun.wos_score ?? '—'}</strong>
              <small>{scoreLabel(activeRun.wos_score)}</small>
            </div>
            <PhaseCard label="SEO" score={activeRun.s_seo} summary={activeRun.phase_seo} />
            <PhaseCard label="AEO" score={activeRun.s_aeo} summary={activeRun.phase_aeo} />
            <PhaseCard label="GEO" score={activeRun.s_geo} summary={activeRun.phase_geo} />
          </div>

          <div className="audit-report-actions">
            <button type="button" className="audit-report-btn" onClick={openReport}>
              View Report
            </button>
            <button
              type="button"
              className="audit-report-btn audit-report-btn-secondary"
              onClick={() => exportActionPlanCsv(actionPlan, activeRun.domain)}
            >
              Export CSV
            </button>
          </div>

          {activeStep === 1 && (
            <div className="audit-step-panel">
              <p className="hint">
                Step 1 — Har pillar ke rules daily sync hote hain. Neeche dikhta hai kya site par hai,
                kya missing, kya update/remove chahiye.
              </p>
              <div className="pillar-tabs">
                {PILLARS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={activePillar === p ? 'active' : ''}
                    onClick={() => setActivePillar(p)}
                  >
                    {p.toUpperCase()} ({reqChecks.filter((c) => c.pillar === p).length})
                  </button>
                ))}
              </div>
              <ul className="req-list">
                {pillarChecks.map((row) => (
                  <RequirementRow key={row.id || row.rule_code} row={row} />
                ))}
                {!pillarChecks.length && (
                  <li className="status">Is pillar ke liye checks nahi mile — naya audit chalao (v3 pipeline)</li>
                )}
              </ul>
            </div>
          )}

          {activeStep === 2 && (
            <div className="audit-step-panel">
              <p className="hint">Step 2 — Best keywords + aapki site ka daily rank position.</p>
              <ul className="list compact-list">
                {(rankResults.length ? rankResults : rankHistory).slice(0, 15).map((r, i) => (
                  <li key={r.keyword || i}>
                    <strong>{r.keyword}</strong>
                    <small>
                      Rank: {r.ourRank ?? r.rank_position ?? 'not in top 20'}
                      {r.beatPlan && ` · ${r.beatPlan}`}
                    </small>
                  </li>
                ))}
              </ul>
              {(activeRun.summary?.bestKeywords || []).length > 0 && (
                <>
                  <h3 className="panel-subtitle">Suggested new keywords</h3>
                  <ul className="list compact-list">
                    {activeRun.summary.bestKeywords.map((k) => (
                      <li key={k.keyword}>
                        {k.keyword}
                        {k.searchVolume != null && <small> · {k.searchVolume}/mo</small>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className="audit-step-panel">
              <p className="hint">Step 3 — Same keyword par competitors ka setup vs aapka gap + beat plan.</p>
              <ul className="req-list">
                {competitors.map((c) => (
                  <li key={c.id} className="req-row">
                    <strong>
                      #{c.competitor_rank} {c.competitor_url}
                    </strong>
                    <small>
                      Keyword: {c.keyword} · Your rank: {c.our_rank ?? '—'}
                    </small>
                    <p className="req-fix">{c.beat_plan}</p>
                    {(c.our_gaps || []).length > 0 && (
                      <small>Gaps: {(c.our_gaps || []).map((g) => g.gap || g).join(', ')}</small>
                    )}
                  </li>
                ))}
                {!competitors.length && <li className="status">Pehle audit chalao — free SERP scrape se competitor data aayega</li>}
              </ul>
            </div>
          )}

          {activeStep === 4 && (
            <div className="audit-step-panel">
              <p className="hint">Step 4 — Priority action plan (all steps combined).</p>
              <ul className="req-list">
                {actionPlan.slice(0, 40).map((a, i) => (
                  <li key={i} className={`req-row req-${a.priority}`}>
                    <span className="badge">Step {a.step}</span>
                    <span className={`badge badge-${a.priority}`}>{a.priority}</span>
                    <strong>{a.title}</strong>
                    <p className="req-fix">{a.remediation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="audit-hub-sites">
        <h2 className="panel-subtitle">Saved sites (daily auto-audit 6 AM IST)</h2>
        <ul className="list compact-list">
          {websites.map((site) => (
            <li key={site.id}>
              <div>
                <strong>{site.domain || site.url}</strong>
                <small>{site.status}</small>
              </div>
              <button type="button" disabled={submitting} onClick={() => handleReAudit(site.id)}>
                ↻ Re-audit
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="audit-hub-history">
        <h2 className="panel-subtitle">Recent audits</h2>
        <ul className="list compact-list">
          {runs.slice(0, 10).map((run) => (
            <li key={run.id}>
              <button type="button" className="linkish" onClick={() => loadRunDetails(run)}>
                {run.domain} · WOS {run.wos_score ?? '—'} · {run.status}
              </button>
              <small>{new Date(run.started_at).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      </section>

      {reportOpen && (
        <div className="audit-report-modal" role="dialog" aria-modal="true">
          <div className="audit-report-modal-inner">
            <button type="button" className="audit-report-close" onClick={() => setReportOpen(false)}>
              Close
            </button>
            <iframe title="Audit report" srcDoc={reportHtml} className="audit-report-frame" />
          </div>
        </div>
      )}
    </div>
  )
}
