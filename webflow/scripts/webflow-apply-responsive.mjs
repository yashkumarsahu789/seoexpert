#!/usr/bin/env node
/** Deploy mobile-first responsive CSS via registered inline scripts + publish */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY || ''
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || '6a3d69ff41d6f793eb3d5952'
const pageId = process.env.WEBFLOW_HOME_PAGE_ID || '6a3d6a0241d6f793eb3d598f'

const css = readFileSync(
  resolve(WEBFLOW_ROOT, 'coupon-sites/sunlu-responsive-site.css'),
  'utf8'
)

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

function chunkCss(text, maxChunk = 1500) {
  const chunks = []
  for (let i = 0; i < text.length; i += maxChunk) {
    chunks.push(text.slice(i, i + maxChunk))
  }
  return chunks
}

function escapeForJs(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
}

async function main() {
  if (!token) throw new Error('WEBFLOW_API_KEY missing in .env')

  console.log('Sunlu responsive deploy (inline scripts)\n')
  console.log(`CSS: ${css.length} chars\n`)

  const initSource = `(function(){var s=document.getElementById('sunlu-responsive-site');if(!s){s=document.createElement('style');s.id='sunlu-responsive-site';document.head.appendChild(s);}s.textContent='';})();`

  const cssChunks = chunkCss(css)
  const scriptIds = []

  const init = await api('POST', `/sites/${siteId}/registered_scripts/inline`, {
    sourceCode: initSource,
    version: '1.0.0',
    displayName: 'SunluResponsiveInit',
    canCopy: true,
  })
  scriptIds.push({ id: init.id, version: '1.0.0' })
  console.log('✅ Init script:', init.id)

  for (let i = 0; i < cssChunks.length; i++) {
    const part = escapeForJs(cssChunks[i])
    const sourceCode = `(function(){var s=document.getElementById('sunlu-responsive-site');if(s)s.textContent+=\`${part}\`;})();`
    if (sourceCode.length > 2000) {
      throw new Error(`Chunk ${i + 1} too large (${sourceCode.length} chars) for Webflow inline script limit`)
    }
    const reg = await api('POST', `/sites/${siteId}/registered_scripts/inline`, {
      sourceCode,
      version: '1.0.0',
      displayName: `SunluResponsiveCss${i + 1}`,
      canCopy: true,
    })
    scriptIds.push({ id: reg.id, version: '1.0.0' })
    console.log(`✅ CSS chunk ${i + 1}/${cssChunks.length}:`, reg.id)
  }

  const scriptsPayload = scriptIds.map((s) => ({
    id: s.id,
    location: 'header',
    version: s.version,
  }))

  let applied = false
  for (const path of [`/sites/${siteId}/custom_code`, `/sites/${siteId}/custom_code/scripts`]) {
    try {
      await api('PUT', path, { scripts: scriptsPayload })
      applied = true
      console.log(`✅ Site scripts applied via ${path}`)
      break
    } catch (e) {
      console.warn(`⚠️ ${path}:`, e.message)
    }
  }

  if (!applied) {
    try {
      await api('PUT', `/pages/${pageId}/custom_code`, { scripts: scriptsPayload })
      applied = true
      console.log('✅ Page scripts applied')
    } catch (e) {
      console.warn('⚠️ Page scripts:', e.message)
    }
  }

  if (!applied) throw new Error('Could not attach responsive scripts — check API token scopes')

  await api('POST', `/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: true,
    customDomains: [],
  })
  console.log('\n✅ Published → https://sunlu-promo-hub.webflow.io')
}

main().catch((e) => {
  console.error('❌', e.message)
  process.exit(1)
})
