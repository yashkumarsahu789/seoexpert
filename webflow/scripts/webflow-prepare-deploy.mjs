#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const root = WEBFLOW_ROOT
const { chunks } = JSON.parse(readFileSync(resolve(root, 'coupon-sites/sunlu-gummy-chunks.json'), 'utf8'))
const parent = { component: '6a3c3ba0a2a3e297d10a1fff', element: '6a3c3ba0a2a3e297d10a2004' }

const batch1 = chunks.slice(0, 5).map((c, i) => ({
  build_label: c.name,
  parent_element_id: parent,
  creation_position: 'append',
  html: c.html,
  ...(i === 0
    ? {
        css: "@import url('https://cdn.prod.website-files.com/67dba71ac8e801b28e37d78b/css/gummysearchpromocodes.webflow.f0e392e4b.css');",
      }
    : {}),
}))

const batch2 = chunks.slice(5).map((c) => ({
  build_label: c.name,
  parent_element_id: parent,
  creation_position: 'append',
  html: c.html,
}))

writeFileSync(resolve(root, 'coupon-sites/deploy-batch1.json'), JSON.stringify(batch1))
writeFileSync(resolve(root, 'coupon-sites/deploy-batch2.json'), JSON.stringify(batch2))
console.log('Prepared deploy batches:', batch1.length, batch2.length)
