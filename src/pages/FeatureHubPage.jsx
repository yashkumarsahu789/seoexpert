import { Link } from 'react-router-dom'
import { FEATURES } from '../data/features'

export default function FeatureHubPage() {
  return (
    <div className="feature-hub">
      <p className="feature-hub-intro">Feature choose karo — har ek ka apna section hai</p>
      <div className="feature-grid">
        {FEATURES.map((f) =>
          f.externalUrl ? (
            <a
              key={f.id}
              href={f.externalUrl}
              target="_blank"
              rel="noreferrer"
              className={`feature-card ${f.primary ? 'feature-card-primary' : ''}`}
              style={{ '--feature-accent': f.accent }}
            >
              <span className="feature-card-icon">{f.icon}</span>
              <h2>{f.name}</h2>
              <p>{f.description}</p>
            </a>
          ) : (
            <Link
              key={f.id}
              to={f.path}
              className={`feature-card ${f.primary ? 'feature-card-primary' : ''}`}
              style={{ '--feature-accent': f.accent }}
            >
              <span className="feature-card-icon">{f.icon}</span>
              <h2>{f.name}</h2>
              <p>{f.description}</p>
              {f.primary && <span className="feature-card-badge">Main</span>}
            </Link>
          )
        )}
      </div>
    </div>
  )
}
