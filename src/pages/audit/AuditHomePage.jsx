import { Link } from 'react-router-dom'
import { AUDIT_OPTIONS } from '../../data/features'
import { useAudit } from '../../context/AuditContext'
import AuditScoresBar from '../../components/audit/AuditScoresBar'

export default function AuditHomePage() {
  const { lastSync, catalogSize } = useAudit()

  return (
    <>
      <AuditScoresBar />
      <section className="audit-sources-banner">
        <strong>Daily rules catalog</strong>
        {lastSync && (
          <small>
            Last sync {new Date(lastSync).toLocaleString()} · SEO {catalogSize.seo} · AEO{' '}
            {catalogSize.aeo} · GEO {catalogSize.geo} rules
          </small>
        )}
      </section>
      <div className="feature-option-grid">
        {AUDIT_OPTIONS.map((opt) => (
          <Link key={opt.path} to={opt.path} className="feature-option-card">
            <span className="feature-option-step-lg">{opt.step}</span>
            <h3>{opt.label}</h3>
            <p>{opt.desc}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
