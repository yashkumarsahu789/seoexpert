import { useAudit } from '../../context/AuditContext'
import AuditScoresBar from '../../components/audit/AuditScoresBar'

export default function AuditPlanPage() {
  const { actionPlan } = useAudit()

  return (
    <>
      <h2 className="feature-section-title">Action Plan</h2>
      <p className="hint">Saari fixes ek jagah — step 1 se 4 tak priority order.</p>
      <AuditScoresBar />
      <ul className="req-list">
        {actionPlan.slice(0, 50).map((a, i) => (
          <li key={i} className={`req-row req-${a.priority}`}>
            <span className="badge">Step {a.step}</span>
            <span className={`badge badge-${a.priority}`}>{a.priority}</span>
            <strong>{a.title}</strong>
            <p className="req-fix">{a.remediation}</p>
          </li>
        ))}
        {!actionPlan.length && <li className="status">Plan empty — naya audit chalao</li>}
      </ul>
    </>
  )
}
