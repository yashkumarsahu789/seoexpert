#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const { chunks } = JSON.parse(
  readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-gummy-chunks.json'), 'utf8')
)
const parent = { component: '6a3c3ba0a2a3e297d10a1fff', element: '6a3c3ba0a2a3e297d10a2004' }

for (const c of chunks) {
  if (c.name === 'navbar') continue // already deployed
  writeFileSync(
    resolve(WEBFLOW_ROOT, `coupon-sites/chunk-${c.name}.json`),
    JSON.stringify({
      build_label: c.name,
      parent_element_id: parent,
      creation_position: 'append',
      html: c.html,
    }),
    'utf8'
  )
}
console.log('Wrote chunk files (except navbar)')
