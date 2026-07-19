#!/usr/bin/env node
/**
 * Sync coupon-sites/index.json after export (source of truth: coupon-sites/, NOT tools/)
 * Usage: npm run webflow:export && npm run webflow:host
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

const root = WEBFLOW_ROOT
const slug = 'sunlu-kanny-promo'
const couponDir = resolve(root, 'coupon-sites')
const htmlPath = resolve(couponDir, `${slug}.html`)
const indexPath = resolve(couponDir, 'index.json')
const configPath = resolve(couponDir, 'sunlu-kanny.json')

loadEnv()

if (!existsSync(htmlPath)) {
  console.error('❌ Pehle: npm run webflow:export')
  process.exit(1)
}

const publicBase = (
  process.env.COUPON_SITES_PUBLIC_BASE ||
  process.env.VITE_COUPON_SITES_PUBLIC_BASE ||
  'https://shop.LifeSolveNow.com/coupon-sites'
).replace(/\/$/, '')

const liveUrl = `${publicBase}/${slug}.html`

let registry = { updated_at: new Date().toISOString(), public_base: publicBase, sites: [] }
if (existsSync(indexPath)) {
  try {
    registry = JSON.parse(readFileSync(indexPath, 'utf8'))
  } catch {
    /* reset */
  }
}

const entry = {
  slug,
  brand: 'Sunlu',
  promo_code: 'KANNY',
  discount: '10% OFF',
  page_type: 'coupon',
  html: `${slug}.html`,
  embed: 'webflow-home-embed.html',
  config: 'sunlu-kanny.json',
  public_url: liveUrl,
}
const sites = registry.sites || []
const idx = sites.findIndex((s) => s.slug === slug)
if (idx >= 0) sites[idx] = { ...sites[idx], ...entry }
else sites.push(entry)
registry.sites = sites
registry.public_base = publicBase
registry.updated_at = new Date().toISOString()
writeFileSync(indexPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8')

if (existsSync(configPath)) {
  try {
    const cfg = JSON.parse(readFileSync(configPath, 'utf8'))
    cfg.hosted = { ...cfg.hosted, public_url: liveUrl }
    writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8')
  } catch {
    /* optional */
  }
}

console.log('✅ coupon-sites/ registry updated\n')
console.log(`   Folder: coupon-sites/  (tools/ se alag)`)
console.log(`   HTML:   coupon-sites/${slug}.html`)
console.log(`   Live:   ${liveUrl}`)
console.log('')
console.log('Webflow FREE plan — Home page native Button link = upar wala URL')
