import { useCallback, useEffect, useState } from 'react'
import { checkShopRanksNow, getShopRankDetails } from '../services/shopService'

const ENGINE_LABELS = {
  bing_serp: 'Bing',
  duckduckgo_serp: 'DuckDuckGo',
  google_serp: 'Google',
  serpapi_paid_fallback: 'Google (SerpAPI)',
  free_serp_scrape: 'Google',
}

function rankLabel(rank, checkedAt) {
  if (rank != null) return `#${rank}`
  if (!checkedAt) return '—'
  return 'Top 20 ke bahar'
}

function engineLabel(engine, checkedAt) {
  if (engine) return ENGINE_LABELS[engine] || engine
  if (!checkedAt) return '—'
  return '—'
}

export default function ShopKeywordsPanel({ shopId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [checkError, setCheckError] = useState(null)
  const [shop, setShop] = useState(null)
  const [rows, setRows] = useState([])
  const [isSystemPage, setIsSystemPage] = useState(false)

  const refreshFromDb = useCallback(async () => {
    const data = await getShopRankDetails(shopId)
    setShop(data.shop)
    setRows(data.rows)
    setIsSystemPage(data.isSystemPage)
    return data
  }, [shopId])

  const runRankCheck = useCallback(async () => {
    setChecking(true)
    setCheckError(null)
    try {
      await checkShopRanksNow(shopId)
      await refreshFromDb()
    } catch (err) {
      setCheckError(err.message)
    } finally {
      setChecking(false)
    }
  }, [shopId, refreshFromDb])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    refreshFromDb()
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [shopId, refreshFromDb])

  const rankedCount = rows.filter((r) => r.rank != null).length
  const checkedCount = rows.filter((r) => r.checkedAt).length
  const lastChecked = rows
    .filter((r) => r.checkedAt)
    .map((r) => new Date(r.checkedAt).getTime())
    .sort((a, b) => b - a)[0]

  return (
    <div className="shop-keywords-panel">
      <div className="shop-keywords-panel-head">
        <strong>Keywords & rank ({rows.length})</strong>
        <div className="shop-keywords-panel-actions">
          {!isSystemPage && (
            <button
              type="button"
              className="shop-keywords-btn"
              disabled={checking || loading}
              onClick={runRankCheck}
            >
              {checking ? 'Checking ranks…' : 'Check ranks now'}
            </button>
          )}
          <button type="button" className="shop-keywords-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
      </div>
      {shop?.shop_url && <p className="hint shop-keywords-url">{shop.shop_url}</p>}
      {loading && <p className="status">Keywords load ho rahe hain…</p>}
      {checking && !loading && (
        <p className="status ok">Live rank check chal rahi hai (Bing → Google) — 20–40 sec…</p>
      )}
      {error && <p className="status error">{error}</p>}
      {checkError && <p className="status warn">{checkError}</p>}
      {!loading && !error && isSystemPage && (
        <p className="status warn">System page — rank track nahi hota.</p>
      )}
      {!loading && !error && !isSystemPage && (
        <>
          <table className="comp-gap-table shop-keywords-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Rank</th>
                <th>Engine</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.keyword}>
                  <td>{r.keyword}</td>
                  <td>{rankLabel(r.rank, r.checkedAt)}</td>
                  <td>
                    <small>{engineLabel(r.engine, r.checkedAt)}</small>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={3} className="status">
                    Keywords nahi mile — Sync dubara chalao.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {rows.length > 0 && (
            <p className="hint">
              {checkedCount > 0 ? (
                <>
                  Ranked {rankedCount}/{rows.length} keywords
                  {lastChecked ? ` · ${new Date(lastChecked).toLocaleString()}` : ''}
                </>
              ) : (
                <>Keywords ready: {rows.length} · Rank check pending ya webhook deploy karo</>
              )}
            </p>
          )}
        </>
      )}
    </div>
  )
}
