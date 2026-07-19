#!/usr/bin/env node
/**
 * Prepare full gummy clone deploy: fix URLs, extract body HTML, split CSS for WHTML.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

loadEnv()

const root = WEBFLOW_ROOT
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || '6a3d69ff41d6f793eb3d5952'
const pageId = process.env.WEBFLOW_HOME_PAGE_ID || '6a3d6a0241d6f793eb3d598f'
const siteUrl = `https://${process.env.WEBFLOW_SITE_SHORT_NAME || 'sunlu-promo-hub'}.webflow.io`

// Rebuild page from reference if needed
let html = readFileSync(resolve(root, 'coupon-sites/sunlu-gummy-page.html'), 'utf8')
html = html
  .replace(/https:\/\/demosite-57cbb8\.webflow\.io/g, siteUrl)
  .replace(/demosite-57cbb8\.webflow\.io/g, siteUrl.replace(/^https:\/\//, ''))

const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
if (!bodyMatch) throw new Error('No body in sunlu-gummy-page.html')
const bodyInner = bodyMatch[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<meta[^>]*>/gi, '')
  .trim()

writeFileSync(resolve(root, 'coupon-sites/sunlu-gummy-body.html'), bodyInner, 'utf8')

const css = readFileSync(resolve(root, 'coupon-sites/reference-gummy.css'), 'utf8')
// Custom classes only (skip webflow defaults) — lines with our class names
const customPrefixes = [
  'hero-section', 'div-block', 'heading-', 'paragraph-', 'button-', 'image-',
  'navbar-', 'nav-', 'team-', 'section-', 'footer-', 'rich-text', 'link-',
  'container-', 'bold-text', 'text-block', 'menu-button', 'mobile-margin',
  'body-copy', 'video-2', 'heading-10', 'heading-13', 'heading-6',
]
const lines = css.split('\n')
const customRules = []
let buf = ''
let inRule = false
for (const line of lines) {
  if (line.match(/^\.(w-|html|body|\*)/) && !line.match(new RegExp(`^\\.(${customPrefixes.map((p) => p.replace(/-/g, '\\-')).join('|')})`))) {
    if (inRule && buf) { customRules.push(buf); buf = '' }
    inRule = false
    continue
  }
  if (line.match(new RegExp(`^\\.(${customPrefixes.map((p) => p.replace(/-/g, '\\-')).join('|')})`)) || (inRule && buf)) {
    inRule = true
    buf += line + '\n'
    if (line.includes('}') && !line.includes('{')) {
      customRules.push(buf)
      buf = ''
      inRule = false
    }
  }
}
const customCss = customRules.join('\n')
writeFileSync(resolve(root, 'coupon-sites/sunlu-gummy-custom.css'), customCss, 'utf8')

// Split body into injectable chunks (max ~5000 chars each, at section boundaries)
const sections = bodyInner.split(/(?=<(?:section|div class="navbar))/).filter(Boolean)
const batches = []
let batch = []
let batchLen = 0
for (const sec of sections) {
  if (batch.length >= 4 || (batchLen + sec.length > 15000 && batch.length)) {
    batches.push(batch)
    batch = []
    batchLen = 0
  }
  batch.push(sec)
  batchLen += sec.length
}
if (batch.length) batches.push(batch)

const parent = { component: pageId, element: '6a3d6a3da70c9e3077b63e2a' }
const mcpBatches = batches.map((secs, i) => ({
  siteId,
  pageId,
  actions: secs.map((sec, j) => ({
    build_label: `full-${i}-${j}`,
    parent_element_id: parent,
    creation_position: 'append',
    html: sec.startsWith('<') ? sec : `<div>${sec}</div>`,
    ...(i === 0 && j === 0 ? { css: customCss.slice(0, 50000) } : {}),
  })),
}))

writeFileSync(resolve(root, 'coupon-sites/full-deploy-meta.json'), JSON.stringify({
  siteId,
  pageId,
  siteUrl,
  bodyChars: bodyInner.length,
  customCssChars: customCss.length,
  batchCount: mcpBatches.length,
  sectionCount: sections.length,
}, null, 2))

mcpBatches.forEach((b, i) => {
  writeFileSync(resolve(root, `coupon-sites/full-deploy-batch-${i}.json`), JSON.stringify(b))
})

// Image URLs to upload
const imgUrls = [...new Set([...bodyInner.matchAll(/src="(https:\/\/cdn\.prod\.website-files\.com[^"]+)"/g)].map((m) => m[1]))]
writeFileSync(resolve(root, 'coupon-sites/gummy-image-urls.json'), JSON.stringify(imgUrls, null, 2))
console.log(`body: ${bodyInner.length} chars, css: ${customCss.length}, batches: ${mcpBatches.length}, images: ${imgUrls.length}`)
