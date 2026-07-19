#!/usr/bin/env node
/** Set Home page SEO on Webflow (client rank check — title + meta via API) */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

const root = WEBFLOW_ROOT

loadEnv()

const token = process.env.WEBFLOW_API_KEY || process.env.demositetoken || ''
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || ''

const SEO = {
  title: 'Sunlu Promo Code KANNY — 10% OFF On Your Products',
  description:
    'Use Sunlu promo code KANNY at checkout for 10% off. Copy coupon code, shop Sunlu products, and save today.',
}

if (!token || !siteId) {
  console.error('❌ WEBFLOW_API_KEY + WEBFLOW_MASTER_SITE_ID required')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  accept: 'application/json',
}

async function api(method, path, body) {
  const res = await fetch(`https://api.webflow.com/v2${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
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

try {
  const { pages } = await api('GET', `/sites/${siteId}/pages`)
  const home = pages?.find((p) => p.slug === '' || p.slug === '/' || p.title?.toLowerCase() === 'home') || pages?.[0]
  if (!home?.id) {
    console.error('❌ No pages found')
    process.exit(1)
  }

  console.log(`Page: ${home.title || home.slug || 'Home'} (${home.id})`)

  await api('PUT', `/pages/${home.id}`, {
    seo: { title: SEO.title, description: SEO.description },
    openGraph: {
      title: SEO.title,
      description: SEO.description,
      titleCopied: false,
      descriptionCopied: false,
    },
  })
  console.log('✅ SEO title + meta updated')

  await api('POST', `/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: true,
    customDomains: [],
  })
  console.log('✅ Site published')
  console.log(`\nClient URL: https://${process.env.WEBFLOW_SITE_SHORT_NAME || 'demosite-57cbb8'}.webflow.io`)
  console.log('Rank note: Google indexing 1–14 days — Search Console me URL submit karo')
} catch (err) {
  console.error('❌', err.message)
  if (/403|scopes/i.test(err.message)) {
    console.error('Token me pages:write chahiye — project key me Pages = Read & Write')
  }
  process.exit(1)
}
