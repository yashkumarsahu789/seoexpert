import { Link } from 'react-router-dom'
import WebflowPanel from '../components/WebflowPanel'

export default function BuilderPage() {
  return (
    <div className="feature-page">
      <nav className="feature-breadcrumb">
        <Link to="/">Webflow</Link>
        <span>/</span>
        <strong>Builder</strong>
      </nav>
      <WebflowPanel />
    </div>
  )
}
