import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import KeywordPageRenderer from '../components/keyword-pages/KeywordPageRenderer'
import { buildPageConfig } from '../lib/pageConfig'
import { getPageBySlug } from '../services/keywordPagesService'

export default function KeywordPageRoute() {
  const { slug } = useParams()
  const [config, setConfig] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const row = await getPageBySlug(slug)
        if (cancelled) return
        if (row?.config) {
          setConfig(row.config.seoContent ? row.config : buildPageConfig(row.keyword, row.serp_top_url || ''))
        } else if (row?.keyword) {
          setConfig(buildPageConfig(row.keyword, row.serp_top_url || ''))
        } else {
          setErr('Page not found')
        }
      } catch (e) {
        if (!cancelled) setErr(e.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (err) {
    return (
      <div style={{ padding: 24, color: '#fca5a5', background: '#0f172a', minHeight: '100dvh' }}>
        {err}
      </div>
    )
  }
  if (!config) {
    return <div style={{ padding: 24, color: '#94a3b8', background: '#f8fafc', minHeight: '100dvh' }}>Loading…</div>
  }

  return <KeywordPageRenderer config={config} />
}
