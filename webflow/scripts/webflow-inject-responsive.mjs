#!/usr/bin/env node
/** Build MCP payloads for responsive CSS + coupon bar injection */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const siteId = '6a3d69ff41d6f793eb3d5952'
const pageId = '6a3d6a0241d6f793eb3d598f'
const parent = { component: pageId, element: '6a3d6a3da70c9e3077b63e2a' }
const css = readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-responsive-coupon.css'), 'utf8')
const shop = 'https://shop.LifeSolveNow.com'

const couponHtml = `<div class="sunlu-coupon-sticky" role="region" aria-label="Promo code"><div class="sunlu-coupon-inner"><span>10% off — use code <span class="sunlu-coupon-code">KANNY</span> at checkout</span><button type="button" class="sunlu-copy-btn" onclick="(function(b){var c='KANNY';if(navigator.clipboard&amp;&amp;navigator.clipboard.writeText){navigator.clipboard.writeText(c).then(function(){b.textContent='Copied!';setTimeout(function(){b.textContent='Copy code'},2500)}).catch(function(){prompt('Copy promo code:',c)})}else{prompt('Copy promo code:',c)}})(this)">Copy code</button><a href="${shop}" target="_blank" rel="noopener" class="sunlu-shop-btn">Shop Sunlu</a></div></div>`

const cssChunks = []
const size = 12000
for (let i = 0; i < css.length; i += size) cssChunks.push(css.slice(i, i + size))

const actions = [
  {
    build_label: 'coupon-bar',
    parent_element_id: parent,
    creation_position: 'prepend',
    html: couponHtml,
    css: cssChunks[0] || '',
  },
  ...cssChunks.slice(1).map((chunk, i) => ({
    build_label: `responsive-css-${i + 2}`,
    parent_element_id: parent,
    creation_position: 'prepend',
    html: '<div class="sunlu-responsive-hook" aria-hidden="true"></div>',
    css: chunk,
  })),
]

writeFileSync(
  resolve(WEBFLOW_ROOT, 'coupon-sites/inject-responsive.json'),
  JSON.stringify({ siteId, pageId, actions })
)
console.log(`Wrote inject-responsive.json — ${actions.length} actions, ${css.length} css chars`)
