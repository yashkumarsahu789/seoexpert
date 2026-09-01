/**
 * Test SERP providers (Serper → SerpAPI → Bing free)
 * Usage: node scripts/test-serp.mjs "seo tools"
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { checkKeywordRankPosition } from '../tools/lib/automation/serp.mjs'

const args = process.argv.slice(2)
const query = args[0] || 'seo audit tools'
const targetDomain = args[1] || ''

function loadEnv() {
  const env = {}
  for (const line of readFileSync(resolve(__dirname, '../.env'), 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    if (v) env[k] = v
  }
  return env
}

const env = loadEnv()
const serperKey = env.SERPER_API_KEY || env.SERPer_API_KEY || process.env.SERPER_API_KEY || process.env.SERPer_API_KEY || ''
const serpApiKey = env.SERP_API_KEY || process.env.SERP_API_KEY || ''

console.log(`Query: "${query}"${targetDomain ? ` | Target Domain: "${targetDomain}"` : ''}\n`)

if (serperKey) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'in', hl: 'en', num: 20 }),
  })
  const data = await res.json()
  const organic = data?.organic || []
  console.log(`Serper: ${res.status} — ${organic.length} results`)
  
  if (targetDomain) {
    const match = organic.find((r) => String(r.link || '').toLowerCase().includes(targetDomain.toLowerCase()))
    if (match) {
      console.log(`  -> Rank Position for "${targetDomain}": #${match.position} (${match.link})`)
    } else {
      console.log(`  -> Target domain "${targetDomain}" not found in top ${organic.length} Serper results`)
    }
  } else {
    organic.slice(0, 3).forEach((r) => console.log(`  #${r.position} ${r.link}`))
  }
} else {
  console.log('Serper: skipped (SERPER_API_KEY missing)')
}

if (serpApiKey) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&gl=in&hl=en&api_key=${encodeURIComponent(serpApiKey)}`
  const res = await fetch(url)
  const data = await res.json()
  const organic = data?.organic_results || []
  console.log(`SerpAPI: ${res.status} — ${organic.length} results`)
  organic.slice(0, 3).forEach((r, i) => console.log(`  #${i + 1} ${r.link}`))
} else {
  console.log('SerpAPI: skipped (SERP_API_KEY missing)')
}

const bing = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=5`, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
})
const html = await bing.text()
const count = (html.match(/class="b_algo"/gi) || []).length
console.log(`Bing free scrape: ${bing.status} — ~${count} b_algo blocks`)

if (targetDomain) {
  const rankCheck = await checkKeywordRankPosition(query, targetDomain, { serperApiKey: serperKey, serpApiKey })
  console.log(`\nRank Check Service Result: Position #${rankCheck.rankPosition ?? 'N/A'} via ${rankCheck.source} (${rankCheck.rankUrl || 'Not found'})`)
}
