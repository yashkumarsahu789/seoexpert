#!/usr/bin/env node
/** Write deploy batch args for MCP whtml_builder */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const batch = Number(process.argv[2] || 1)
const data = JSON.parse(
  readFileSync(resolve(WEBFLOW_ROOT, `coupon-sites/deploy-batch${batch}.json`), 'utf8')
)
const payload = {
  siteId: '6a3c3b9da2a3e297d10a1f21',
  pageId: '6a3c3ba0a2a3e297d10a1fff',
  actions: data,
}
writeFileSync(resolve(WEBFLOW_ROOT, `coupon-sites/mcp-batch${batch}-args.json`), JSON.stringify(payload), 'utf8')
console.log(`Wrote mcp-batch${batch}-args.json (${data.length} actions)`)
