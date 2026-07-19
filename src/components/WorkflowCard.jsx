import { Link } from 'react-router-dom'
import { formatRelativeTime, heartbeatStatus } from '../services/heartbeatService'
import { getWorkflowPath } from '../data/workflows'

function statusLabel(status) {
  if (status === 'alive') return 'Live'
  if (status === 'warning') return 'Slow'
  if (status === 'sleeping') return 'Sleep'
  return 'Unknown'
}

export default function WorkflowCard({
  workflow,
  active,
  lastPingAt,
  previewOverride,
}) {
  const hbStatus = workflow.kind === 'guard' ? heartbeatStatus(lastPingAt) : null

  return (
    <article className="workflow-row">
      <Link to={getWorkflowPath(workflow.id)} className="workflow-row-main">
        <span className="workflow-avatar" style={{ background: workflow.accent }}>
          {workflow.icon}
        </span>
        <span className="workflow-body">
          <span className="workflow-topline">
            <strong>{workflow.name}</strong>
            {hbStatus && (
              <span className={`workflow-dot workflow-dot-${hbStatus}`} title={statusLabel(hbStatus)} />
            )}
          </span>
          <span className="workflow-preview">{previewOverride || workflow.preview}</span>
        </span>
        <span className="workflow-meta">
          {lastPingAt && workflow.kind === 'guard' && (
            <time>{formatRelativeTime(lastPingAt)}</time>
          )}
          {lastPingAt && workflow.kind === 'sync' && (
            <time>{formatRelativeTime(lastPingAt)}</time>
          )}
          {workflow.kind === 'guard' && hbStatus && (
            <span className={`workflow-badge workflow-badge-${hbStatus}`}>
              {statusLabel(hbStatus)}
            </span>
          )}
          {active && workflow.kind !== 'guard' && <span className="workflow-badge">Active</span>}
        </span>
      </Link>
    </article>
  )
}
