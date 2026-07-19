import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { WEBFLOW_ROOT } from './load-env.mjs'

const css = readFileSync(
  resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-responsive-site.css'),
  'utf8'
)

const pageId = '6a3d6a0241d6f793eb3d598f'
const siteId = '6a3d69ff41d6f793eb3d5952'
const parent = { component: pageId, element: '6a3d6a3da70c9e3077b63e2a' }

const whtml = {
  siteId,
  pageId,
  actions: [
    {
      build_label: 'responsive-site-css',
      parent_element_id: parent,
      creation_position: 'prepend',
      html: '<div class="sunlu-responsive-hook" aria-hidden="true"></div>',
      css,
    },
  ],
}

const headContent = `<style id="sunlu-responsive-site">\n${css}\n</style>`

const scripts = {
  actions: [
    {
      label: 'page-head-css',
      set_page_freeform_code: {
        page_id: pageId,
        location: 'head',
        content: headContent,
      },
    },
  ],
}

writeFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/inject-responsive-site.json'), JSON.stringify(whtml))
writeFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/responsive-head-scripts.json'), JSON.stringify(scripts))
console.log('whtml json:', JSON.stringify(whtml).length, 'chars')
console.log('head content:', headContent.length, 'chars')
