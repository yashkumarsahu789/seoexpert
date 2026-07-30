import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TEMP_AUTOMATIONS } from '../data/tempAutomations'
import { listTempBoxes } from '../services/tempDbService'
import { checkTempAiSecrets } from '../services/tempAiService'

export default function TempHubPage() {
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [secrets, setSecrets] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [rows, sec] = await Promise.all([
          listTempBoxes(),
          checkTempAiSecrets().catch((e) => ({ ok: false, hint: e.message })),
        ])
        setSecrets(sec)
        if (rows.length) {
          setBoxes(
            rows.map((r) => ({
              id: r.slug,
              path: r.path,
              name: r.name,
              icon: r.icon,
              accent: r.accent,
              description: r.description,
              primary: r.is_primary,
            }))
          )
        } else {
          setBoxes(TEMP_AUTOMATIONS)
        }
      } catch (err) {
        setError(err.message)
        setBoxes(TEMP_AUTOMATIONS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="feature-hub">
      <nav className="feature-breadcrumb">
        <Link to="/">← Home</Link>
        <span> / Temp AI</span>
      </nav>

      <p className="feature-hub-intro">
        Har automation alag box — tum bataoge kya banana hai. 3 Google keys sirf automation chalte waqt use hoti hain.
      </p>

      {secrets && (
        <p className={`ai-alert ${secrets.count === 3 ? 'ai-alert-ok' : 'ai-alert-error'}`}>
          {secrets.hint || `Keys ${secrets.count ?? 0}/3`}
        </p>
      )}

      {error && <p className="folder-error">{error} — npm run temp:setup chalao</p>}

      {loading ? (
        <p className="feature-hub-intro">Loading from Supabase…</p>
      ) : (
        <div className="feature-grid">
          {boxes.map((a) => (
            <Link
              key={a.id}
              to={a.path}
              className={`feature-card ${a.primary ? 'feature-card-primary' : ''}`}
              style={{ '--feature-accent': a.accent }}
            >
              <span className="feature-card-icon">{a.icon}</span>
              <h2>{a.name}</h2>
              <p>{a.description}</p>
              {a.primary && <span className="feature-card-badge">Catalog</span>}
            </Link>
          ))}

          <div className="feature-card feature-card-empty" style={{ '--feature-accent': '#94a3b8' }}>
            <span className="feature-card-icon">➕</span>
            <h2>Next automation</h2>
            <p>Batao kya automation chahiye — naya box + page yahan add hoga</p>
          </div>
        </div>
      )}
    </div>
  )
}
