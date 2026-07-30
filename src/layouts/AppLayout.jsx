import { Link, Outlet, useLocation } from 'react-router-dom'
import { useWorkflowApp } from '../context/WorkflowAppContext'

const DEFAULT_PERSONAL_PREFIXES = [
  '/personal',
  '/audit',
  '/shops',
  '/guard',
  '/automations',
  '/ai-automation',
  '/ai-center',
  '/whatsapp',
  '/temp',
]

function isPersonalFeaturePath(pathname, personalPaths) {
  if (personalPaths?.has?.(pathname)) return true
  return DEFAULT_PERSONAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export default function AppLayout({ personalPaths }) {
  const { errors } = useWorkflowApp()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const onPersonalFeature = isPersonalFeaturePath(pathname, personalPaths)

  return (
    <main className="home">
      <header className="home-header">
        <Link to="/" className="home-header-link">
          <h1>LifeSolveNow SEO Engine</h1>
        </Link>
        {onPersonalFeature &&
          !isHome &&
          pathname !== '/personal' &&
          !pathname.startsWith('/temp') && (
          <Link to="/personal" className="home-back-home">
            ← All Features
          </Link>
        )}
        {pathname.startsWith('/temp') && pathname !== '/temp' && (
          <Link to="/temp" className="home-back-home">
            ← Temp AI
          </Link>
        )}
        {!isHome && !onPersonalFeature && pathname.startsWith('/folders') && (
          <Link to="/" className="home-back-home">
            ← Home
          </Link>
        )}
      </header>

      {errors.length > 0 && (
        <section className="alert-banner">
          <strong>⚠️ {errors.length} automation blocked</strong>
          <span>{errors[0]?.error_message}</span>
        </section>
      )}

      <Outlet />
    </main>
  )
}
