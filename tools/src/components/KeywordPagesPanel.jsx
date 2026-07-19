import { useEffect, useState } from 'react'
import {
  KEYWORD_PAGES_AI_RULES,
  KEYWORD_PAGES_LIMITS,
  CF_LIMITS,
  CF_MODELS,
  LLM_PROVIDERS,
} from '../data/aiAutomation'
import { AI_AGENTS } from '../data/aiCenter'
import { pagePreviewUrl } from '../lib/pageConfig'
import {
  buildPageLocally,
  generateAndSaveLocally,
  isFirebaseConfigured,
  listSavedPages,
  openPagePreview,
  pageLiveUrl,
} from '../services/keywordPagesService'

export default function KeywordPagesPanel() {
  const [keyword, setKeyword] = useState('')
  const [serpUrl, setSerpUrl] = useState('')
  const [useAi, setUseAi] = useState(true)
  const [intelligence, setIntelligence] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    try {
      const kw = keyword.trim()
      setPreview(kw ? buildPageLocally(kw, serpUrl) : null)
    } catch {
      setPreview(null)
    }
  }, [keyword, serpUrl])

  useEffect(() => {
    listSavedPages().then(setSaved).catch((e) => setErr(e.message))
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setErr(null)
    setMsg(null)
    try {
      const result = await generateAndSaveLocally(keyword, serpUrl, { useAi })
      setIntelligence(result.intelligence)
      setSaved(await listSavedPages())
      setMsg(
        result.usedAi
          ? `AI page saved: /p/${result.page.slug} — ${result.intelligence?.brief?.purpose?.slice(0, 80) || ''}…`
          : `Template page saved: /p/${result.page.slug}`
      )
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  const previewSrc = preview ? pagePreviewUrl(preview.keyword, preview.serpTopUrl || serpUrl) : null

  return (
    <div className="kp-panel">
      <header className="ai-panel-header">
        <h2>Keyword Pages</h2>
        <p>
          {isFirebaseConfigured ? 'Firebase backend' : 'Local fallback'} — pehle AI samjhe (intent + market + design), phir
          page bane. Template-only preview upar; save par 3 AI steps.
        </p>
        <div className="ai-panel-meta">
          <span>1 page / 24h (production)</span>
          <span>Above-fold layout — scroll nahi</span>
        </div>
      </header>

      <section className="aic-card">
        <h3>Page banao</h3>
        <div className="aic-form-row">
          <label>
            Keyword
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={loading}
              placeholder="e.g. bmi calculator, youtube, amazon india"
            />
          </label>
          <label>
            Site URL (brand theme ke liye)
            <input
              value={serpUrl}
              onChange={(e) => setSerpUrl(e.target.value)}
              disabled={loading}
              placeholder="e.g. https://www.youtube.com"
            />
          </label>
        </div>
        <label className="aic-toggle">
          <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
          AI intelligence on (brief → design → SEO) — recommended
        </label>
        {preview && (
          <p className="aic-muted">
            Template preview: <strong>{preview.pageType}</strong> · theme <code>{preview.theme?.id}</code> → /p/
            {preview.slug}
            {useAi && ' · Save par AI market brief + brand colors apply honge'}
          </p>
        )}
        {!preview && <p className="aic-muted">Keyword dalo — neeche live React preview dikhega.</p>}
        <div className="ai-actions">
          <button type="button" className="ai-btn-primary" onClick={handleGenerate} disabled={loading || !keyword.trim()}>
            {loading ? (useAi ? 'AI analyzing…' : 'Saving…') : useAi ? 'AI analyze + save' : 'Save template only'}
          </button>
          {preview && (
            <button type="button" className="ai-btn-secondary" onClick={() => openPagePreview(preview)}>
              Full tab preview
            </button>
          )}
        </div>
        {previewSrc && <iframe title="Live preview" className="kp-preview-frame" src={previewSrc} />}
        {intelligence?.brief && (
          <div className="kp-intel-brief">
            <h4>Last AI brief</h4>
            <p>
              <strong>Purpose:</strong> {intelligence.brief.purpose}
            </p>
            <p>
              <strong>Market:</strong> {intelligence.brief.market_summary}
            </p>
            <p>
              <strong>User expects:</strong> {intelligence.brief.user_expectation}
            </p>
            {intelligence.design && (
              <p>
                <strong>Theme:</strong> {intelligence.design.theme_style} · {intelligence.design.tone} ·{' '}
                {intelligence.design.icon}
              </p>
            )}
          </div>
        )}
        {msg && <p className="ai-alert">{msg}</p>}
        {err && <p className="ai-alert ai-alert-error">{err}</p>}
      </section>

      <section className="aic-card">
        <h3>Kab AI, kab nahi</h3>
        <table className="kp-rules">
          <thead>
            <tr>
              <th>Step</th>
              <th>AI?</th>
              <th>How</th>
            </tr>
          </thead>
          <tbody>
            {KEYWORD_PAGES_AI_RULES.map((r) => (
              <tr key={r.step}>
                <td>{r.step}</td>
                <td>{r.usesAi === false ? '❌' : r.usesAi === 'optional' ? '⚡' : '✅'}</td>
                <td>{r.how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {saved.length > 0 && (
        <section className="aic-card">
          <h3>Saved pages ({saved.length})</h3>
          <ul className="ai-limits-list">
            {saved.map((p) => (
              <li key={p.slug}>
                <strong>{p.keyword}</strong> ({p.page_type}
                {p.theme_id ? ` · ${p.theme_id}` : ''}) —{' '}
                <a className="link-btn" href={pageLiveUrl(p.slug)} target="_blank" rel="noreferrer">
                  open
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="aic-card ai-card-muted">
        <h3>Limits reference</h3>
        <ul className="ai-limits-list">
          <li>
            Production: {KEYWORD_PAGES_LIMITS.maxPagesPerDay} page / {KEYWORD_PAGES_LIMITS.windowHours}h
          </li>
          <li>CF AI (production): ~{CF_LIMITS.estDemoReqsPerDay} calls/day</li>
          {CF_MODELS.map((m) => (
            <li key={m.id}>
              {m.label}: ~{m.estDailyCalls}/day
            </li>
          ))}
          {LLM_PROVIDERS.filter((p) => p.pipelineRole === 'standby').map((p) => (
            <li key={p.id}>{p.label}: standby</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
