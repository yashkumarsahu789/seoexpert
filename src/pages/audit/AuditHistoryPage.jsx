import { useNavigate } from 'react-router-dom'
import { useAudit } from '../../context/AuditContext'

export default function AuditHistoryPage() {
  const { runs, loadRunDetails } = useAudit()
  const navigate = useNavigate()

  async function openRun(run) {
    await loadRunDetails(run)
    navigate('/audit/checks')
  }

  return (
    <>
      <h2 className="feature-section-title">Past Audits</h2>
      <p className="hint">Kisi bhi purane audit par click karo — results load ho jayenge.</p>
      <ul className="list compact-list">
        {runs.map((run) => (
          <li key={run.id}>
            <button type="button" className="linkish" onClick={() => openRun(run)}>
              {run.domain} · WOS {run.wos_score ?? '—'} · {run.status}
            </button>
            <small>{new Date(run.started_at).toLocaleString()}</small>
          </li>
        ))}
        {!runs.length && <li className="status">Abhi koi audit nahi</li>}
      </ul>
    </>
  )
}
