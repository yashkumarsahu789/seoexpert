import { Link, Navigate, useParams } from 'react-router-dom'
import { WorkflowPanel } from '../components/WorkflowPanels'
import { getWorkflowById } from '../data/workflows'
import { useWorkflowApp } from '../context/WorkflowAppContext'

export default function WorkflowPage() {
  const { id } = useParams()
  const app = useWorkflowApp()
  const workflow = getWorkflowById(id)

  if (id === 'website_audit') {
    return <Navigate to="/" replace />
  }

  if (!workflow) {
    return <Navigate to="/workflows" replace />
  }

  return (
    <div className="workflow-page">
      <nav className="workflow-page-nav">
        <Link to="/workflows" className="back-link">
          ← Background Jobs
        </Link>
        {' · '}
        <Link to="/" className="back-link">
          Run Audit
        </Link>
      </nav>

      <header className="workflow-page-header">
        <span className="workflow-avatar workflow-avatar-lg" style={{ background: workflow.accent }}>
          {workflow.icon}
        </span>
        <div>
          <h1>{workflow.name}</h1>
          <p className="workflow-page-category">{workflow.category}</p>
        </div>
      </header>

      <section className="workflow-page-body">
        <WorkflowPanel workflow={workflow} app={app} />
      </section>
    </div>
  )
}
