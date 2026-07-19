#!/usr/bin/env node
/**
 * Assign gummy images via Designer MCP — requires Designer tab open.
 * Generates coupon-sites/image-assign-actions.json from asset map + element query.
 *
 * Usage: open Designer, then run MCP with generated actions.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const mapPath = resolve(WEBFLOW_ROOT, 'coupon-sites/gummy-asset-map.json')
const map = JSON.parse(readFileSync(mapPath, 'utf8'))

/** Map original CDN URL substring → assetId for set_image_asset */
const byKey = Object.fromEntries(
  Object.entries(map).map(([url, info]) => {
    const key = url.split('/').pop().split('.')[0].slice(0, 20)
    return [key, info.assetId]
  })
)

writeFileSync(
  resolve(WEBFLOW_ROOT, 'coupon-sites/image-asset-ids.json'),
  JSON.stringify({ byKey, map }, null, 2)
)
console.log('Asset IDs ready:', Object.keys(map).length)
console.log('Designer must be open — use set_image_asset on each Image element.')
