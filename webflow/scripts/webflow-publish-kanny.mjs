#!/usr/bin/env node
/**
 * Publish Sunlu KANNY promo content to Webflow CMS + publish site
 * Usage: npm run webflow:publish
 *
 * Prerequisites:
 * 1. WEBFLOW_API_KEY in .env
 * 2. WEBFLOW_MASTER_SITE_ID (npm run webflow:check)
 * 3. WEBFLOW_COUPON_COLLECTION_ID — CMS collection on that site
 * 4. Collection fields: name, slug, h1-heading, subheading, coupon-code, discount-display, affiliate-url, seo-title, seo-description
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

const root = WEBFLOW_ROOT

loadEnv()

const token =
  process.env.WEBFLOW_API_KEY ||
  process.env.WEBFLOW_API_TOKEN ||
  process.env.demositetoken ||
  ''
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || ''
const collectionId = process.env.WEBFLOW_COUPON_COLLECTION_ID || ''
const siteShortName = process.env.WEBFLOW_SITE_SHORT_NAME || ''
const shopUrl = process.env.VITE_SHOP_BASE_URL || 'https://shop.LifeSolveNow.com'

function isValidSiteId(id) {
  return /^[a-f0-9]{24}$/i.test(String(id || '').trim())
}

function explainBadSiteId(id) {
  console.error(`❌ WEBFLOW_MASTER_SITE_ID invalid: "${id}"`)
  console.error('   Ye subdomain slug lag raha hai (jaise demosite-57cbb8), Site ID nahi.')
  console.error('   Webflow → Site Settings → General → Overview → Site ID (24-char hex)')
  console.error('   Optional URL ke liye alag se: WEBFLOW_SITE_SHORT_NAME=demosite-57cbb8')
}

const PROMO = {
  brand: 'Sunlu',
  promoCode: 'KANNY',
  discount: '10% OFF',
  slug: 'sunlu-kanny-promo',
  siteName: 'Sunlu Promo Codes',
  seoTitle: 'Sunlu Promo Code KANNY — 10% OFF On Your Products',
  seoDescription:
    'Use Sunlu promo code KANNY at checkout for 10% discount on your products. Copy code and shop now.',
  h1: 'Sunlu Promo Code "KANNY" Get 10% Discount On Your Products',
  subheading:
    'Use code KANNY at checkout for flat 10% off on eligible Sunlu products — fast, simple, verified savings.',
}

if (!token) {
  console.error('❌ WEBFLOW_API_KEY missing')
  process.exit(1)
}
if (!siteId) {
  console.error('❌ WEBFLOW_MASTER_SITE_ID missing — pehle: npm run webflow:check')
  process.exit(1)
}
if (!isValidSiteId(siteId)) {
  explainBadSiteId(siteId)
  process.exit(1)
}
if (!collectionId) {
  console.error('❌ WEBFLOW_COUPON_COLLECTION_ID missing')
  console.error('   Webflow Designer → CMS → Collection → Settings → copy Collection ID')
  console.error('   Ya npm run webflow:check se collection ID lo')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  accept: 'application/json',
}

async function api(method, path, body, { allow429 = false } = {}) {
  const res = await fetch(`https://api.webflow.com/v2${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const err = new Error(`${res.status}: ${json?.message || json?.err || text}`)
    err.status = res.status
    if (allow429 && res.status === 429) return { rateLimited: true, json }
    throw err
  }
  return json
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function apiRetry(method, path, body, { tries = 4, waitMs = 15000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      return await api(method, path, body)
    } catch (err) {
      if (err.status === 429 && i < tries - 1) {
        console.log(`⏳ Rate limit (429) — ${waitMs / 1000}s wait, retry ${i + 2}/${tries}...`)
        await sleep(waitMs)
        continue
      }
      throw err
    }
  }
}

const fieldDataAll = {
  name: `${PROMO.brand} ${PROMO.promoCode} — ${PROMO.discount}`,
  slug: PROMO.slug,
  'h1-heading': PROMO.h1,
  subheading: PROMO.subheading,
  'coupon-code': PROMO.promoCode,
  'discount-display': PROMO.discount,
  'affiliate-url': shopUrl,
  'seo-title': PROMO.seoTitle,
  'seo-description': PROMO.seoDescription,
}

async function buildFieldData() {
  try {
    const col = await api('GET', `/collections/${collectionId}`)
    const slugs = new Set((col.fields || []).map((f) => f.slug).filter(Boolean))
    const fieldData = {}
    for (const [key, val] of Object.entries(fieldDataAll)) {
      if (slugs.has(key)) fieldData[key] = val
    }
    if (!Object.keys(fieldData).length) {
      fieldData.name = fieldDataAll.name
      fieldData.slug = fieldDataAll.slug
    }
    const missing = Object.keys(fieldDataAll).filter((k) => !slugs.has(k) && k !== 'name' && k !== 'slug')
    if (missing.length) {
      console.log(`ℹ️  Collection me extra fields nahi — sirf ye use ho rahe: ${Object.keys(fieldData).join(', ')}`)
      if (missing.length < 7) console.log(`   Optional Designer me add karo: ${missing.join(', ')}`)
    }
    return fieldData
  } catch {
    return { name: fieldDataAll.name, slug: fieldDataAll.slug }
  }
}

console.log('Publishing Sunlu KANNY promo to Webflow...\n')
console.log(`  Site ID: ${siteId}`)
console.log(`  Collection: ${collectionId}`)
console.log(`  Code: ${PROMO.promoCode} (${PROMO.discount})\n`)

try {
  let liveUrl = siteShortName ? `https://${siteShortName}.webflow.io` : null

  try {
    const site = await api('GET', `/sites/${siteId}`)
    liveUrl = `https://${site.shortName}.webflow.io`
  } catch (err) {
    if (/403|scopes|forbidden/i.test(err.message)) {
      console.log('⚠️  sites:read missing — CMS publish continue (token me cms:write hona chahiye)')
      if (!liveUrl) {
        console.error('❌ WEBFLOW_SITE_SHORT_NAME bhi set nahi — .env me demosite-57cbb8 daalo')
        process.exit(1)
      }
    } else {
      throw err
    }
  }

  const fieldData = await buildFieldData()

  let itemId = null
  try {
    const item = await api('POST', `/collections/${collectionId}/items`, {
      fieldData,
      isArchived: false,
      isDraft: false,
    })
    itemId = item.id
    console.log('✅ CMS item created:', itemId)
  } catch (err) {
    if (/slug|unique|duplicate|already/i.test(err.message)) {
      console.log('ℹ️  Item pehle se hai — existing slug update try...')
      const list = await api('GET', `/collections/${collectionId}/items?slug=${encodeURIComponent(PROMO.slug)}`)
      const existing = list.items?.find((i) => i.fieldData?.slug === PROMO.slug) || list.items?.[0]
      if (!existing?.id) throw err
      itemId = existing.id
      await api('PATCH', `/collections/${collectionId}/items/${itemId}`, { fieldData })
      console.log('✅ CMS item updated:', itemId)
    } else {
      throw err
    }
  }

  try {
    await apiRetry('POST', `/collections/${collectionId}/items/publish`, { itemIds: [itemId] })
    console.log('✅ CMS item published')
  } catch (err) {
    if (/403|scopes|forbidden/i.test(err.message)) {
      console.log('⚠️  CMS item publish skip — Designer → CMS → Publish item')
    } else if (err.status === 429) {
      console.log('⚠️  CMS item publish rate-limited — 1-2 min baad Webflow me manually Publish dabao')
    } else {
      console.log(`⚠️  CMS item publish: ${err.message}`)
    }
  }

  let sitePublished = false
  try {
    await apiRetry('POST', `/sites/${siteId}/publish`, {
      publishToWebflowSubdomain: true,
      customDomains: [],
    })
    sitePublished = true
    console.log('✅ Site published')
  } catch (err) {
    if (/403|scopes|forbidden/i.test(err.message)) {
      console.log('⚠️  Full site publish skip (sites:write scope chahiye)')
      console.log('   Webflow Designer → top-right Publish dabao')
    } else if (err.status === 429) {
      console.log('⚠️  Site publish rate-limited (429) — CMS item ban chuka hai')
      console.log('   1-2 minute wait → Webflow dashboard → Publish site manually')
    } else {
      throw err
    }
  }

  console.log(`\n🌐 Webflow site: ${liveUrl}`)
  console.log(`   CMS item ID: ${itemId}`)
  console.log(`   Slug: ${PROMO.slug} → ${liveUrl}/${PROMO.slug} (agar CMS page bind hai)`)
  console.log(`   Promo code: ${PROMO.promoCode}`)
  if (!sitePublished) {
    console.log('\n✅ CMS ready — site publish pending (manual ya 2 min baad dubara npm run webflow:publish)')
  }
  console.log('\nNote: Agar naya subdomain chahiye (jaise sunlupromocodes.webflow.io),')
  console.log('Webflow dashboard me gummysearch template duplicate karo, phir us site ka ID .env me daalo.')
} catch (err) {
  console.error('❌ Publish failed:', err.message)
  if (/field/i.test(err.message)) {
    console.error('\nCMS field names match nahi kar rahe. Collection me ye fields banao:')
    console.error('  h1-heading, subheading, coupon-code, discount-display, affiliate-url, seo-title, seo-description')
  }
  if (/403|scopes|forbidden/i.test(err.message)) {
    console.error('\n🔑 Token me ye scopes ON karo (Site Settings → API token):')
    console.error('  sites:read, sites:write, cms:read, cms:write')
  }
  if (err.status === 429) {
    console.error('\n⏳ Webflow rate limit — 60-90 sec wait karke dubara: npm run webflow:publish')
    process.exit(0)
  }
  process.exit(1)
}
