import { supabase } from '../supabaseClient'

const SHOP_BASE = (import.meta.env.VITE_SHOP_BASE_URL || 'https://shop.LifeSolveNow.com').replace(/\/$/, '')
const CDN_BASE = (import.meta.env.VITE_CDN_BASE_URL || 'https://cd.LifeSolveNow.com').replace(/\/$/, '')
const SITEMAP_URL = import.meta.env.VITE_SHOP_SITEMAP_URL || `${SHOP_BASE}/sitemap.xml`
const API_URL = import.meta.env.VITE_LIVESOLVENOW_SHOPS_API || ''

const SKIP_PATH_PREFIXES = [
  '/search',
  '/signup',
  '/login',
  '/plans',
  '/download',
  '/blog',
  '/legal',
  '/admin',
]

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

async function fetchWithCorsFallback(url) {
  try {
    const res = await fetch(url)
    if (res.ok) return await res.text()
  } catch {
    // try proxies
  }

  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url))
      if (res.ok) {
        const text = await res.text()
        if (text?.length > 50) return text
      }
    } catch {
      // next proxy
    }
  }

  throw new Error(`Could not fetch ${url}`)
}

function slugFromUrl(shopUrl) {
  try {
    const path = new URL(shopUrl).pathname.replace(/^\/|\/$/g, '')
    const parts = path.split('/').filter(Boolean)
    return parts.join('/') || 'shop'
  } catch {
    return 'shop'
  }
}

function parseShopPath(shopUrl) {
  try {
    const parts = new URL(shopUrl).pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
    if (!parts.length) return { slug: 'shop', name: 'shop', city: 'India', area: null }
    const slug = parts.join('/')
    const name = parts[parts.length - 1].replace(/-/g, ' ')
    if (parts.length >= 2) {
      return {
        slug,
        name,
        city: parts[0].replace(/-/g, ' '),
        area: parts.length > 2 ? parts.slice(1, -1).join(' ').replace(/-/g, ' ') : null,
      }
    }
    return { slug, name, city: 'India', area: null }
  } catch {
    return { slug: 'shop', name: 'shop', city: 'India', area: null }
  }
}

function parseCityArea(address, slug) {
  if (address) {
    const parts = String(address).split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      return { city: parts[parts.length - 1], area: parts[0] }
    }
    if (parts.length === 1) return { city: parts[0], area: null }
  }

  const slugParts = String(slug || '').split('/').filter(Boolean)
  if (slugParts.length >= 2) {
    return { city: slugParts[0].replace(/-/g, ' '), area: slugParts.slice(1).join(' ').replace(/-/g, ' ') }
  }

  return { city: 'India', area: null }
}

function mapRsShopToSeo(row) {
  const slug = String(row.slug || '').trim()
  if (!slug || SYSTEM_SLUGS.has(slug.toLowerCase())) return null

  const addressOrArea = row.address || [row.area, row.city].filter(Boolean).join(', ')
  const { city, area } = parseCityArea(addressOrArea, slug)
  const resolvedCity = row.city || city || 'India'
  const resolvedArea = row.area ?? area ?? null

  const types = row.category
    ? Array.isArray(row.category)
      ? row.category
      : [String(row.category)]
    : Array.isArray(row.product_types) && row.product_types.length
    ? row.product_types
    : ['general']

  const name = cleanShopDisplayName(row.name, slug)

  const primaryKeywords = Array.isArray(row.primary_keywords) && row.primary_keywords.length
    ? row.primary_keywords
    : [
        `${name} ${resolvedCity}`,
        `${types[0]} shop ${resolvedArea || resolvedCity}`,
        `best ${types[0]} ${resolvedCity}`,
      ].filter(isUsefulKeyword)

  return {
    source_shop_id: row.id,
    name,
    slug,
    city: resolvedCity,
    area: resolvedArea,
    shop_url: row.shop_url || `${SHOP_BASE}/${slug}`,
    sitemap_entry_url: `${SITEMAP_URL}`,
    image_cdn_url: `${CDN_BASE}/${slug}`,
    product_types: types,
    primary_keywords: primaryKeywords,
    source: 'rs_shops',
    automation_status: 'active',
    last_synced_at: new Date().toISOString(),
    seo_synced: true,
    latitude: row.latitude ?? row.lat ?? null,
    longitude: row.longitude ?? row.lng ?? null,
  }
}

function cleanShopDisplayName(name, slug) {
  const raw = String(name || slug.replace(/-/g, ' ')).trim()
  return raw.split('|')[0].split('–')[0].trim().slice(0, 48) || slug.replace(/-/g, ' ')
}

function isUsefulKeyword(keyword) {
  const k = String(keyword || '').trim()
  return k.length >= 3 && k.length <= 55 && !/[|]/.test(k)
}

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
])

async function fetchShopsFromRsShops() {
  const { data, error } = await supabase
    .from('rs_shops')
    .select('id, name, slug, city, area, shop_url, product_types, primary_keywords, latitude, longitude')
    .not('slug', 'is', null)
    .order('name')

  if (error) {
    if (error.code === '42P01' || error.message?.includes('rs_shops')) {
      return null
    }
    console.warn('[shopSyncService] rs_shops query returned error:', error.message)
    return null
  }

  return (data || []).map(mapRsShopToSeo).filter(Boolean)
}

async function fetchShopsFromApi() {
  if (!API_URL) return null

  const json = await fetchWithCorsFallback(API_URL)
  const data = JSON.parse(json)
  const rows = Array.isArray(data) ? data : data.shops || data.data || []

  return rows
    .map((row) =>
      mapRsShopToSeo({
        id: row.id,
        name: row.name || row.shop_name,
        slug: row.slug || slugFromUrl(row.url || row.shop_url),
        category: row.category || row.product_types || row.categories,
        address: row.address || row.city,
        lat: row.lat ?? row.latitude,
        lng: row.lng ?? row.longitude,
      })
    )
    .filter(Boolean)
}

function isShopUrl(loc) {
  try {
    const { pathname } = new URL(loc)
    const lower = pathname.toLowerCase()
    if (lower === '/' || lower === '') return false
    if (SKIP_PATH_PREFIXES.some((p) => lower.startsWith(p))) return false
    if (lower.includes('/blog/')) return false
    return true
  } catch {
    return false
  }
}

function parseSitemapUrls(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const locs = [...doc.querySelectorAll('url > loc, loc')]
    .map((el) => el.textContent?.trim())
    .filter(Boolean)

  const shopBase = SHOP_BASE.toLowerCase()

  return [...new Set(locs)].filter((loc) => {
    const lower = loc.toLowerCase()
    if (!lower.startsWith(shopBase)) return false
    if (lower.endsWith('sitemap.xml')) return false
    return isShopUrl(loc)
  })
}

async function fetchShopsFromSitemap() {
  const xml = await fetchWithCorsFallback(SITEMAP_URL)
  const urls = parseSitemapUrls(xml)

  if (!urls.length) {
    throw new Error('Sitemap mein koi shop URL nahi mili')
  }

  return urls.slice(0, 200).map((shopUrl) => {
    const { slug, name, city, area } = parseShopPath(shopUrl)
    return {
      source_shop_id: null,
      name,
      slug,
      city,
      area,
      shop_url: shopUrl,
      sitemap_entry_url: SITEMAP_URL,
      image_cdn_url: `${CDN_BASE}/${slug.split('/').pop()}`,
      product_types: ['general'],
      primary_keywords: [
        `${name} ${city}`,
        `${name} ${area || city}`.trim(),
        `cafe ${city}`,
        `dhaba ${city}`,
      ].filter(isUsefulKeyword),
      source: 'livesolvenow_sitemap',
      automation_status: 'active',
      last_synced_at: new Date().toISOString(),
      seo_synced: true,
    }
  })
}

async function ensureIndexingQueue(shop) {
  const { data: existing } = await supabase
    .from('indexing_queue')
    .select('id')
    .eq('shop_id', shop.id)
    .limit(1)

  if (existing?.length) return

  await supabase.from('indexing_queue').insert({
    shop_id: shop.id,
    url: shop.shop_url,
    url_type: 'shop',
    in_sitemap: true,
    index_method: 'sitemap_ping',
  })
}

async function ensureKeywordClusters(shop) {
  for (const productType of shop.product_types || ['general']) {
    await supabase.from('location_keyword_clusters').upsert(
      {
        city: shop.city,
        area: shop.area || '',
        product_type: productType,
        keywords: [
          `${productType} near me ${shop.area || shop.city}`,
          `best ${productType} ${shop.city}`,
          `${productType} shop ${shop.area || shop.city}`,
          ...(shop.primary_keywords || []),
        ],
      },
      { onConflict: 'city,area,product_type' }
    )
  }
}

async function upsertSeoShop(row) {
  const matchCol = row.source_shop_id ? 'source_shop_id' : 'slug'
  const matchVal = row.source_shop_id || row.slug

  let existing = null
  const { data: byKey } = await supabase
    .from('shops')
    .select('id')
    .eq(matchCol, matchVal)
    .maybeSingle()
  existing = byKey

  if (!existing && row.shop_url) {
    const { data: byUrl } = await supabase
      .from('shops')
      .select('id')
      .eq('shop_url', row.shop_url)
      .maybeSingle()
    existing = byUrl
  }

  if (existing) {
    const { data: shop, error } = await supabase
      .from('shops')
      .update({
        name: row.name,
        slug: row.slug,
        city: row.city,
        area: row.area,
        shop_url: row.shop_url,
        image_cdn_url: row.image_cdn_url,
        product_types: row.product_types,
        primary_keywords: row.primary_keywords,
        last_synced_at: row.last_synced_at,
        seo_synced: true,
        latitude: row.latitude,
        longitude: row.longitude,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw error
    await ensureIndexingQueue(shop)
    return { shop, inserted: false }
  }

  const cooldownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: shop, error } = await supabase
    .from('shops')
    .insert({
      ...row,
      boost_cooldown_until: cooldownUntil,
      needs_boost: false,
    })
    .select('*')
    .single()

  if (error) throw error
  await ensureIndexingQueue(shop)
  await ensureKeywordClusters(shop)
  return { shop, inserted: true }
}

export async function syncShopsFromLifeSolveNow() {
  let fetched = await fetchShopsFromRsShops()
  let source = 'rs_shops'

  if (!fetched?.length) {
    fetched = await fetchShopsFromApi()
    source = 'api'
  }

  if (!fetched?.length) {
    fetched = await fetchShopsFromSitemap()
    source = 'sitemap'
  }

  let inserted = 0
  let updated = 0

  for (const row of fetched) {
    const { inserted: isNew } = await upsertSeoShop(row)
    if (isNew) inserted += 1
    else updated += 1
  }

  return { fetched: fetched.length, inserted, updated, source }
}
