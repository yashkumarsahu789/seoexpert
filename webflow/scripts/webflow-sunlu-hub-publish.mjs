#!/usr/bin/env node
/** Publish Sunlu Promo Hub + fix SEO (free plan — UI text needs Designer MCP) */
import { loadEnv } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY || ''
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || '6a3d69ff41d6f793eb3d5952'
const pageId = process.env.WEBFLOW_HOME_PAGE_ID || '6a3d6a0241d6f793eb3d598f'
const siteShort = process.env.WEBFLOW_SITE_SHORT_NAME || 'sunlu-promo-hub'
const shopUrl = process.env.VITE_SHOP_BASE_URL || 'https://shop.LifeSolveNow.com'

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
    'Use Sunlu promo code KANNY for 10% discount on your products. Shop Sunlu 3D printing filaments and save today.',
}

console.log('Sunlu Promo Hub publish\n')

try {
  await api('PUT', `/pages/${pageId}`, {
    seo: SEO,
    openGraph: {
      title: 'Sunlu Promo Code KANNY — 10% Off On Your Products',
      description: 'Use Sunlu promo code KANNY for 10% discount on your products.',
      titleCopied: false,
      descriptionCopied: false,
    },
  })
  console.log('✅ SEO updated')

  await api('POST', `/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: true,
    customDomains: [],
  })
  console.log('✅ Site published')
  console.log(`\n🌐 https://${siteShort}.webflow.io`)
  console.log(`🛒 Shop CTA link: ${shopUrl}`)
} catch (err) {
  console.error('❌', err.message)
  if (/403|scopes/i.test(err.message)) {
    console.error('Token me sites:write + pages:write chahiye')
  }
  process.exit(1)
}
