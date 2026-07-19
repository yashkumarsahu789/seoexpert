import { useAudit } from '../../context/AuditContext'

const SOURCE_LABELS = {
  bing_serp: 'Bing',
  duckduckgo_serp: 'DuckDuckGo',
  google_serp: 'Google',
  serpapi_paid_fallback: 'SerpAPI',
  all_engines_failed: 'blocked',
  free_serp_scrape: 'Google',
}

function rankLabel(rank, serpFeatures) {
  if (rank != null && rank !== undefined) return `#${rank}`
  if (serpFeatures?.source === 'all_engines_failed' || serpFeatures?.blocked) {
    return 'Rank unavailable'
  }
  // Purana audit: sirf Google try hua tha, googleBlocked=true
  if (serpFeatures?.googleBlocked && !serpFeatures?.source?.includes('bing') && !serpFeatures?.source?.includes('duck')) {
    return 'Top 20 ke bahar'
  }
  return 'Top 20 ke bahar'
}

function statusLabel(serpFeatures) {
  const src = SOURCE_LABELS[serpFeatures?.source] || serpFeatures?.source || '—'
  if (serpFeatures?.source === 'all_engines_failed') return 'SERP blocked — retry later'
  // Legacy rows from Google-only pipeline
  if (serpFeatures?.googleBlocked && (serpFeatures?.source === 'free_serp_scrape' || serpFeatures?.source === 'google_serp' || !serpFeatures?.source)) {
    return 'Purana audit — Re-audit karo'
  }
  if (serpFeatures?.googleBlocked && src !== 'Google') return `${src} (Google skip)`
  return src
}

export default function AuditKeywordsPage() {
  const { rankResults, activeRun, phaseKeywords, reAudit, submitting } = useAudit()
  const siteId = activeRun?.website_id

  const byKeyword = new Map()
  for (const r of rankResults) {
    const kw = r.keyword
    if (!kw) continue
    const existing = byKeyword.get(kw)
    const rank = r.ourRank ?? r.rank_position
    if (!existing || (r.checked_at && existing.checked_at && r.checked_at > existing.checked_at)) {
      byKeyword.set(kw, { ...r, displayRank: rank })
    }
  }
  const list = [...byKeyword.values()]
  const legacyGoogleOnly =
    list.length > 0 &&
    list.every(
      (r) =>
        r.serpFeatures?.googleBlocked &&
        (r.serpFeatures?.source === 'free_serp_scrape' ||
          r.serpFeatures?.source === 'google_serp' ||
          !r.serpFeatures?.source ||
          r.serpFeatures?.source === 'unknown')
    )
  const allBlocked = list.length > 0 && list.every((r) => r.serpFeatures?.source === 'all_engines_failed')

  return (
    <>
      <h2 className="feature-section-title">Keywords & Rank</h2>
      <p className="hint">
        {activeRun?.domain ? `${activeRun.domain} · ` : ''}
        Rank: Bing → DuckDuckGo → Google (free). Purana audit me sirf Google tha — <strong>Re-audit</strong>{' '}
        dabao fresh rank ke liye.
      </p>
      {legacyGoogleOnly && (
        <p className="status warn">
          Purana audit sirf Google se rank check kiya tha (block ho gaya). Neeche <strong>Refresh ranks (Re-audit)</strong>{' '}
          dabao — ab Bing → DuckDuckGo se rank aayega.
        </p>
      )}
      {allBlocked && (
        <p className="status warn">
          Sab engines block — thoda wait karke Re-audit karo. Optional: Render env me <code>SERP_API_KEY</code>{' '}
          set karo.
        </p>
      )}
      {siteId && (
        <p>
          <button type="button" className="audit-action-btn" disabled={submitting} onClick={() => reAudit(siteId)}>
            {submitting ? 'Checking ranks…' : 'Refresh ranks (Re-audit)'}
          </button>
        </p>
      )}
      <table className="comp-gap-table">
        <thead>
          <tr>
            <th>Keyword</th>
            <th>Rank</th>
            <th>Engine</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.keyword}>
              <td>{r.keyword}</td>
              <td>{rankLabel(r.displayRank, r.serpFeatures)}</td>
              <td>
                <small>{statusLabel(r.serpFeatures)}</small>
              </td>
              <td>
                <small>{r.ourUrl || r.rank_url || '—'}</small>
              </td>
            </tr>
          ))}
          {!list.length && (
            <tr>
              <td colSpan={4} className="status">
                Saved Sites → View Results ya Re-audit chalao.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {list.length > 0 && (
        <p className="hint">
          Ranked: {phaseKeywords?.ranked ?? list.filter((r) => r.displayRank != null).length} · Top 20 ke bahar:{' '}
          {phaseKeywords?.notRanked ?? list.filter((r) => r.displayRank == null).length}
        </p>
      )}
    </>
  )
}
