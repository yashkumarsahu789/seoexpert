#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
}

const url = process.env.VITE_N8N_AUDIT_WEBHOOK_URL
const payload = {
  event: 'Website Audit Request',
  websiteId: 'e33282f8-fe54-4dcd-b33b-4cfabe575185',
  websiteUrl: 'https://lifesolvenow.com',
  mode: 'quick',
  source: 'test-script',
}

console.log('POST', url)
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const text = await res.text()
console.log('Status:', res.status)
console.log('Body:', text.slice(0, 500))
