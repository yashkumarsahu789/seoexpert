import { scoreLabel } from '../../services/auditService'
import { useAudit } from '../../context/AuditContext'

function PhaseCard({ label, score, summary }) {
  if (!summary?.total && score == null) return null
  return (
    <div className="phase-card">
      <span className="phase-label">{label}</span>
      <strong className="phase-score">{score ?? '—'}</strong>
      {summary?.total > 0 && (
        <small>
          {summary.present}/{summary.total} ok · {summary.missing} missing
        </small>
      )}
    </div>
  )
}

export default function AuditScoresBar() {
  const { activeRun, openReport, exportCsv, actionPlan } = useAudit()
  if (!activeRun) {
    return (
      <div className="audit-empty-banner">
        Pehle <strong>Run Audit</strong> se site check karo — phir yahan scores dikhenge.
      </div>
    )
  }

  return (
    <section className="audit-scores-wrap">
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
      <p className="audit-active-site">
        {activeRun.domain} · {activeRun.status}
      </p>
      {activeRun.status === 'completed' && (
        <div className="audit-report-actions">
          <button type="button" className="audit-report-btn" onClick={openReport}>
            View Report
          </button>
          {actionPlan.length > 0 && (
            <button type="button" className="audit-report-btn audit-report-btn-secondary" onClick={exportCsv}>
              Export CSV
            </button>
          )}
        </div>
      )}
    </section>
  )
}
