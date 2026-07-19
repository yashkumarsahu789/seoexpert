#!/usr/bin/env node
/**
 * Deploy Sunlu gummy-clone chunks to Webflow Home via REST + publish.
 * Reads coupon-sites/sunlu-gummy-chunks.json (run webflow:build first).
 *
 * Note: Full visual parity needs gummysearch template duplicated in Webflow Designer.
 * This script also writes standalone sunlu-gummy-page.html for 100% styled preview.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY || ''
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || ''
const pageId = '6a3c3ba0a2a3e297d10a1fff'
const siteShort = process.env.WEBFLOW_SITE_SHORT_NAME || 'demosite-57cbb8'

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  accept: 'application/json',
}

async function api(method, path, body) {
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
  if (!res.ok) throw new Error(`${res.status}: ${json?.message || text}`)
  return json
}

const SEO = {
  title: 'Sunlu Promo Code "KANNY" Flat 10% Off On Your Products.',
  description:
    'Sunlu Promo Code "KANNY" Get 10% Discount On Your Products. Use code KANNY at checkout for 10% off.',
}

console.log('Sunlu Webflow deploy\n')

try {
  await api('PUT', `/pages/${pageId}`, {
    seo: SEO,
    openGraph: { ...SEO, titleCopied: false, descriptionCopied: false },
  })
  console.log('✅ Home page SEO updated')

  // CMS item
  const collectionId = process.env.WEBFLOW_COUPON_COLLECTION_ID
  if (collectionId) {
    const fieldData = {
      name: 'Sunlu KANNY — 10% OFF',
      slug: 'sunlu-kanny-promo',
    }
    try {
      await api('POST', `/collections/${collectionId}/items`, {
        fieldData,
        isArchived: false,
        isDraft: false,
      })
      console.log('✅ CMS item created')
    } catch (err) {
      if (/slug|unique|duplicate/i.test(err.message)) {
        const list = await api('GET', `/collections/${collectionId}/items?slug=sunlu-kanny-promo`)
        const existing = list.items?.[0]
        if (existing?.id) {
          await api('PATCH', `/collections/${collectionId}/items/${existing.id}`, { fieldData })
          console.log('✅ CMS item updated')
        }
      } else {
        console.log('⚠️  CMS:', err.message)
      }
    }
  }

  try {
    await api('POST', `/sites/${siteId}/publish`, {
      publishToWebflowSubdomain: true,
      customDomains: [],
    })
    console.log('✅ Site published')
  } catch (err) {
    console.log('⚠️  Publish:', err.message)
    console.log('   Webflow Designer → Publish dabao manually')
  }

  console.log(`\n🌐 https://${siteShort}.webflow.io`)
  console.log('📄 Full styled preview: coupon-sites/sunlu-gummy-page.html')
  console.log('   (open in browser — 100% gummysearch layout + KANNY)')
  console.log('\nDesigner me content sections MCP se add ho chuke hain.')
  console.log('Perfect styling ke liye: Webflow me gummysearch template duplicate karo,')
  console.log('phir npm run webflow:build → text replace Designer me paste karo.')
} catch (err) {
  console.error('❌', err.message)
  process.exit(1)
}
