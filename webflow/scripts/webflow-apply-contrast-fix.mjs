#!/usr/bin/env node
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { loadEnv } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY || ''
const siteId = '6a3d69ff41d6f793eb3d5952'
const pageId = '6a3d6a0241d6f793eb3d598f'

const sourceCode = readFileSync(
  new URL('./sunlu-contrast-fix.js', import.meta.url),
  'utf8',
).replace(/\s+/g, ' ').trim()

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
  console.log('Registering Sunlu contrast fix script...')

  const registered = await api('POST', `/sites/${siteId}/registered_scripts/inline`, {
    sourceCode,
    version: '1.0.0',
    displayName: 'SunluContrastFix',
    canCopy: true,
  })
  const scriptId = registered.id
  console.log('Registered:', scriptId, registered.version)

  const page = await api('GET', `/pages/${pageId}/custom_code`)
  const scripts = [...(page.scripts || [])]
  const idx = scripts.findIndex((s) => s.id === scriptId)
  const entry = { id: scriptId, location: 'header', version: registered.version || '1.0.0' }
  if (idx >= 0) scripts[idx] = entry
  else scripts.push(entry)

  await api('PUT', `/pages/${pageId}/custom_code`, { scripts })
  console.log('Page scripts updated')

  await api('POST', `/sites/${siteId}/publish`, {
    publishToWebflowSubdomain: true,
    customDomains: [],
  })
  console.log('Published')
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
