import { SOURCE_LABELS, STATUS_LABELS, sourceBadgeClass } from '../../services/requirementsService'

export default function RequirementRow({ row }) {
  return (
    <li className={`req-row req-${row.status}`}>
      <div className="req-row-head">
        <span className={`badge ${sourceBadgeClass(row.source_type)}`}>
          {SOURCE_LABELS[row.source_type] || row.source_type}
        </span>
        <span className={`badge badge-${row.severity}`}>{row.severity}</span>
        <strong>{row.title}</strong>
      </div>
      <p className="req-status">{STATUS_LABELS[row.status] || row.status}</p>
      {row.detail && <small>{row.detail}</small>}
      {row.remediation && row.status !== 'present' && <p className="req-fix">{row.remediation}</p>}
    </li>
  )
}
