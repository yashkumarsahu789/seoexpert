import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import KeywordPageRenderer from '../components/keyword-pages/KeywordPageRenderer'
import { buildPageConfig } from '../lib/pageConfig'

export default function KeywordPreviewRoute() {
  const [params] = useSearchParams()
  const keyword = params.get('keyword') || ''
  const serp = params.get('serp') || ''

  const config = useMemo(() => {
    if (!keyword.trim()) return null
    try {
      return buildPageConfig(keyword, serp)
    } catch {
      return null
    }
  }, [keyword, serp])

  if (!config) {
    return (
      <div style={{ padding: 24, color: '#94a3b8', background: '#f8fafc', minHeight: '100dvh' }}>
        Keyword required — use ?keyword=...
      </div>
    )
  }

  return <KeywordPageRenderer config={config} />
}
