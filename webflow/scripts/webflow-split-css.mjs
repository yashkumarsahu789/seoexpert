#!/usr/bin/env node
/** Split sanitized gummy CSS into MCP-safe WHTML css injection chunks */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const css = readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-sanitized.css'), 'utf8')
const chunkSize = 14000
const parts = []
for (let i = 0; i < css.length; i += chunkSize) parts.push(css.slice(i, i + chunkSize))

const parent = { component: '6a3d6a0241d6f793eb3d598f', element: '6a3d6a3da70c9e3077b63e2a' }
const payloads = parts.map((part, i) => ({
  siteId: '6a3d69ff41d6f793eb3d5952',
  pageId: '6a3d6a0241d6f793eb3d598f',
  actions: [{
    build_label: `css-part-${i}`,
    parent_element_id: parent,
    creation_position: 'prepend',
    html: '<div class="gummy-css-hook" aria-hidden="true"></div>',
    css: part,
  }],
}))

payloads.forEach((p, i) => {
  writeFileSync(resolve(WEBFLOW_ROOT, `coupon-sites/css-chunk-${i}.json`), JSON.stringify(p))
})
console.log(`Wrote ${payloads.length} css chunks, sizes:`, payloads.map((p) => JSON.stringify(p).length).join(', '))
