import { Link } from 'react-router-dom'

const JOBS = [
  {
    name: 'Requirements Daily Sync',
    time: '5:00 AM IST daily',
    desc: 'SEO/AEO/GEO rules Official + Patents + Trackers se update',
  },
  {
    name: 'Website Audit Daily',
    time: '6:00 AM IST daily',
    desc: 'Saved sites ka full audit dubara',
  },
]

export default function AutomationsPage() {
  return (
    <div className="feature-page">
      <nav className="feature-breadcrumb">
        <Link to="/personal">← All Features</Link>
        <span>/</span>
        <strong>Auto Jobs</strong>
      </nav>
      <p className="hint">Ye background me chalti hain — aapko kuch click nahi karna.</p>
      <div className="feature-option-grid">
        {JOBS.map((job) => (
          <div key={job.name} className="feature-option-card feature-option-card-static">
            <h3>{job.name}</h3>
            <p>{job.desc}</p>
            <small>{job.time}</small>
          </div>
        ))}
      </div>
      <Link to="/audit/run" className="workflows-audit-cta-btn" style={{ marginTop: '1rem' }}>
        Manual audit → Run Audit
      </Link>
    </div>
  )
}
