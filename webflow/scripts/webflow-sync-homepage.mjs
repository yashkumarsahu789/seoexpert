#!/usr/bin/env node
/**
 * Build MCP whtml payloads from coupon-sites/sunlu-gummy-page.html for live deploy.
 * Run: node scripts/webflow-sync-homepage.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const siteId = '6a3d69ff41d6f793eb3d5952'
const pageId = '6a3d6a0241d6f793eb3d598f'
const parent = { component: pageId, element: '6a3d6a3da70c9e3077b63e2a' }

const html = readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-page.html'), 'utf8')
const css = readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-responsive-mcp.css'), 'utf8')
const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
if (!bodyMatch) throw new Error('No body in sunlu-gummy-page.html')

const body = bodyMatch[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<meta[^>]*>/gi, '')
  .trim()

const couponMatch = body.match(/<div class="sunlu-coupon-sticky"[\s\S]*?<\/div><\/div>/)
const couponHtml = couponMatch ? couponMatch[0] : ''
const rest = couponHtml ? body.replace(couponHtml, '').trim() : body

const { chunks } = JSON.parse(
  readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-chunks.json'), 'utf8')
)

const gummyLink =
  '<link rel="stylesheet" href="https://cdn.prod.website-files.com/67dba71ac8e801b28e37d78b/css/gummysearchpromocodes.webflow.f0e392e4b.css" class="sunlu-gummy-stylesheet">'

const actions = [
  {
    build_label: 'gummy-stylesheet',
    parent_element_id: parent,
    creation_position: 'prepend',
    html: gummyLink,
  },
  {
    build_label: 'coupon-bar',
    parent_element_id: parent,
    creation_position: 'prepend',
    html: couponHtml || '<div class="sunlu-responsive-hook" aria-hidden="true"></div>',
    css,
  },
  ...chunks.map((c) => ({
    build_label: c.name,
    parent_element_id: parent,
    creation_position: 'append',
    html: c.html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<meta[^>]*>/gi, ''),
  })),
]

const batches = []
for (let i = 0; i < actions.length; i += 5) batches.push(actions.slice(i, i + 5))

batches.forEach((batch, i) => {
  writeFileSync(
    resolve(WEBFLOW_ROOT, `coupon-sites/sync-batch-${i}.json`),
    JSON.stringify({ siteId, pageId, actions: batch })
  )
})

writeFileSync(
  resolve(WEBFLOW_ROOT, 'coupon-sites/sync-deploy.json'),
  JSON.stringify({ siteId, pageId, batchCount: batches.length, actions: actions.length, restChars: rest.length })
)
console.log(`✅ ${actions.length} actions in ${batches.length} batches → coupon-sites/sync-batch-*.json`)
