#!/usr/bin/env node
/**
 * Inject sunlu-gummy-chunks via Webflow Data API + publish.
 * Uses WEBFLOW_API_KEY from .env — run: node scripts/webflow-inject-chunks.mjs
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || '6a3d69ff41d6f793eb3d5952'
const pageId = process.env.WEBFLOW_HOME_PAGE_ID || '6a3d6a0241d6f793eb3d598f'

const { chunks, headLinks } = JSON.parse(
  readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-chunks.json'), 'utf8')
)
const customCss = readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-custom.css'), 'utf8')

const parent = { component: pageId, element: '6a3d6a3da70c9e3077b63e2a' }

async function api(method, path, body) {
  const res = await fetch(`https://api.webflow.com/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${json?.message || text}`)
  return json
}

// Try page custom code head (stylesheet)
async function tryPageHead() {
  try {
    await api('PUT', `/pages/${pageId}/custom_code`, {
      head: headLinks,
      footer: '',
    })
    console.log('✅ Page head custom code set')
    return true
  } catch (e) {
    console.warn('⚠️ Page head custom code:', e.message)
    return false
  }
}

// Note: WHTML injection requires Designer MCP — this script publishes + sets SEO/head only.
async function main() {
  console.log('Sunlu full gummy inject helper\n')
  await tryPageHead()

  await api('PUT', `/pages/${pageId}`, {
    seo: {
      title: 'Sunlu Promo Code "KANNY" Flat 10% Off On Your Products.',
      description:
        'Use Sunlu promo code KANNY for 10% discount on your products. Shop Sunlu 3D printing filaments and save today.',
    },
  })
  console.log('✅ SEO updated')

  await api('POST', `/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: true,
    customDomains: [],
  })
  console.log('✅ Published')
  console.log(`\nChunks ready for MCP (${chunks.length} sections, ${customCss.length} css chars)`)
  console.log('Designer MCP must inject chunks if page body is empty.')
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
