import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAudit } from '../../context/AuditContext'
import AuditScoresBar from '../../components/audit/AuditScoresBar'

export default function AuditRunPage() {
  const [url, setUrl] = useState('')
  const navigate = useNavigate()
  const { mode, setMode, submitting, websites, runs, runAudit, openSiteResults, reAudit } = useAudit()

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const result = await runAudit(url)
      setUrl('')
      navigate('/audit/checks')
      if (result?.duplicate) return
    } catch {
      /* error in context */
    }
  }

  async function viewSite(siteId) {
    await openSiteResults(siteId)
    navigate('/audit/checks')
  }

  async function freshAudit(siteId) {
    await reAudit(siteId)
    navigate('/audit/checks')
  }

  function latestWos(siteId) {
    const run = runs.find((r) => r.website_id === siteId)
    return run?.wos_score
  }

  return (
    <>
      {websites.length > 0 && (
        <section className="saved-sites-quick">
          <h2 className="feature-section-title">Aapki saved sites</h2>
          <p className="hint">
            Pehle se add sites ke liye URL dubara mat dalo — <strong>View Results</strong> dabao.
          </p>
          <ul className="saved-sites-list">
            {websites.map((site) => (
              <li key={site.id} className="saved-site-row">
                <div>
                  <strong>{site.domain || site.url}</strong>
                  <small>
                    {site.status}
                    {latestWos(site.id) != null && ` · WOS ${latestWos(site.id)}`}
                  </small>
                </div>
                <div className="saved-site-actions">
                  <button type="button" disabled={submitting} onClick={() => viewSite(site.id)}>
                    View Results
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={submitting}
                    onClick={() => freshAudit(site.id)}
                  >
                    Re-audit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="feature-section-title">Nayi site add karo</h2>
      <p className="hint">Sirf woh site j abhi list me nahi hai.</p>
      <form className="audit-form" onSubmit={handleSubmit}>
        <input
          type="url"
          className="audit-input"
          placeholder="https://new-site.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={submitting}
        />
        <select className="audit-select" value={mode} onChange={(e) => setMode(e.target.value)} disabled={submitting}>
          <option value="full">Full audit</option>
          <option value="quick">Quick scan</option>
        </select>
        <button type="submit" disabled={submitting || !url.trim()}>
          {submitting ? 'Auditing…' : 'Start Audit'}
        </button>
      </form>
      <AuditScoresBar />
    </>
  )
}
