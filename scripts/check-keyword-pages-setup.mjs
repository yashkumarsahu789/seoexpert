#!/usr/bin/env node
/** Check keyword-pages pipeline setup + report blockers */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...loadEnv(), ...process.env }
const checks = []

function add(name, ok, detail, fix) {
  checks.push({ name, ok, detail, fix })
}

add('Supabase URL', Boolean(env.VITE_SUPABASE_URL || env.SUPABASE_URL), env.VITE_SUPABASE_URL || env.SUPABASE_URL || 'missing', 'Set VITE_SUPABASE_URL in .env')
add('Supabase service key', Boolean(env.SUPABASE_SERVICE_ROLE_KEY), env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing', 'Set SUPABASE_SERVICE_ROLE_KEY for n8n + GitHub edge fn')
add('GitHub repo', Boolean(env.VITE_GITHUB_REPO || env.GITHUB_REPO), env.VITE_GITHUB_REPO || env.GITHUB_REPO || 'missing', 'Set VITE_GITHUB_REPO=owner/repo')
add('n8n API key', Boolean(env.N8N_API_KEY), env.N8N_API_KEY ? 'set' : 'missing', 'Set N8N_API_KEY then npm run n8n:push -- keyword_pages_daily')
add('Page generator lib', existsSync(path.join(ROOT, 'tools/lib/page-generator.mjs')), 'tools/lib/page-generator.mjs', 'Restore page-generator.mjs')
add('n8n workflow file', existsSync(path.join(ROOT, 'n8n/workflows/keyword_pages_daily.json')), 'keyword_pages_daily.json', 'Restore workflow JSON')
add('Migration 014', existsSync(path.join(ROOT, 'supabase/migrations/014_keyword_pages.sql')), '014_keyword_pages.sql', 'Run supabase db push or apply migration')
add('Redirect /out/', existsSync(path.join(ROOT, 'tools/public/out/index.html')), 'tools/public/out/index.html', 'Create redirect page')
add('GitHub Actions deploy', existsSync(path.join(ROOT, '.github/workflows/deploy-keyword-pages.yml')), 'deploy workflow', 'Enable GitHub Pages on repo')

async function checkUrl(label, url, expectOk = true) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    add(label, expectOk ? res.ok : true, `HTTP ${res.status} ${url}`, '')
  } catch (err) {
    add(label, false, err.message, 'Network or URL issue')
  }
}

await checkUrl('Google Suggest (free)', 'https://suggestqueries.google.com/complete/search?client=chrome&q=test')
await checkUrl('LifeSolveNow shop', 'https://shop.LifeSolveNow.com')

// GitHub token check via edge function if supabase configured
const supaUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '')
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (supaUrl && serviceKey) {
  try {
    const res = await fetch(`${supaUrl}/functions/v1/ai-center-github`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check' }),
    })
    const data = await res.json()
    add('GitHub PAT (Supabase secret)', data.ok === true, data.login ? `@${data.login}` : data.error || `HTTP ${res.status}`, 'supabase secrets set GITHUB_TOKEN=ghp_...')
  } catch (err) {
    add('GitHub PAT (Supabase secret)', false, err.message, 'Deploy ai-center-github edge function + set GITHUB_TOKEN')
  }
} else {
  add('GitHub PAT (Supabase secret)', false, 'Need SUPABASE_URL + SERVICE_ROLE_KEY to test', 'Configure .env first')
}

// n8n webhook (optional live test)
const n8nBase = (env.VITE_N8N_BASE_URL || env.N8N_API_URL || '').replace(/\/$/, '')
if (n8nBase) {
  try {
    const res = await fetch(`${n8nBase}/webhook/keyword-pages-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun: true, maxPages: 1 }),
    })
    add('n8n keyword-pages webhook', res.ok, `HTTP ${res.status}`, 'npm run n8n:push -- keyword_pages_daily && activate on Render')
  } catch (err) {
    add('n8n keyword-pages webhook', false, err.message, 'Push workflow to Render n8n')
  }
}

console.log('\n=== Keyword Pages Setup Check ===\n')
const blocked = []
for (const c of checks) {
  const icon = c.ok ? '✅' : '❌'
  console.log(`${icon} ${c.name}: ${c.detail}`)
  if (!c.ok && c.fix) console.log(`   → Fix: ${c.fix}`)
  if (!c.ok) blocked.push(c)
}

console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`)
if (blocked.length) {
  console.log('\n--- BLOCKERS (user action needed) ---')
  blocked.forEach((b, i) => console.log(`${i + 1}. ${b.name}: ${b.fix || b.detail}`))
  process.exitCode = 1
} else {
  console.log('\nAll checks passed — run npm run keyword-pages:test then npm run n8n:push -- keyword_pages_daily')
}
