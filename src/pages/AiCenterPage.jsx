import { Link } from 'react-router-dom'
import AiCenterPanel from '../components/AiCenterPanel'

export default function AiCenterPage() {
  return (
    <div className="feature-page">
      <nav className="feature-breadcrumb">
        <Link to="/personal">← All Features</Link>
        <span>/</span>
        <strong>AI Center</strong>
      </nav>
      <AiCenterPanel />
    </div>
  )
}
