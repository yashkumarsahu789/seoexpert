#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const COMPONENT = '6a3d6a0241d6f793eb3d598f'

const map = {
  'd46daccb-a3b9-84f3-04a8-e8aed00b5aa9': 'Exclusive Sunlu promo — limited time',
  'd46daccb-a3b9-84f3-04a8-e8aed00b5aaa': 'Get 10% off with code KANNY',
  'd46daccb-a3b9-84f3-04a8-e8aed00b5aab':
    'Apply code KANNY at checkout for 10% off your Sunlu products — filaments, resins, printers, and accessories.',
  '6728b7a1-e84e-2206-057b-35a8f2696fe8': 'Makers who trust Sunlu',
  '6728b7a1-e84e-2206-057b-35a8f2696fe9':
    'Thousands of makers worldwide use Sunlu filaments and accessories for reliable 3D printing results.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b054': 'Shop Sunlu now',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b055': 'Supercharge your 3D printing',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b056':
    'Apply code KANNY at checkout for 10% off Sunlu products. Browse filaments, printers, and maker essentials.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b057': 'Premium Filaments',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b058': 'PLA, PETG, ABS, and specialty filaments for every print job.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b059': '3D Printers',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b05a': 'Reliable printers and upgrades for home and workshop use.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b05b': 'Accessories',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b05c': 'Nozzles, build plates, and parts to keep prints running smooth.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b05d': 'Deals & Bundles',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b05e': 'Save more with bundles — plus 10% off with code KANNY.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b05f': 'Premium Filaments',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b060': 'Browse Sunlu filaments by material, color, and diameter.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b061':
    'Compare printer specs and bundle options. Find gear that matches your budget.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b062': '3D Printers',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b063': 'Pick the right printer for your workspace and print volume.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b064':
    'Stock up on nozzles, beds, and tools. Keep your setup ready for the next print.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b065': 'Accessories',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b066':
    'Stock up on nozzles, beds, and tools. Keep your setup ready for the next print.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b067':
    'Check active promo codes and clearance items. Stack savings with code KANNY.',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b068': 'Deals & Bundles',
  '7d27ef86-c2b3-cfe6-5bdb-27972600b069':
    'Check active promo codes and clearance items. Stack savings with code KANNY at checkout.',
  '80a461af-3676-91de-354f-f9d73b01d16a':
    'Sunlu filaments print smooth every time. KANNY code saved me 10% on my first order.',
  '80a461af-3676-91de-354f-f9d73b01d170':
    'Great quality PLA and PETG — consistent diameter and vibrant colors on every spool.',
  '80a461af-3676-91de-354f-f9d73b01d173':
    'Fast delivery and easy checkout. Applied KANNY and got 10% off my entire order.',
  '80a461af-3676-91de-354f-f9d73b01d179':
    'We order Sunlu supplies for our print farm. Solid value with promo code KANNY.',
  'f50b367c-9944-7137-4376-ab9fbe997b84': 'Get exclusive 3D printing offers',
  'f50b367c-9944-7137-4376-ab9fbe997b87': 'Join for fresh Sunlu deals, promo codes, and maker tips.',
}

const actions = Object.entries(map).map(([element, text], i) => ({
  label: `fix-${i}`,
  set_text: { id: { component: COMPONENT, element }, text },
}))

const batches = []
for (let i = 0; i < actions.length; i += 10) {
  batches.push(actions.slice(i, i + 10))
}

writeFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/mcp-text-batches.json'), JSON.stringify(batches), 'utf8')
console.log(`${actions.length} updates in ${batches.length} batches`)
