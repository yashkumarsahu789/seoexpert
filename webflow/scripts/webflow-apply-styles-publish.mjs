#!/usr/bin/env node
/** Register inline script to load gummy CSS + publish Sunlu hub */
import { loadEnv } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY || ''
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || '6a3d69ff41d6f793eb3d5952'
const pageId = process.env.WEBFLOW_HOME_PAGE_ID || '6a3d6a0241d6f793eb3d598f'

const GUMMY_CSS =
  'https://cdn.prod.website-files.com/67dba71ac8e801b28e37d78b/css/gummysearchpromocodes.webflow.f0e392e4b.css'

const sourceCode = `(function(){if(document.querySelector('link[href*="gummysearchpromocodes"]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href='${GUMMY_CSS}';document.head.appendChild(l);var w=document.createElement('script');w.src='https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';w.onload=function(){WebFont.load({google:{families:['Lato:400,700','Droid Sans:400,700']}})};document.head.appendChild(w);})();`

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  accept: 'application/json',
}

async function api(method, path, body) {
  const res = await fetch(`https://api.webflow.com/v2${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${json?.message || text}`)
  return json
}

async function main() {
  console.log('Applying Sunlu homepage styles via registered script...\n')

  const registered = await api('POST', `/sites/${siteId}/registered_scripts/inline`, {
    sourceCode,
    version: '1.0.1',
    displayName: 'SunluGummyStyles',
    canCopy: true,
  })
  const scriptId = registered.id
  console.log('✅ Registered script:', scriptId)

  await api('PUT', `/sites/${siteId}/custom_code`, {
    scripts: [{ id: scriptId, location: 'header', version: '1.0.1' }],
  }).catch(async () => {
    await api('POST', `/sites/${siteId}/custom_code/scripts`, {
      scripts: [{ id: scriptId, location: 'header', version: '1.0.1' }],
    })
  })
  console.log('✅ Site header script applied')

  await api('PUT', `/pages/${pageId}`, {
    seo: {
      title: 'Sunlu Promo Code "KANNY" Flat 10% Off On Your Products.',
      description:
        'Use Sunlu promo code KANNY for 10% discount on your products. Shop Sunlu 3D printing filaments and save today.',
    },
  })
  console.log('✅ Page SEO updated')

  await api('POST', `/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: true,
    customDomains: [],
  })
  console.log('✅ Published → https://sunlu-promo-hub.webflow.io')
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
