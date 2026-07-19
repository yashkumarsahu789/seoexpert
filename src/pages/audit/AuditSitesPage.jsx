import { useNavigate } from 'react-router-dom'
import { useAudit } from '../../context/AuditContext'

export default function AuditSitesPage() {
  const navigate = useNavigate()
  const { websites, runs, submitting, openSiteResults, reAudit } = useAudit()

  function latestWos(siteId) {
    return runs.find((r) => r.website_id === siteId)?.wos_score
  }

  async function view(siteId) {
    await openSiteResults(siteId)
    navigate('/audit/keywords')
  }

  async function refresh(siteId) {
    await reAudit(siteId)
    navigate('/audit/keywords')
  }

  return (
    <>
      <h2 className="feature-section-title">Saved Sites</h2>
      <p className="hint">
        <strong>View Results</strong> = purana report bina wait ke · <strong>Re-audit</strong> = naya
        scan (2–5 min) · Roz 6 AM sirf keywords + rank auto update
      </p>
      <ul className="saved-sites-list">
        {websites.map((site) => (
          <li key={site.id} className="saved-site-row">
            <div>
              <strong>{site.domain || site.url}</strong>
              <small>
                {site.status}
                {latestWos(site.id) != null && ` · last WOS ${latestWos(site.id)}`}
              </small>
            </div>
            <div className="saved-site-actions">
              <button type="button" disabled={submitting} onClick={() => view(site.id)}>
                View Results
              </button>
              <button type="button" className="btn-secondary" disabled={submitting} onClick={() => refresh(site.id)}>
                Re-audit
              </button>
            </div>
          </li>
        ))}
        {!websites.length && (
          <li className="status">Koi site nahi — Run Audit se nayi site add karo</li>
        )}
      </ul>
    </>
  )
}
