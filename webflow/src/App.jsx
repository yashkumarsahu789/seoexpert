import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BuilderPage from './pages/BuilderPage'
import DemoPage from './pages/DemoPage'
import './styles/panel.css'
import './styles/sunlu-promo.css'

function AppShell() {
  const { pathname } = useLocation()
  const isDemo = pathname.startsWith('/demo')

  return (
    <main className={`app-shell ${isDemo ? 'app-shell--demo' : ''}`}>
      {!isDemo && (
        <header className="app-header">
          <h1>
            <a href="/">Webflow Coupon Builder</a>
          </h1>
        </header>
      )}
      <Routes>
        <Route index element={<BuilderPage />} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
