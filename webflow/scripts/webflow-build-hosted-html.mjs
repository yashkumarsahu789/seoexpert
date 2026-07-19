#!/usr/bin/env node
/**
 * Build navbar + hero HTML with site-hosted asset URLs (for MCP reinject).
 * Run: node scripts/webflow-build-hosted-html.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const map = JSON.parse(readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/gummy-asset-map.json'), 'utf8'))
const { chunks } = JSON.parse(readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-chunks.json'), 'utf8'))

function swapUrls(html) {
  let out = html
  for (const [oldUrl, info] of Object.entries(map)) {
    out = out.split(oldUrl).join(info.hostedUrl)
    out = out.split(encodeURI(oldUrl)).join(info.hostedUrl)
  }
  // promo banner fallback → hero image
  const hero = map['https://cdn.prod.website-files.com/67dba71ac8e801b28e37d78b/67dba8957cf317b25e17aa16_dfdfdfdfdf.png']?.hostedUrl
  if (hero) {
    out = out.replace(/67dbac4c0a49e10271145451[^"']+/g, hero.split('/').pop())
    out = out.replace(/67dba89616c86faf39dc84d8[^"']+/g, hero.split('/').pop())
  }
  return out
}

const hosted = chunks.map((c) => ({ name: c.name, html: swapUrls(c.html) }))
writeFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-hosted-chunks.json'), JSON.stringify({ chunks: hosted }, null, 2))
console.log('Hosted chunks written:', hosted.map((c) => c.name).join(', '))
