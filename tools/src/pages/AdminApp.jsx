import { useState } from 'react'
import '../App.css'
import '../AiCenter.css'
import AiCenterPanel from '../components/AiCenterPanel'
import KeywordPagesPanel from '../components/KeywordPagesPanel'
import PagesHub from '../components/PagesHub'

const TABS = [
  { id: 'pages', label: 'Generated pages' },
  { id: 'pipeline', label: 'Keyword pipeline' },
  { id: 'ai', label: 'AI Center' },
]

export default function AdminApp() {
  const [tab, setTab] = useState('pipeline')

  return (
    <div className="tools-app">
      <nav className="tools-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'tools-nav-btn active' : 'tools-nav-btn'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="tools-main">
        {tab === 'pages' && <PagesHub />}
        {tab === 'pipeline' && <KeywordPagesPanel />}
        {tab === 'ai' && <AiCenterPanel />}
      </main>
    </div>
  )
}
