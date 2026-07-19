#!/usr/bin/env node
/**
 * Download gummy reference images and upload to Sunlu Promo Hub asset library.
 * Output: coupon-sites/gummy-asset-map.json { url: assetId, hostedUrl }
 */
import { createHash } from 'crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || '6a3d69ff41d6f793eb3d5952'
const urls = JSON.parse(
  readFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/gummy-image-urls.json'), 'utf8')
)

const tmpDir = resolve(WEBFLOW_ROOT, 'coupon-sites/.asset-tmp')
mkdirSync(tmpDir, { recursive: true })

const headers = {
  Authorization: `Bearer ${token}`,
  accept: 'application/json',
  'Content-Type': 'application/json',
}

async function api(method, path, body) {
  const res = await fetch(`https://api.webflow.com/v2${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${json?.message || text}`)
  return json
}

function safeName(url) {
  const base = decodeURIComponent(url.split('/').pop().split('?')[0])
  return base.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 90) || 'image.png'
}

async function uploadOne(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const hash = createHash('md5').update(buf).digest('hex')
  const fileName = safeName(url)

  const created = await api('POST', `/sites/${siteId}/assets`, {
    fileName,
    fileHash: hash,
  })

  const { uploadUrl, uploadDetails, id, hostedUrl } = created
  if (!uploadUrl || !uploadDetails) throw new Error(`No upload URL for ${fileName}`)

  const form = new FormData()
  const fieldMap = {
    acl: 'acl',
    bucket: 'bucket',
    xAmzAlgorithm: 'X-Amz-Algorithm',
    xAmzCredential: 'X-Amz-Credential',
    xAmzDate: 'X-Amz-Date',
    key: 'key',
    policy: 'Policy',
    xAmzSignature: 'X-Amz-Signature',
    successActionStatus: 'success_action_status',
    contentType: 'Content-Type',
    cacheControl: 'Cache-Control',
  }
  for (const [k, formKey] of Object.entries(fieldMap)) {
    if (uploadDetails[k] != null) form.append(formKey, uploadDetails[k])
  }
  const mime = uploadDetails.contentType || res.headers.get('content-type') || 'image/png'
  form.append('file', new Blob([buf], { type: mime }), fileName)

  const up = await fetch(uploadUrl, { method: 'POST', body: form })
  if (up.status !== 201) throw new Error(`S3 upload failed ${fileName}: ${up.status} ${await up.text()}`)

  console.log(`✅ ${fileName} → ${id}`)
  return { url, assetId: id, hostedUrl: hostedUrl || created.url, fileName }
}

async function main() {
  console.log(`Uploading ${urls.length} images to site ${siteId}\n`)
  const map = {}
  for (const url of urls) {
    try {
      const r = await uploadOne(url)
      map[url] = r
    } catch (e) {
      console.error(`❌ ${safeName(url)}: ${e.message}`)
    }
  }
  writeFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/gummy-asset-map.json'), JSON.stringify(map, null, 2))
  console.log(`\nWrote gummy-asset-map.json (${Object.keys(map).length}/${urls.length})`)
}

main().catch((e) => { console.error(e); process.exit(1) })
