#!/usr/bin/env node
/** Test which Webflow API scopes the current .env token actually has */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

const root = WEBFLOW_ROOT

loadEnv()

const token =
  process.env.WEBFLOW_API_KEY ||
  process.env.WEBFLOW_API_TOKEN ||
  process.env.demositetoken ||
  process.env.WEBFLOW_SITE_TOKEN ||
  ''
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || ''
const collectionId = process.env.WEBFLOW_COUPON_COLLECTION_ID || ''

if (!token) {
  console.error('❌ WEBFLOW_API_KEY ya demositetoken missing in .env')
  process.exit(1)
}

const tokenSource = process.env.WEBFLOW_API_KEY
  ? 'WEBFLOW_API_KEY'
  : process.env.demositetoken
    ? 'demositetoken'
    : 'WEBFLOW_API_TOKEN'

const isV2 = token.startsWith('ws-')
const mask = token.length > 12 ? `${token.slice(0, 6)}…${token.slice(-4)}` : '(too short)'

console.log('Webflow token diagnostic\n')
console.log(`Token from: ${tokenSource}`)
console.log(`Format: ${isV2 ? 'v2 site token (ws-…)' : 'legacy / project key (64-char hex?)'}`)
console.log(`Token: ${mask} (${token.length} chars)`)
console.log(`Site ID: ${siteId || '(missing)'}`)
console.log(`Collection ID: ${collectionId || '(missing)'}`)
if (process.env.requirement) {
  console.log(`\n⚠️  .env me "requirement=..." hai — ye Webflow scripts IGNORE karte hain.`)
  console.log('   Sirf WEBFLOW_API_KEY (ws-...) API auth ke liye use hota hai.')
}
console.log('')

const headers = { Authorization: `Bearer ${token}`, accept: 'application/json' }

async function probe(label, method, path, body, apiBase = 'https://api.webflow.com/v2') {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      method,
      headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let json = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { raw: text?.slice(0, 200) }
    }
    if (res.ok) {
      console.log(`✅ ${label} — OK (${res.status})`)
      return { ok: true, json }
    }
    const msg = json?.message || json?.err || text?.slice(0, 120) || res.statusText
    console.log(`❌ ${label} — ${res.status}: ${msg}`)
    return { ok: false, status: res.status, msg }
  } catch (err) {
    console.log(`❌ ${label} — network: ${err.message}`)
    return { ok: false }
  }
}

console.log('Scope probes (API v2):\n')
const v2Sites = await probe('sites:read (GET /sites)', 'GET', '/sites')
if (siteId) await probe('sites:read (GET /sites/{id})', 'GET', `/sites/${siteId}`)
if (collectionId) await probe('cms:read (GET /collections/{id})', 'GET', `/collections/${collectionId}`)
if (siteId) {
  await probe('sites:write probe (publish)', 'POST', `/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: true,
    customDomains: [],
  })
}

if (!v2Sites?.ok && !isV2) {
  console.log('\nLegacy key — trying API v1 (deprecated, may still work on some sites):\n')
  const v1Headers = { Authorization: `Bearer ${token}`, 'accept-version': '1.0.0', accept: 'application/json' }
  async function probeV1(label, method, path) {
    try {
      const res = await fetch(`https://api.webflow.com${path}`, { method, headers: v1Headers })
      const text = await res.text()
      let json = null
      try { json = text ? JSON.parse(text) : null } catch { json = { raw: text?.slice(0, 200) } }
      if (res.ok) {
        console.log(`✅ v1 ${label} — OK (${res.status})`)
        return { ok: true, json }
      }
      const msg = json?.msg || json?.message || text?.slice(0, 120) || res.statusText
      console.log(`❌ v1 ${label} — ${res.status}: ${msg}`)
      return { ok: false }
    } catch (err) {
      console.log(`❌ v1 ${label} — network: ${err.message}`)
      return { ok: false }
    }
  }
  await probeV1('sites list', 'GET', '/sites')
  if (siteId) await probeV1('site info', 'GET', `/sites/${siteId}`)
  if (collectionId) await probeV1('collection', 'GET', `/collections/${collectionId}`)
  console.log('\n⚠️  v1 API band ho chuka hai (Jan 2025). Publish script ko v2 ws-… token chahiye.')
}

console.log('\n---')
if (tokenSource === 'WEBFLOW_API_KEY' && process.env.demositetoken && process.env.demositetoken !== token) {
  console.log('💡 .env me demositetoken bhi hai — abhi WEBFLOW_API_KEY use ho raha hai.')
  console.log('   Naya key test karne ke liye WEBFLOW_API_KEY ki value demositetoken se replace karo.')
}

const anyOk = v2Sites?.ok
if (!anyOk) {
  console.log('\n🔴 API probes fail — token kaam nahi karega.')
} else {
  console.log('\n✅ Token kaam kar raha hai — agar site 404 aaye to WEBFLOW_MASTER_SITE_ID galat hai.')
  console.log('   Sahi ID: npm run webflow:check')
}

if (!anyOk) {
console.log('━━━ Agar token banate waqt CMS/Sites ki ROW hi nahi dikhti ━━━')
console.log('   Ye permissions KAHI AUR SE nahi milti — sirf Site Admin ko')
console.log('   sahi page par token banate waqt milti hain.')
console.log('')
console.log('   Tumhe khud se option nahi milega agar:')
console.log('   • Role = Editor / Designer / Content (Site Administrator nahi)')
console.log('   • Token Workspace / Account settings se bana (site settings nahi)')
console.log('')
console.log('   Kya karo:')
console.log('   1) Workspace owner se Site Administrator role mango, YA')
console.log('   2) Owner se token banwa ke do — CMS + Sites = Read & Write')
console.log('   3) Ya API chhod do — /webflow/demo se manually Webflow me copy karo')
console.log('')
console.log('   Sahi page (Site Admin ke liye):')
console.log('   demosite → ⚙ Site settings → Apps & integrations → scroll neeche → API access')
console.log('')
console.log('━━━ Agar table DIKHE (admin ho) to ye select karo ━━━')
console.log('   Sites = Read & Write · CMS = Read & Write · phir Generate')
}
