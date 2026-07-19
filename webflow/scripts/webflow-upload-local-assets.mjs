#!/usr/bin/env node
/**
 * Upload local coupon-sites/assets/* to Webflow (fixed S3 multipart fields).
 */
import { createHash } from 'crypto'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve, join } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

loadEnv()

const token = process.env.WEBFLOW_API_KEY
const siteId = process.env.WEBFLOW_MASTER_SITE_ID || '6a3d69ff41d6f793eb3d5952'
const assetsDir = resolve(WEBFLOW_ROOT, 'coupon-sites/assets')

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  accept: 'application/json',
}

async function api(method, path, body) {
  const res = await fetch(`https://api.webflow.com/v2${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  if (!res.ok) throw new Error(`${res.status} ${path}: ${json?.message || text}`)
  return json
}

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

async function uploadFile(filePath) {
  const buf = readFileSync(filePath)
  const hash = createHash('md5').update(buf).digest('hex')
  const base = filePath.split(/[/\\]/).pop()
  const fileName = base.length > 90 ? base.slice(-90) : base
  const mime = fileName.endsWith('.jpeg') || fileName.endsWith('.jpg') ? 'image/jpeg' : 'image/png'

  const created = await api('POST', `/sites/${siteId}/assets`, { fileName, fileHash: hash })
  const { uploadUrl, uploadDetails, id } = created

  const form = new FormData()
  for (const [k, formKey] of Object.entries(fieldMap)) {
    if (uploadDetails[k] != null) form.append(formKey, uploadDetails[k])
  }
  form.append('file', new Blob([buf], { type: mime }), fileName)

  const up = await fetch(uploadUrl, { method: 'POST', body: form })
  if (up.status !== 201) throw new Error(`S3 ${up.status}: ${await up.text()}`)

  console.log(`✅ ${fileName} → ${id}`)
  return { fileName, assetId: id, hostedUrl: created.hostedUrl || created.url }
}

async function main() {
  const files = readdirSync(assetsDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  console.log(`Uploading ${files.length} local files\n`)
  const map = {}
  for (const f of files) {
    try {
      const r = await uploadFile(join(assetsDir, f))
      map[f] = r
    } catch (e) {
      console.error(`❌ ${f}:`, e.message)
    }
  }
  writeFileSync(resolve(WEBFLOW_ROOT, 'coupon-sites/gummy-asset-map.json'), JSON.stringify(map, null, 2))
  console.log(`\nDone: ${Object.keys(map).length}/${files.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
