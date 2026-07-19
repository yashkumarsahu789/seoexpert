import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ShopKeywordsPanel from './ShopKeywordsPanel'
import {
  getAuditRun,
  getAuditReportHtml,
  listAuditFindings,
  listAuditRuns,
  pollAuditRun,
  exportActionPlanCsv,
  severityOrder,
} from '../services/auditService'
import { submitWebsite, listWebsites, deleteWebsite, reAuditWebsite } from '../services/websiteService'

export function GuardPanel({ lastPingAt, keepAliveError, keepAliveOk }) {
  return (
    <>
      <p className="hint">
        Render free tier par n8n 15 min idle ke baad sleep ho jata hai. Ye guard har 5 min ping karta
        hai aur heartbeat Supabase me save karta hai â€” container reset par bhi data safe rehta hai.
      </p>
      <ul className="guard-list">
        <li>Internal schedule: har 5 min (jab awake ho)</li>
        <li>External ping: React app + UptimeRobot/cron-job.org</li>
        <li>Database: Supabase PostgreSQL (Render storage par depend nahi)</li>
      </ul>
      {lastPingAt && (
        <p className="status ok">Last heartbeat: {new Date(lastPingAt).toLocaleString()}</p>
      )}
      {keepAliveOk && <p className="status ok">App ping sent â€” instance wake ho raha hai</p>}
      {keepAliveError && <p className="status error">{keepAliveError}</p>}
    </>
  )
}

export function SyncPanel({ syncing, loading, syncError, syncStats, lastSync, shops, indexingQueue, shopRanks, runSync }) {
  const [openKeywordsShopId, setOpenKeywordsShopId] = useState(null)

  const toggleKeywords = (shopId) => {
    setOpenKeywordsShopId((prev) => (prev === shopId ? null : shopId))
  }

  return (
    <>
      <p className="hint">
        Sitemap se shop URLs sync â†’ <strong>daily 4 AM</strong> Google index check + sitemap ping â†’{' '}
        <strong>daily 7 AM</strong> keyword rank check. Manual sync bhi kar sakte ho.
      </p>
      <div className="sync-row">
        <button type="button" onClick={runSync} disabled={syncing || loading}>
          {syncing ? 'Fetching shopsâ€¦' : 'Sync Now'}
        </button>
        {lastSync && <span className="sync-time">Last sync: {lastSync.toLocaleTimeString()}</span>}
      </div>
      {syncStats && (
        <p className="status ok">
          Source: {syncStats.source} Â· Fetched {syncStats.fetched} Â· New {syncStats.inserted} Â· Updated{' '}
          {syncStats.updated}
        </p>
      )}
      {syncError && <p className="status error">{syncError}</p>}
      {loading && <p className="status">Pehli baar shops fetch ho rahi hainâ€¦</p>}
      <h3 className="panel-subtitle">Shops ({shops.length})</h3>
      {!loading && shops.length === 0 && !syncError && (
        <p className="status">
          Abhi koi shop nahi mili. Check karo <code>shop.LifeSolveNow.com/sitemap.xml</code> live hai ya
          API URL set karo.
        </p>
      )}
      <ul className="list compact-list shop-sync-list">
        {shops.map((shop) => {
          const queue = indexingQueue?.find((q) => q.shop_id === shop.id)
          const rankCount = (shopRanks || []).filter((r) => r.shop_id === shop.id && r.rank_position != null).length
          const keywordsOpen = openKeywordsShopId === shop.id
          return (
            <li key={shop.id} className={`shop-sync-item${keywordsOpen ? ' shop-sync-item-open' : ''}`}>
              <div className="shop-sync-item-main">
                <div className="shop-sync-info">
                  <strong>{shop.name}</strong>
                  <small>
                    {shop.area ? `${shop.area}, ` : ''}
                    {shop.city} Â· {shop.shop_url}
                  </small>
                  {queue && (
                    <small>
                      Index: {queue.is_indexed ? 'Google me hai' : queue.index_status || 'pending'}
                    </small>
                  )}
                </div>
                <div className="shop-sync-actions">
                  <button
                    type="button"
                    className="shop-keywords-btn"
                    onClick={() => toggleKeywords(shop.id)}
                    aria-expanded={keywordsOpen}
                  >
                    {keywordsOpen ? 'Hide ranks' : 'Keywords & Rank'}
                    {rankCount > 0 && !keywordsOpen ? ` (${rankCount})` : ''}
                  </button>
                  <span className={`badge badge-${shop.automation_status}`}>{shop.automation_status}</span>
                </div>
              </div>
              {keywordsOpen && (
                <ShopKeywordsPanel shopId={shop.id} onClose={() => setOpenKeywordsShopId(null)} />
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function AuditPanel() {
  const [url, setUrl] = useState('')
  const [mode, setMode] = useState('full')
  const [wosAlpha, setWosAlpha] = useState(0.5)
  const [wosBeta, setWosBeta] = useState(0.25)
  const [wosGamma, setWosGamma] = useState(0.25)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [activeRun, setActiveRun] = useState(null)
  const [findings, setFindings] = useState([])
  const [runs, setRuns] = useState([])
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [openingReport, setOpeningReport] = useState(false)
  const [websites, setWebsites] = useState([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [reAuditingId, setReAuditingId] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportHtml, setReportHtml] = useState('')

  async function loadReportHtml() {
    if (!activeRun?.id) throw new Error('No audit selected')
    let html = activeRun.report_html
    if (!html || html.length < 100) {
      html = await getAuditReportHtml(activeRun.id)
    }
    if (!html?.trim() || !html.includes('<!DOCTYPE html>')) {
      throw new Error('Report HTML empty â€” â†» Audit se dubara chalao')
    }
    return html
  }

  async function openReportModal() {
    setOpeningReport(true)
    setError(null)
    try {
      const html = await loadReportHtml()
      setReportHtml(html)
      setReportOpen(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setOpeningReport(false)
    }
  }

  async function downloadReportHtml() {
    setOpeningReport(true)
    setError(null)
    try {
      const html = reportHtml || (await loadReportHtml())
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `audit-${activeRun?.domain || 'report'}.html`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      setSuccessMsg('Report download ho gayi â€” file browser me kholo')
    } catch (err) {
      setError(err.message)
    } finally {
      setOpeningReport(false)
    }
  }

  function closeReportModal() {
    setReportOpen(false)
    setReportHtml('')
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [auditData, siteData] = await Promise.all([listAuditRuns(), listWebsites()])
        if (!cancelled) {
          setRuns(auditData)
          setWebsites(siteData)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) {
          setLoadingRuns(false)
          setLoadingSites(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadRunDetails = useCallback(async (auditRunId) => {
    setLoadingDetail(true)
    setError(null)
    try {
      const [run, findingRows] = await Promise.all([
        getAuditRun(auditRunId),
        listAuditFindings(auditRunId),
      ])
      setActiveRun(run)
      setFindings(
        findingRows.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const wosOpts = { mode, wosAlpha, wosBeta, wosGamma }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setError(null)
    setActiveRun(null)
    setFindings([])

    try {
      const row = await submitWebsite(url, wosOpts)
      const [auditData, siteData] = await Promise.all([listAuditRuns(), listWebsites()])
      setRuns(auditData)
      setWebsites(siteData)
      if (row.auditRunId) {
        const completed = await pollAuditRun(row.auditRunId, { maxAttempts: 90, intervalMs: 4000 })
        setActiveRun(completed)
        const findingRows = await listAuditFindings(completed.id)
        setFindings(
          findingRows.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
        )
      }
      setUrl('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
      Promise.all([listAuditRuns(), listWebsites()])
        .then(([auditData, siteData]) => {
          setRuns(auditData)
          setWebsites(siteData)
        })
        .catch(() => {})
    }
  }

  async function handleDeleteSite(websiteId) {
    if (!window.confirm('Site aur uske saare audits delete karenge. Continue?')) return
    setDeletingId(websiteId)
    setError(null)
    setSuccessMsg(null)
    try {
      const { deletedRuns } = await deleteWebsite(websiteId)
      if (activeRun?.website_id === websiteId) {
        setActiveRun(null)
        setFindings([])
      }
      const [auditData, siteData] = await Promise.all([listAuditRuns(), listWebsites()])
      setRuns(auditData)
      setWebsites(siteData)
      setSuccessMsg(`Site delete ho gayi${deletedRuns ? ` (${deletedRuns} audits)` : ''}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReAudit(websiteId) {
    setReAuditingId(websiteId)
    setError(null)
    setSuccessMsg(null)
    setActiveRun(null)
    setFindings([])
    try {
      const row = await reAuditWebsite(websiteId, wosOpts)
      const auditData = await listAuditRuns()
      setRuns(auditData)
      if (row.auditRunId) {
        const completed = await pollAuditRun(row.auditRunId, { maxAttempts: 90, intervalMs: 4000 })
        setActiveRun(completed)
        const findingRows = await listAuditFindings(completed.id)
        setFindings(
          findingRows.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity))
        )
        setSuccessMsg(`${completed.domain} audit complete â€” WOS ${completed.wos_score ?? 'â€”'}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setReAuditingId(null)
    }
  }

  return (
    <>
      <p className="hint">
        Apni website ka link dalo â€” automation 4 steps me check karega: (1) present SEO/AEO/GEO
        status, (2) best keywords + update wale, (3) competitors ki kami, (4) AEO/GEO requirements.
        Saved sites ka audit <strong>har din 6 AM IST</strong> auto dubara chalega.
      </p>

      <ol className="audit-steps">
        <li>
          <strong>Present check</strong> â€” site par kya chal raha hai vs kya chahiye (SEO/AEO/GEO)
        </li>
        <li>
          <strong>Keywords</strong> â€” sabse zyada search + naye topics + jo update chahiye
        </li>
        <li>
          <strong>Competitors</strong> â€” same keyword par kaun rank karta hai, unse aage kaise nikle
        </li>
        <li>
          <strong>AEO & GEO</strong> â€” AI search / crawler ke liye kya missing ya update chahiye
        </li>
      </ol>

      <form className="audit-form" onSubmit={handleSubmit}>
        <input
          type="url"
          className="audit-input"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={submitting}
          aria-label="Website URL"
        />
        <select
          className="audit-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={submitting}
          aria-label="Audit mode"
        >
          <option value="full">Full audit (50 pages, sitemap 1000)</option>
          <option value="quick">Quick scan (10 pages)</option>
        </select>
        <fieldset className="audit-wos-fieldset" disabled={submitting}>
          <legend>WOS weights (SEO / AEO / GEO)</legend>
          <label className="audit-wos-row">
            <span>SEO Î± {wosAlpha.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wosAlpha}
              onChange={(e) => setWosAlpha(Number(e.target.value))}
            />
          </label>
          <label className="audit-wos-row">
            <span>AEO Î² {wosBeta.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wosBeta}
              onChange={(e) => setWosBeta(Number(e.target.value))}
            />
          </label>
          <label className="audit-wos-row">
            <span>GEO Î³ {wosGamma.toFixed(2)}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={wosGamma}
              onChange={(e) => setWosGamma(Number(e.target.value))}
            />
          </label>
        </fieldset>
        <button type="submit" disabled={submitting || !url.trim()}>
          {submitting ? 'Auditingâ€¦' : 'Run Audit'}
        </button>
      </form>

      {error && <p className="status error">{error}</p>}
      {successMsg && <p className="status ok">{successMsg}</p>}
      {submitting && (
        <p className="status">Pipeline chal rahi hai â€” technical â†’ keywords â†’ competitors â†’ reportâ€¦</p>
      )}

      {activeRun && (
        <section className="audit-result">
          <div className="audit-scores">
            <div className="audit-score-card primary">
              <span>WOS</span>
              <strong>{activeRun.wos_score ?? 'â€”'}</strong>
            </div>
            <div className="audit-score-card">
              <span>SEO</span>
              <strong>{activeRun.s_seo ?? 'â€”'}</strong>
            </div>
            <div className="audit-score-card">
              <span>AEO</span>
              <strong>{activeRun.s_aeo ?? 'â€”'}</strong>
            </div>
            <div className="audit-score-card">
              <span>GEO</span>
              <strong>{activeRun.s_geo ?? 'â€”'}</strong>
            </div>
          </div>
          <p className="status ok">
            {activeRun.domain} Â· {activeRun.status}
            {activeRun.token_count != null && (
              <> Â· est. LLM tokens â‰ˆ {activeRun.token_count}</>
            )}
          </p>
          {activeRun.status === 'completed' && (
            <div className="audit-report-actions">
              <button
                type="button"
                className="audit-report-btn"
                onClick={openReportModal}
                disabled={openingReport}
              >
                {openingReport ? 'Loadingâ€¦' : 'View Report'}
              </button>
              <button
                type="button"
                className="audit-report-btn audit-report-btn-secondary"
                onClick={downloadReportHtml}
                disabled={openingReport}
              >
                Download HTML
              </button>
              <button
                type="button"
                className="audit-report-btn audit-report-btn-secondary"
                onClick={() => {
                  const plan = activeRun.summary?.actionPlan || []
                  if (!plan.length) {
                    setError('Action plan empty â€” naya audit chalao (updated pipeline)')
                    return
                  }
                  exportActionPlanCsv(plan, activeRun.domain)
                  setSuccessMsg('Action plan CSV download ho gayi')
                }}
              >
                Export CSV
              </button>
            </div>
          )}
          {activeRun.summary?.bestKeywords?.length > 0 && (
            <>
              <h3 className="panel-subtitle">Top keywords (Step 2)</h3>
              <ul className="list compact-list">
                {activeRun.summary.bestKeywords.slice(0, 8).map((k) => (
                  <li key={k.keyword}>
                    <strong>{k.keyword}</strong>
                    <small>
                      {k.searchVolume != null ? `${k.searchVolume}/mo Â· ` : ''}
                      {k.source}
                    </small>
                  </li>
                ))}
              </ul>
            </>
          )}
          {findings.length > 0 && (
            <>
              <h3 className="panel-subtitle">Findings ({findings.length})</h3>
              <ul className="list compact-list audit-findings">
                {findings.map((f) => (
                  <li key={f.id}>
                    <div>
                      <strong>{f.title}</strong>
                      <small>
                        {f.fix_code} Â· {f.category} Â· {f.remediation}
                      </small>
                    </div>
                    <span className={`badge badge-sev-${f.severity}`}>{f.severity}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <h3 className="panel-subtitle">Saved Sites ({websites.length})</h3>
      {loadingSites && <p className="status">Loading sitesâ€¦</p>}
      {!loadingSites && websites.length === 0 && (
        <p className="status">Koi site save nahi â€” upar URL add karo.</p>
      )}
      <ul className="list compact-list audit-sites">
        {websites.map((site) => (
          <li key={site.id}>
            <div className="audit-site-info">
              <strong>{site.domain || site.url}</strong>
              <small>{site.url} Â· {site.status}</small>
            </div>
            <div className="audit-site-actions">
              <button
                type="button"
                className="audit-action-btn audit-action-rerun"
                onClick={() => handleReAudit(site.id)}
                disabled={Boolean(submitting || deletingId || reAuditingId)}
                title="Dubara audit chalao"
              >
                {reAuditingId === site.id ? 'â€¦' : 'â†» Audit'}
              </button>
              <button
                type="button"
                className="audit-action-btn audit-action-delete"
                onClick={() => handleDeleteSite(site.id)}
                disabled={Boolean(submitting || deletingId || reAuditingId)}
                title="Site delete karo"
              >
                {deletingId === site.id ? 'â€¦' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="panel-subtitle">Recent Audits ({runs.length})</h3>
      {loadingRuns && <p className="status">Loadingâ€¦</p>}
      {!loadingRuns && runs.length === 0 && (
        <p className="status">Abhi koi audit nahi â€” upar URL daalo.</p>
      )}
      <ul className="list compact-list">
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="button"
              className="audit-run-btn"
              onClick={() => loadRunDetails(run.id)}
            >
              <strong>{run.domain}</strong>
              <small>
                WOS {run.wos_score ?? 'â€”'} Â· {run.status} Â·{' '}
                {new Date(run.started_at).toLocaleString()}
              </small>
            </button>
            <span className={`badge badge-${run.status === 'completed' ? 'done' : run.status === 'running' ? 'processing' : 'pending'}`}>
              {run.status}
            </span>
          </li>
        ))}
      </ul>
      {loadingDetail && <p className="status">Loading auditâ€¦</p>}

      {reportOpen && (
        <div
          className="audit-report-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Audit report"
          onClick={closeReportModal}
        >
          <div className="audit-report-modal" onClick={(e) => e.stopPropagation()}>
            <header className="audit-report-modal-header">
              <strong>Audit â€” {activeRun?.domain}</strong>
              <div className="audit-report-modal-actions">
                <button type="button" className="audit-report-btn-secondary" onClick={downloadReportHtml}>
                  Download
                </button>
                <button type="button" className="audit-report-btn-secondary" onClick={closeReportModal}>
                  Close
                </button>
              </div>
            </header>
            <iframe
              title={`Audit report ${activeRun?.domain || ''}`}
              className="audit-report-frame"
              srcDoc={reportHtml}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </>
  )
}

export function TelegramPanel() {
  return (
    <>
      <p className="hint">
        Har <strong>1 minute</strong> n8n tumhe Telegram par current time bhejega â€” phone par notification
        aayegi jab bot chat unmuted ho.
      </p>
      <ul className="guard-list">
        <li>
          <code>.env</code> me <code>TELEGRAM_BOT_TOKEN</code> + <code>TELEGRAM_CHAT_ID</code> bharo
        </li>
        <li>Same values Render â†’ n8n service â†’ Environment me copy karo</li>
        <li>Bot ko Telegram me <code>/start</code> bhejo (pehli baar)</li>
        <li>Render redeploy karo, phir ~1 min wait karo</li>
      </ul>
      <p className="status">
        Chat ID: <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
      </p>
    </>
  )
}

export function DailySchedulerPanel({ workflow }) {
  const isReqSync = workflow?.id === 'requirements_daily_sync'

  if (isReqSync) {
    return (
      <>
        <p className="hint">
          Ye <strong>background job</strong> hai â€” roz subah <strong>5:00 AM IST</strong> par SEO/AEO/GEO
          rules Official + Patents + Trackers se Supabase me update hoti hain.
        </p>
        <ul className="guard-list">
          <li>Aapko yahan kuch click karne ki zaroorat nahi</li>
          <li>Rules catalog automatic update hota hai</li>
          <li>Audit results dekhne ke liye upar <strong>Run Audit</strong> tab kholo</li>
        </ul>
        <Link to="/" className="workflows-audit-cta-btn" style={{ display: 'inline-block', marginTop: '0.75rem' }}>
          Run Audit â†’
        </Link>
      </>
    )
  }

  return (
    <>
      <p className="hint">
        Ye <strong>background job</strong> hai â€” har din subah <strong>6:00 AM IST</strong> par saved
        sites ka audit dubara trigger hota hai.
      </p>
      <ul className="guard-list">
        <li>Pehle <strong>Run Audit</strong> se site add karo</li>
        <li>Roz naya report + keywords + competitors save honge</li>
        <li>Render par n8n workflow active honi chahiye</li>
      </ul>
      <Link to="/" className="workflows-audit-cta-btn" style={{ display: 'inline-block', marginTop: '0.75rem' }}>
        Run Audit â†’
      </Link>
    </>
  )
}

export function WorkflowPanel({ workflow, app }) {
  if (!workflow) return null

  if (workflow.kind === 'guard') {
    return (
      <GuardPanel
        lastPingAt={app.lastPingAt}
        keepAliveError={app.keepAliveError}
        keepAliveOk={app.keepAliveOk}
      />
    )
  }
  if (workflow.kind === 'sync') {
    return (
      <SyncPanel
        syncing={app.syncing}
        loading={app.loading}
        syncError={app.syncError}
        syncStats={app.syncStats}
        lastSync={app.lastSync}
        shops={app.shops}
        indexingQueue={app.indexingQueue}
        shopRanks={app.shopRanks}
        runSync={app.runSync}
      />
    )
  }
  if (workflow.kind === 'audit') return <AuditPanel />
  if (workflow.kind === 'scheduler') return <DailySchedulerPanel workflow={workflow} />
  if (workflow.kind === 'telegram') return <TelegramPanel />
  return null
}
