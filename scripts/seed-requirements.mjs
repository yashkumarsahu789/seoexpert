#!/usr/bin/env node
/** One-time seed: push requirements-baseline.json → Supabase */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  const p = path.join(ROOT, '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const baseline = JSON.parse(
  readFileSync(path.join(ROOT, 'n8n', 'data', 'requirements-baseline.json'), 'utf8')
)

const rows = baseline.map((r) => ({
  ...r,
  action_if_missing: 'add',
  action_if_present_weak: 'update',
  action_if_harmful: 'remove',
  active: true,
  last_synced_at: new Date().toISOString(),
}))

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
}

for (let i = 0; i < rows.length; i += 15) {
  const batch = rows.slice(i, i + 15)
  const res = await fetch(`${url}/rest/v1/audit_requirements?on_conflict=pillar,rule_code`, {
    method: 'POST',
    headers,
    body: JSON.stringify(batch),
  })
  if (!res.ok) {
    console.error(await res.text())
    process.exit(1)
  }
  console.log(`Upserted ${i + batch.length}/${rows.length}`)
}

console.log('Done — requirements catalog seeded.')
