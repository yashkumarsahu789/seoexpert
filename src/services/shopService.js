import { supabase } from '../supabaseClient'

const SYSTEM_SLUGS = new Set([
  'download',
  'login',
  'signup',
  'sign-up',
  'plans',
  'search',
  'legal',
  'admin',
  'blog',
  'install',
  'add-shop',
  'about',
  'contact',
  'privacy',
  'terms',
])

const SYSTEM_PATH_PREFIXES = [
  '/search',
  '/signup',
  '/login',
  '/plans',
  '/download',
  '/blog',
  '/legal',
  '/admin',
  '/install',
]

export function cleanShopName(name, slug = '') {
  const raw = String(name || slug.replace(/-/g, ' ') || '').trim()
  return raw.split('|')[0].split('–')[0].trim().slice(0, 48) || slug.replace(/-/g, ' ')
}

export function isSystemShop(shop) {
  if (!shop) return true
  const slug = String(shop.slug || '').toLowerCase()
  if (SYSTEM_SLUGS.has(slug)) return true
  try {
    const path = new URL(shop.shop_url || '').pathname.toLowerCase()
    if (path === '/' || !path) return true
    return SYSTEM_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
  } catch {
    return false
  }
}

function isUsefulKeyword(keyword) {
  const k = String(keyword || '').trim()
  if (k.length < 3 || k.length > 55) return false
  if (/[|]/.test(k)) return false
  if (/https?:\/\//i.test(k)) return false
  if (/^(download|login|signup|install|shop india)$/i.test(k)) return false
  return true
}

export function enrichShopFromUrl(shop) {
  if (!shop?.shop_url) return shop
  try {
    const parts = new URL(shop.shop_url).pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
    if (parts.length < 2) return shop
    const city = parts[0].replace(/-/g, ' ')
    const shopSlug = parts[parts.length - 1]
    const name = cleanShopName(shop.name, shopSlug)
    const fullSlug = parts.join('/')
    const area =
      shop.area ||
      (parts.length > 2 ? parts.slice(1, -1).join(' ').replace(/-/g, ' ') : null)
    return {
      ...shop,
      slug: fullSlug,
      city: !shop.city || shop.city === 'India' ? city : shop.city,
      area,
      name,
    }
  } catch {
    return shop
  }
}

export function buildKeywordsForShop(shop, extraKeywords = []) {
  const s = enrichShopFromUrl(shop)
  if (!s || isSystemShop(s)) return []

  const name = cleanShopName(s.name, s.slug?.split('/').pop() || s.slug)
  const slugWords = String(s.slug || '')
    .split('/')
    .pop()
    ?.replace(/-/g, ' ')
    .trim()
  const city = s.city && s.city !== 'India' ? s.city : null
  const area = s.area && s.area !== s.city ? s.area : null
  const types = s.product_types || []
  const type = types[0] && types[0] !== 'general' ? types[0] : null

  const keywords = []
  if (name.length >= 3) keywords.push(name)
  if (city && name) keywords.push(`${name} ${city}`)
  if (area && name) keywords.push(`${name} ${area}`)
  if (area && city && name) keywords.push(`${name} ${area} ${city}`)
  if (city && slugWords) keywords.push(`${slugWords} ${city}`)
  if (type && city) {
    keywords.push(`${type} shop ${area || city}`)
    keywords.push(`best ${type} ${city}`)
    keywords.push(`${type} near me ${city}`)
  }
  if (name && city) keywords.push(`${name} near me`)

  for (const kw of s.primary_keywords || []) {
    keywords.push(String(kw).split('|')[0].trim())
  }
  for (const kw of extraKeywords) {
    keywords.push(String(kw).split('|')[0].trim())
  }

  return [...new Set(keywords.map((k) => k.replace(/\s+/g, ' ').trim()).filter(isUsefulKeyword))]
}

async function fetchClusterKeywords(shop) {
  if (!shop?.city) return []
  try {
    let query = supabase
      .from('location_keyword_clusters')
      .select('keywords')
      .eq('city', shop.city)
      .limit(5)
    if (shop.area) query = query.eq('area', shop.area)
    const { data, error } = await query
    if (error) {
      if (isMissingSchemaError(error)) return []
      return []
    }
    return (data || []).flatMap((r) => r.keywords || [])
  } catch {
    return []
  }
}

export async function listShops() {
  const { data, error } = await supabase
    .from('shops')
    .select(
      'id, name, slug, city, area, shop_url, automation_status, seo_priority, primary_keywords, product_types, created_at'
    )
    .order('seo_priority', { ascending: false })

  if (error) {
    if (isMissingSchemaError(error)) return []
    throw error
  }
  return (data || []).filter((shop) => !isSystemShop(shop))
}

export async function getShopRankDetails(shopId) {
  const { data: shop, error: shopErr } = await supabase
    .from('shops')
    .select('id, name, slug, city, area, shop_url, primary_keywords, product_types')
    .eq('id', shopId)
    .single()

  if (shopErr) throw shopErr

  const shopEnriched = enrichShopFromUrl(shop)
  const clusterKeywords = await fetchClusterKeywords(shopEnriched)

  const { data: snapshots, error: rankErr } = await supabase
    .from('shop_rank_snapshots')
    .select('keyword, rank_position, shop_url, checked_at, metadata')
    .eq('shop_id', shopId)
    .order('checked_at', { ascending: false })
    .limit(120)

  if (rankErr && !isMissingSchemaError(rankErr)) throw rankErr

  const latestByKeyword = new Map()
  for (const row of snapshots || []) {
    if (!latestByKeyword.has(row.keyword)) latestByKeyword.set(row.keyword, row)
  }

  const keywords = buildKeywordsForShop(shopEnriched, clusterKeywords)
  const rows = keywords.map((keyword) => {
    const snap = latestByKeyword.get(keyword)
    return {
      keyword,
      rank: snap?.rank_position ?? null,
      checkedAt: snap?.checked_at ?? null,
      engine: snap?.metadata?.source ?? null,
    }
  })

  for (const [keyword, snap] of latestByKeyword) {
    if (keywords.includes(keyword)) continue
    rows.push({
      keyword,
      rank: snap.rank_position ?? null,
      checkedAt: snap.checked_at ?? null,
      engine: snap.metadata?.source ?? null,
    })
  }

  return { shop: shopEnriched, rows, isSystemPage: isSystemShop(shopEnriched), hasRankChecks: (snapshots || []).length > 0 }
}

const N8N_BASE = (import.meta.env.VITE_N8N_BASE_URL || 'https://lifesolvenow.onrender.com').replace(/\/$/, '')

const SHOP_RANK_WEBHOOK_REMOTE =
  import.meta.env.VITE_N8N_SHOP_RANK_WEBHOOK_URL || `${N8N_BASE}/webhook/shop-rank-check`

function shopRankWebhookUrl() {
  const remote = SHOP_RANK_WEBHOOK_REMOTE.replace(/\/$/, '')
  if (import.meta.env.DEV && !remote.startsWith('/')) {
    const path = remote.replace(/^https?:\/\/[^/]+/, '')
    return `/api/n8n${path}`
  }
  return remote
}

function parseRankWebhookError(status, data) {
  const msg = data?.message || data?.error || ''
  if (status === 404 && /not registered/i.test(msg)) {
    return 'Shop Rank Check workflow active nahi — n8n me import/activate karo: npm run n8n:push -- shop_rank_webhook'
  }
  if (msg) return msg
  return `Rank check failed (${status})`
}

/** Live rank check via n8n — all keywords, saves to shop_rank_snapshots */
export async function checkShopRanksNow(shopId) {
  const url = shopRankWebhookUrl()
  if (!url?.trim()) {
    throw new Error('Rank webhook URL missing — .env me VITE_N8N_SHOP_RANK_WEBHOOK_URL set karo')
  }

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId, event: 'Shop Rank Check' }),
    })
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error(
        'n8n tak request nahi pahunchi (CORS/network). Dev me Vite restart karo. n8n me Shop Rank Check workflow activate hona chahiye.'
      )
    }
    throw err
  }

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    throw new Error(parseRankWebhookError(res.status, data))
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Rank check failed')
  }

  const rows = (data.rows || []).map((r) => ({
    keyword: r.keyword,
    rank: r.rank ?? r.rank_position ?? null,
    checkedAt: r.checkedAt || new Date().toISOString(),
    engine: r.engine || r.metadata?.source || null,
  }))

  return {
    keywordsChecked: data.keywordsChecked ?? rows.length,
    ranked: data.ranked ?? rows.filter((r) => r.rank != null).length,
    rows,
  }
}

function isMissingSchemaError(error) {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  const msg = String(error.message || '')
  return msg.includes('does not exist') || msg.includes('schema cache')
}

export async function listIndexingQueue(limit = 50) {
  const { data, error } = await supabase
    .from('indexing_queue')
    .select('id, shop_id, url, index_status, is_indexed, last_index_check_at, last_sitemap_ping_at')
    .order('last_index_check_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) {
    if (isMissingSchemaError(error)) return []
    // Migration 007 columns missing — fall back to base columns
    if (error.code === '42703' || String(error.message).includes('index_status')) {
      const fallback = await supabase
        .from('indexing_queue')
        .select('id, shop_id, url')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (fallback.error) throw fallback.error
      return fallback.data || []
    }
    throw error
  }
  return data || []
}

export async function listShopRankSnapshots(limit = 40) {
  const { data, error } = await supabase
    .from('shop_rank_snapshots')
    .select('id, shop_id, keyword, rank_position, shop_url, checked_at')
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isMissingSchemaError(error)) return []
    throw error
  }
  return data || []
}

export async function listOpenErrors() {
  const { data, error } = await supabase
    .from('automation_errors')
    .select('id, severity, workflow_name, error_message, created_at')
    .eq('resolved', false)
    .eq('requires_human', true)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    if (isMissingSchemaError(error)) return []
    throw error
  }
  return data || []
}
