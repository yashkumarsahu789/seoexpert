import { Link } from 'react-router-dom'
import AiAutomationPanel from '../components/AiAutomationPanel'

export default function AiAutomationPage() {
  return (
    <div className="feature-page">
      <nav className="feature-breadcrumb">
        <Link to="/personal">← All Features</Link>
        <span>/</span>
        <strong>AI Automation</strong>
      </nav>
      <AiAutomationPanel />
    </div>
  )
}
