import { Link } from 'react-router-dom'
import { GuardPanel } from '../components/WorkflowPanels'
import { useWorkflowApp } from '../context/WorkflowAppContext'

export default function GuardPage() {
  const app = useWorkflowApp()
  return (
    <div className="feature-page">
      <nav className="feature-breadcrumb">
        <Link to="/personal">← All Features</Link>
        <span>/</span>
        <strong>Render Guard</strong>
      </nav>
      <GuardPanel
        lastPingAt={app.lastPingAt}
        keepAliveError={app.keepAliveError}
        keepAliveOk={app.keepAliveOk}
      />
    </div>
  )
}
