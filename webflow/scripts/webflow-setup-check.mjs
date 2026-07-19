#!/usr/bin/env node
/**
 * Webflow API check — lists sites + collections (run locally with .env)
 * Usage: npm run webflow:check
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

const root = WEBFLOW_ROOT

loadEnv()

const token = process.env.WEBFLOW_API_KEY || process.env.WEBFLOW_API_TOKEN || ''

if (!token) {
  console.error('❌ WEBFLOW_API_KEY missing in .env')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  accept: 'application/json',
}

async function api(path) {
  const res = await fetch(`https://api.webflow.com/v2${path}`, { headers })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const msg = json?.message || json?.err || text || res.statusText
    const err = new Error(`${res.status} ${path}: ${msg}`)
    err.status = res.status
    err.body = json
    throw err
  }
  return json
}

console.log('Webflow API check\n')

try {
  let sitesOk = false
  let sites = []
  try {
    const data = await api('/sites')
    sites = data.sites || []
    sitesOk = true
    if (!sites?.length) {
      console.log('⚠️  Koi site nahi mili is token ke saath.')
      console.log('   Webflow dashboard → Site banao ya duplicate karo (gummysearch template).')
      process.exit(1)
    }

    console.log(`✅ ${sites.length} site(s) found:\n`)
    for (const s of sites) {
      console.log(`  • ${s.displayName || s.name}`)
      console.log(`    Site ID: ${s.id}`)
      console.log(`    Subdomain: https://${s.shortName}.webflow.io`)
      console.log('')
    }
  } catch (err) {
    if (err.status === 403 && /scopes/i.test(String(err.message))) {
      console.log('⚠️  sites:read scope missing — site list skip\n')
      console.log('Token me cms:read + cms:write ho to collection check try karte hain...\n')
    } else {
      throw err
    }
  }

  const collectionId = process.env.WEBFLOW_COUPON_COLLECTION_ID || ''
  const siteId = process.env.WEBFLOW_MASTER_SITE_ID || ''

  if (collectionId) {
    try {
      const col = await api(`/collections/${collectionId}`)
      console.log(`✅ Collection OK: ${col.displayName || col.slug}`)
      console.log(`   Collection ID: ${col.id}`)
      if (col.fields?.length) {
        console.log('   Fields:', col.fields.map((f) => f.slug || f.displayName).join(', '))
      }
      console.log('')
    } catch (err) {
      console.log(`❌ Collection check failed: ${err.message}\n`)
    }
  }

  if (!sitesOk) {
    console.log('---')
    console.log('Site ID manually copy karo (24-char hex):')
    console.log('  Webflow → Site Settings → General → Overview → Site ID')
    console.log('\n.env example:')
    console.log('WEBFLOW_MASTER_SITE_ID=674abc123def456789012345')
    console.log('WEBFLOW_SITE_SHORT_NAME=demosite-57cbb8')
    console.log('WEBFLOW_COUPON_COLLECTION_ID=' + (collectionId || '6a3c3ce...'))
    console.log('\nToken scopes: sites:read, sites:write, cms:read, cms:write')
    process.exit(siteId && /^[a-f0-9]{24}$/i.test(siteId) ? 0 : 1)
  }

  const resolvedSiteId =
    siteId && /^[a-f0-9]{24}$/i.test(siteId) && sites?.some((s) => s.id === siteId)
      ? siteId
      : sites[0].id
  console.log(`Collections for site ${resolvedSiteId}:\n`)

  try {
    const { collections } = await api(`/sites/${resolvedSiteId}/collections`)
    if (!collections?.length) {
      console.log('  (no CMS collections — Designer me Collection banao)')
    } else {
      for (const c of collections) {
        console.log(`  • ${c.displayName || c.slug}`)
        console.log(`    Collection ID: ${c.id}`)
        console.log(`    slug: ${c.slug}`)
        console.log('')
      }
    }
  } catch (err) {
    console.log(`  ⚠️  Collections: ${err.message}`)
  }

  console.log('---')
  console.log('.env me ye set karo:')
  console.log(`WEBFLOW_MASTER_SITE_ID=${resolvedSiteId}`)
  const short = sites.find((s) => s.id === resolvedSiteId)?.shortName || sites[0]?.shortName
  if (short) {
    console.log(`WEBFLOW_SITE_SHORT_NAME=${short}`)
    console.log(`# Live URL: https://${short}.webflow.io`)
  }
  console.log('\nPhir: npm run webflow:publish')
} catch (err) {
  console.error('❌', err.message)
  if (err.status === 403 && /scopes/i.test(String(err.message))) {
    console.error('\n🔑 Naya API token banao — Site Settings → Apps & Integrations → Generate API token')
    console.error('   Ye scopes ON karo:')
    console.error('   • sites:read')
    console.error('   • sites:write')
    console.error('   • cms:read')
    console.error('   • cms:write')
    console.error('\n   Purana token revoke karo, naya ws-... token .env me WEBFLOW_API_KEY= me daalo')
  } else {
    console.error('\nToken invalid/expired ho sakta hai — Webflow → Site Settings → API access')
  }
  if (process.env.WEBFLOW_MASTER_SITE_ID?.includes('-') && !/^[a-f0-9]{24}$/i.test(process.env.WEBFLOW_MASTER_SITE_ID)) {
    console.error('\n⚠️  WEBFLOW_MASTER_SITE_ID galat lag raha hai (demosite-57cbb8 = subdomain slug, Site ID nahi)')
    console.error('   Site Settings → General → Overview → Site ID (24-char hex) copy karo')
  }
  process.exit(1)
}
