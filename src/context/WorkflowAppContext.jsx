import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchHeartbeat, pickNewerPing, recordHeartbeat } from '../services/heartbeatService'
import { startKeepAliveLoop } from '../services/keepAliveService'
import { isSupabaseConfigured } from '../supabaseClient'
import { listIndexingQueue, listOpenErrors, listShopRankSnapshots, listShops } from '../services/shopService'
import { syncShopsFromLifeSolveNow } from '../services/shopSyncService'

const SYNC_INTERVAL_MS = 5 * 60 * 1000

const WorkflowAppContext = createContext(null)

export function WorkflowAppProvider({ children }) {
  const [shops, setShops] = useState([])
  const [indexingQueue, setIndexingQueue] = useState([])
  const [shopRanks, setShopRanks] = useState([])
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [syncStats, setSyncStats] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [lastPingAt, setLastPingAt] = useState(null)
  const [keepAliveError, setKeepAliveError] = useState(null)
  const [keepAliveOk, setKeepAliveOk] = useState(false)

  const refresh = useCallback(async () => {
    const [shopData, errorData, queueData, rankData, heartbeat] = await Promise.all([
      listShops(),
      listOpenErrors(),
      listIndexingQueue(30),
      listShopRankSnapshots(30),
      fetchHeartbeat().catch(() => null),
    ])
    setShops(shopData)
    setErrors(errorData)
    setIndexingQueue(queueData)
    setShopRanks(rankData)
    if (heartbeat?.last_ping_at) {
      setLastPingAt((prev) => pickNewerPing(prev, heartbeat.last_ping_at))
    }
  }, [])

  const runSync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      const stats = await syncShopsFromLifeSolveNow()
      setSyncStats(stats)
      setLastSync(new Date())
      await refresh()
    } catch (err) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [refresh])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSyncError('Supabase keys missing — .env check karo')
      setLoading(false)
      return
    }

    runSync().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only initial sync
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined

    const syncTimer = setInterval(() => {
      runSync()
    }, SYNC_INTERVAL_MS)

    const stopKeepAlive = startKeepAliveLoop(async (result) => {
      if (result.ok) {
        setKeepAliveOk(true)
        setKeepAliveError(null)
        if (result.pingedAt) {
          const pingIso = result.pingedAt.toISOString()
          setLastPingAt((prev) => pickNewerPing(prev, pingIso))
        }
        recordHeartbeat(result.data?.source || 'react_app')
          .then((row) => {
            const savedAt = row?.last_ping_at
            if (savedAt) setLastPingAt((prev) => pickNewerPing(prev, savedAt))
          })
          .catch(() => {})
        fetchHeartbeat()
          .then((hb) => {
            if (hb?.last_ping_at) {
              setLastPingAt((prev) => pickNewerPing(prev, hb.last_ping_at))
              setKeepAliveError(null)
            }
          })
          .catch(() => {})
        setTimeout(() => setKeepAliveOk(false), 4000)
      } else {
        setKeepAliveError(result.error)
      }
    })

    return () => {
      clearInterval(syncTimer)
      stopKeepAlive()
    }
  }, [runSync])

  const value = useMemo(
    () => ({
      shops,
      indexingQueue,
      shopRanks,
      errors,
      loading,
      syncing,
      syncError,
      syncStats,
      lastSync,
      lastPingAt,
      keepAliveError,
      keepAliveOk,
      runSync,
      refresh,
    }),
    [
      shops,
      indexingQueue,
      shopRanks,
      errors,
      loading,
      syncing,
      syncError,
      syncStats,
      lastSync,
      lastPingAt,
      keepAliveError,
      keepAliveOk,
      runSync,
      refresh,
    ]
  )

  return <WorkflowAppContext.Provider value={value}>{children}</WorkflowAppContext.Provider>
}

export function useWorkflowApp() {
  const ctx = useContext(WorkflowAppContext)
  if (!ctx) throw new Error('useWorkflowApp must be used within WorkflowAppProvider')
  return ctx
}
