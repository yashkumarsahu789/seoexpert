/**
 * Test all Google/Gemini API keys from .env
 * Usage: node scripts/test-gemini-keys.mjs [--model=gemini-flash-latest]
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')
const modelArg = process.argv.find((a) => a.startsWith('--model='))
const MODEL = modelArg ? modelArg.split('=')[1] : 'gemini-flash-latest'
const PROMPT = 'Reply with exactly: OK'

function loadEnv() {
  const raw = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (val) env[key] = val
  }
  return env
}

function collectKeys(env) {
  const seen = new Set()
  const keys = []

  const add = (name, value) => {
    const v = value.trim()
    if (!v || seen.has(v)) return
    seen.add(v)
    keys.push({ name, value: v })
  }

  if (env.GEMINI_API_KEY) add('GEMINI_API_KEY', env.GEMINI_API_KEY)

  // Bulk/audit pool only — skip Google_API_KEY* (legacy) and TEMP_* (tested separately)
  const numbered = Object.entries(env)
    .filter(([name, value]) => /^GEMINI_API_KEY\d+$/i.test(name) && value?.trim())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))

  for (const [name, value] of numbered) add(name, value)

  const temp = Object.entries(env)
    .filter(([name, value]) => /^TEMP_GOOGLE_API_KEY\d+$/i.test(name) && value?.trim())
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))

  for (const [name, value] of temp) add(name, value)

  return keys
}

async function testKey({ name, value }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(value)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
      generationConfig: { maxOutputTokens: 16, temperature: 0 },
    }),
  })
  const data = await res.json().catch(() => ({}))
  const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
  const error = data?.error?.message || ''
  const masked = value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : '***'

  let status = 'INVALID'
  if (res.ok && text) status = 'WORKING'
  else if (res.ok) status = 'OK_EMPTY'
  else if (res.status === 429 || error.toLowerCase().includes('quota')) status = 'VALID_QUOTA'
  else if (res.status === 401 || res.status === 403) status = 'INVALID'

  return { name, masked, status, http: res.status, text, error: error.split('\n')[0] }
}

const env = loadEnv()
const keys = collectKeys(env)

if (keys.length === 0) {
  console.error('No Google/Gemini keys found in .env')
  process.exit(1)
}

console.log(`Testing ${keys.length} unique key(s) on ${MODEL}…\n`)

const results = []
for (const entry of keys) {
  try {
    const r = await testKey(entry)
    results.push(r)
    const icon = r.status === 'WORKING' ? '✓' : r.status === 'VALID_QUOTA' ? '~' : r.status === 'OK_EMPTY' ? '?' : '✗'
    console.log(`${icon} ${r.name} (${r.masked}) — ${r.status}`)
    if (r.status === 'WORKING') console.log(`   → ${r.text}`)
    else if (r.error) console.log(`   → ${r.error.slice(0, 100)}`)
  } catch (err) {
    results.push({ name: entry.name, status: 'ERROR', error: err.message })
    console.log(`✗ ${entry.name} — ${err.message}`)
  }
}

const working = results.filter((r) => r.status === 'WORKING')
const validQuota = results.filter((r) => r.status === 'VALID_QUOTA')
const okEmpty = results.filter((r) => r.status === 'OK_EMPTY')

console.log(`\n--- Summary ---`)
console.log(`WORKING:      ${working.length}`)
console.log(`VALID_QUOTA:  ${validQuota.length} (key valid, quota exhausted on ${MODEL})`)
console.log(`OK_EMPTY:     ${okEmpty.length} (200 but empty response)`)
console.log(`INVALID:      ${results.length - working.length - validQuota.length - okEmpty.length}`)

if (working.length) {
  console.log('\nWorking keys:', working.map((r) => r.name).join(', '))
}

process.exit(working.length || validQuota.length || okEmpty.length ? 0 : 1)
