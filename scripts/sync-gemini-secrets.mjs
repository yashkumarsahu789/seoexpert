/**
 * Push Gemini keys from .env → Supabase Edge Function secrets
 * Usage: node scripts/sync-gemini-secrets.mjs
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')

function loadEnv() {
  const env = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

const SECRET_NAMES = [
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'Google_API_KEY1',
  'Google_API_KEY2',
  'Google_API_KEY3',
  'GEMINI_API_KEY4',
  'GEMINI_API_KEY5',
  'GEMINI_API_KEY6',
  'GEMINI_API_KEY7',
  'GEMINI_API_KEY8',
  'GEMINI_API_KEY9',
]

const env = loadEnv()
const args = SECRET_NAMES.filter((n) => env[n]).flatMap((n) => [`${n}=${env[n]}`])

if (!args.length) {
  console.error('No Gemini keys in .env')
  process.exit(1)
}

execSync(`npx supabase secrets set ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`, {
  stdio: 'inherit',
  shell: true,
})

console.log(`Synced ${args.length} secret(s) to Supabase`)
