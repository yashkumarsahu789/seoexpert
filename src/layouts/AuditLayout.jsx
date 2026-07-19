import { Link, NavLink, Outlet } from 'react-router-dom'
import { AUDIT_OPTIONS } from '../data/features'
import { AuditProvider, useAudit } from '../context/AuditContext'

function AuditLayoutInner() {
  const { error, successMsg, reportOpen, setReportOpen, reportHtml } = useAudit()

  return (
    <div className="feature-page audit-feature">
      <nav className="feature-breadcrumb">
        <Link to="/personal">← All Features</Link>
        <span>/</span>
        <strong>Website Audit</strong>
      </nav>

      <nav className="feature-option-nav" aria-label="Audit options">
        {AUDIT_OPTIONS.map((opt) => (
          <NavLink
            key={opt.path}
            to={opt.path}
            className={({ isActive }) => (isActive ? 'feature-option-link active' : 'feature-option-link')}
          >
            <span className="feature-option-step">{opt.step}</span>
            <span className="feature-option-label">{opt.label}</span>
          </NavLink>
        ))}
      </nav>

      {error && <p className="status error">{error}</p>}
      {successMsg && <p className="status ok">{successMsg}</p>}

      <Outlet />

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

export default function AuditLayout() {
  return (
    <AuditProvider>
      <AuditLayoutInner />
    </AuditProvider>
  )
}
