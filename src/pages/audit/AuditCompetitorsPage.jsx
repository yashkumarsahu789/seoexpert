import { Link } from 'react-router-dom'
import { useAudit } from '../../context/AuditContext'

function rankLabel(rank) {
  if (rank == null) return '—'
  if (rank <= 10) return `#${rank} (Page 1)`
  return `#${rank} (Page ${Math.ceil(rank / 10)})`
}

function yn(val) {
  return val ? 'Yes' : 'No'
}

function diffCell(ours, theirs, higherIsBetter = true) {
  if (ours == null || theirs == null) return '—'
  if (ours === theirs) return 'Same'
  const ahead = higherIsBetter ? ours >= theirs : ours <= theirs
  return ahead ? 'Ahead' : 'Behind'
}

function CompetitorEmptyState({ activeRun, phaseCompetitors }) {
  const serpConfigured = phaseCompetitors?.serpApiConfigured
  const serpErrors = phaseCompetitors?.serpErrors || []
  const compSource = phaseCompetitors?.compSource || activeRun?.competitors?.compSource

  return (
    <div className="comp-gap-empty">
      <p className="status warn">
        Audit complete (WOS {activeRun.wos_score ?? '—'}) — competitor data nahi aaya.
        {compSource === 'all_engines_failed' || serpErrors.length > 0
          ? ' Render server se free SERP scrape (Bing/Google) block ho jata hai.'
          : ' Keywords par koi external competitor SERP me nahi mila.'}
      </p>

      {!serpConfigured && (
        <div className="comp-gap-fix">
          <strong>Fix (recommended):</strong>
          <ol>
            <li>
              <a href="https://serper.dev" target="_blank" rel="noreferrer">
                Serper.dev
              </a>{' '}
              par free account banao (2,500 searches/month)
            </li>
            <li>
              Render dashboard → n8n service → Environment me add karo:{' '}
              <code>SERPER_API_KEY=your-key</code>
            </li>
            <li>Site par dubara Re-audit chalao</li>
          </ol>
          <p className="hint">
            Alternative: <code>SERP_API_KEY</code> (SerpAPI) bhi chalega — pehle Serper try karo (sasta/free).
          </p>
        </div>
      )}

      {serpConfigured && serpErrors.length > 0 && (
        <p className="hint">
          SERP API configured hai par {serpErrors.length} keyword fail hue. Key quota check karo ya re-audit
          try karo.
        </p>
      )}

      {serpErrors.length > 0 && (
        <details className="comp-gap-details">
          <summary>SERP errors ({serpErrors.length})</summary>
          <ul>
            {serpErrors.map((e) => (
              <li key={`${e.keyword}-${e.source}`}>
                <strong>{e.keyword || '—'}</strong>: {e.source}
                {e.message ? ` — ${e.message}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="hint">
        Apne keywords + rank ke liye{' '}
        <Link to="/audit/keywords">Keywords &amp; Rank</Link> tab kholo.
      </p>
    </div>
  )
}

function CompetitorRawCard({ snapshot }) {
  const cmp = snapshot.comparison || snapshot.their_setup?._comparison || {}
  const our = snapshot.our_setup || snapshot.their_setup?._our_setup || {}
  const theirs = snapshot.their_setup || {}
  const gaps = snapshot.our_gaps || []

  return (
    <article className="comp-gap-card">
      <header className="comp-gap-header">
        <h3>Keyword: {snapshot.keyword}</h3>
        <div className="comp-gap-urls">
          <small>Our: {cmp.ourUrl || our.url || '—'}</small>
          <a href={snapshot.competitor_url} target="_blank" rel="noreferrer" className="comp-gap-link">
            Competitor #{snapshot.competitor_rank}: {snapshot.competitor_url}
          </a>
        </div>
      </header>

      <div className="comp-gap-table-wrap">
        <table className="comp-gap-table">
          <thead>
            <tr>
              <th>Metric (raw)</th>
              <th>Our Page</th>
              <th>Competitor</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Google Rank</td>
              <td>{rankLabel(cmp.ourRank ?? snapshot.our_rank)}</td>
              <td>{rankLabel(cmp.competitorRank ?? snapshot.competitor_rank)}</td>
              <td>{diffCell(snapshot.our_rank != null ? 100 - snapshot.our_rank : 0, 100 - snapshot.competitor_rank)}</td>
            </tr>
            <tr>
              <td>Domain Age</td>
              <td>{our.domainAge?.ageLabel || cmp.ourDomainAge || '—'}</td>
              <td>{theirs.domainAge?.ageLabel || cmp.compDomainAge || '—'}</td>
              <td>{our.domainAge?.created || '—'} vs {theirs.domainAge?.created || '—'}</td>
            </tr>
            <tr>
              <td>Page Title</td>
              <td colSpan={3}>{our.pageTitle || '—'} vs {theirs.pageTitle || '—'}</td>
            </tr>
            <tr>
              <td>Word Count</td>
              <td>{cmp.ourWordCount ?? our.wordCount ?? '—'}</td>
              <td>{cmp.compWordCount ?? theirs.wordCount ?? '—'}</td>
              <td>{diffCell(cmp.ourWordCount ?? our.wordCount, cmp.compWordCount ?? theirs.wordCount)}</td>
            </tr>
            <tr>
              <td>H2 / H3 Count</td>
              <td>{cmp.ourH2 ?? our.h2Count ?? '—'} / {cmp.ourH3 ?? our.h3Count ?? '—'}</td>
              <td>{cmp.compH2 ?? theirs.h2Count ?? '—'} / {cmp.compH3 ?? theirs.h3Count ?? '—'}</td>
              <td>{diffCell(cmp.ourH2 ?? our.h2Count, cmp.compH2 ?? theirs.h2Count)}</td>
            </tr>
            <tr>
              <td>Keyword Density %</td>
              <td>{cmp.ourKwDensity ?? our.keywordMetrics?.density ?? '—'}</td>
              <td>{cmp.compKwDensity ?? theirs.keywordMetrics?.density ?? '—'}</td>
              <td>{diffCell(cmp.ourKwDensity ?? our.keywordMetrics?.density, cmp.compKwDensity ?? theirs.keywordMetrics?.density)}</td>
            </tr>
            <tr>
              <td>Keyword in Title / H1</td>
              <td>{yn(cmp.ourKwInTitle ?? our.keywordMetrics?.inTitle)} / {yn(cmp.ourKwInH1 ?? our.keywordMetrics?.inH1)}</td>
              <td>{yn(cmp.compKwInTitle ?? theirs.keywordMetrics?.inTitle)} / {yn(cmp.compKwInH1 ?? theirs.keywordMetrics?.inH1)}</td>
              <td>—</td>
            </tr>
            <tr>
              <td>FAQ / Table / Schema / Video</td>
              <td>{yn(cmp.ourHasFaq ?? our.hasFaq)} / {yn(cmp.ourHasTable ?? our.hasTable)} / {yn(cmp.ourHasSchema ?? our.hasSchema)} / {yn(cmp.ourHasVideo ?? our.hasVideo)}</td>
              <td>{yn(cmp.compHasFaq ?? theirs.hasFaq)} / {yn(cmp.compHasTable ?? theirs.hasTable)} / {yn(cmp.compHasSchema ?? theirs.hasSchema)} / {yn(cmp.compHasVideo ?? theirs.hasVideo)}</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Image Alt Tags</td>
              <td>{cmp.ourAltCount ?? our.altCount ?? '—'}</td>
              <td>{cmp.compAltCount ?? theirs.altCount ?? '—'}</td>
              <td>{diffCell(cmp.ourAltCount ?? our.altCount, cmp.compAltCount ?? theirs.altCount)}</td>
            </tr>
            <tr>
              <td>Fetch Time (ms)</td>
              <td>{our.fetchMs ?? '—'}</td>
              <td>{theirs.fetchMs ?? '—'}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {(our.headings?.h1?.length > 0 || theirs.headings?.h1?.length > 0) && (
        <details className="comp-gap-details">
          <summary>Headings (raw scrape)</summary>
          <div className="comp-gap-headings">
            <div>
              <strong>Our H1/H2</strong>
              <ul>{[...(our.headings?.h1 || []), ...(our.headings?.h2 || [])].map((h) => <li key={`o-${h}`}>{h}</li>)}</ul>
            </div>
            <div>
              <strong>Competitor H1/H2</strong>
              <ul>{[...(theirs.headings?.h1 || []), ...(theirs.headings?.h2 || [])].map((h) => <li key={`c-${h}`}>{h}</li>)}</ul>
            </div>
          </div>
        </details>
      )}

      {gaps.length > 0 && (
        <div className="comp-gap-gaps">
          <strong>Metric gaps (computed, no AI):</strong>
          <ul>
            {gaps.map((g) => (
              <li key={`${g.metric}-${g.ours}-${g.theirs}`}>
                {g.metric}: ours={String(g.ours ?? '—')} · theirs={String(g.theirs ?? '—')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

export default function AuditCompetitorsPage() {
  const { competitorSnapshots, activeRun, phaseCompetitors } = useAudit()

  const emptyHint =
    activeRun?.status === 'completed'
      ? `Audit complete (WOS ${activeRun.wos_score ?? '—'}) — competitor scrape ne ${
          phaseCompetitors?.competitorsScraped ?? 0
        } snapshot save kiye.`
      : 'Pehle audit chalao — raw competitor data yahan dikhega.'

  return (
    <>
      <h2 className="feature-section-title">Competitor Raw Data</h2>
      <p className="hint">
        Sirf scrape + metrics — rank, word count, headings, domain age, schema signals. Koi AI nahi.
      </p>

      {activeRun?.status === 'completed' && !competitorSnapshots.length && (
        <CompetitorEmptyState activeRun={activeRun} phaseCompetitors={phaseCompetitors} />
      )}

      {phaseCompetitors?.compSource && competitorSnapshots.length > 0 && (
        <p className="hint">
          SERP source: <code>{phaseCompetitors.compSource}</code>
          {phaseCompetitors.serpApiConfigured ? ' (API)' : ' (free scrape)'}
        </p>
      )}

      <div className="comp-gap-list">
        {competitorSnapshots.map((c, i) => (
          <CompetitorRawCard key={c.id || `${c.keyword}-${i}`} snapshot={c} />
        ))}
        {!competitorSnapshots.length && activeRun?.status !== 'completed' && (
          <p className="status">{emptyHint}</p>
        )}
      </div>
    </>
  )
}
