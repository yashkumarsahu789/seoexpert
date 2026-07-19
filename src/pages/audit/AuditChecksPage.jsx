import { useMemo } from 'react'
import { useAudit } from '../../context/AuditContext'
import AuditScoresBar from '../../components/audit/AuditScoresBar'
import RequirementRow from '../../components/audit/RequirementRow'

const PILLARS = ['seo', 'aeo', 'geo']

export default function AuditChecksPage() {
  const { reqChecks, activePillar, setActivePillar } = useAudit()
  const pillarChecks = useMemo(
    () => reqChecks.filter((c) => c.pillar === activePillar),
    [reqChecks, activePillar]
  )

  return (
    <>
      <h2 className="feature-section-title">SEO / AEO / GEO Check</h2>
      <p className="hint">Official + Patents + Trackers rules vs aapki site.</p>
      <AuditScoresBar />
      <div className="pillar-tabs">
        {PILLARS.map((p) => (
          <button
            key={p}
            type="button"
            className={activePillar === p ? 'active' : ''}
            onClick={() => setActivePillar(p)}
          >
            {p.toUpperCase()} ({reqChecks.filter((c) => c.pillar === p).length})
          </button>
        ))}
      </div>
      <ul className="req-list">
        {pillarChecks.map((row) => (
          <RequirementRow key={row.id || row.rule_code} row={row} />
        ))}
        {!pillarChecks.length && (
          <li className="status">Data nahi — pehle Run Audit se site check karo</li>
        )}
      </ul>
    </>
  )
}
