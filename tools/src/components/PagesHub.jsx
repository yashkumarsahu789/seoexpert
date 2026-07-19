import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isFirebaseConfigured, listSavedPages } from '../services/keywordPagesService'

export default function PagesHub() {
  const [pages, setPages] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    listSavedPages()
      .then(setPages)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="hub">
      <header className="hub-header">
        <h1>Generated keyword pages</h1>
        <p className="hub-desc">
          React pages — har type ka apna theme · {isFirebaseConfigured ? 'Firebase' : 'localStorage'}
        </p>
      </header>
      {error && <p className="hub-error">{error}</p>}
      <section className="hub-grid">
        {pages.map((p) => (
          <Link key={p.slug} className="hub-card" to={`/p/${p.slug}`} target="_blank" rel="noreferrer">
            <span className={`hub-tag hub-tag--${p.page_type}`}>{p.page_type}</span>
            {p.theme_id && <span className="hub-tag hub-tag--local">{p.theme_id}</span>}
            <strong>{p.keyword}</strong>
            <small>/p/{p.slug}</small>
          </Link>
        ))}
      </section>
      {!pages.length && !error && <p className="ai-muted">Koi page nahi — Keyword pipeline se banao</p>}
    </div>
  )
}
