/**
 * Push temp/.env → Supabase Edge Function secrets (TEMP keys only)
 * Usage: npm run temp:sync
 */
import { execSync } from 'node:child_process'
import { loadTempEnv } from '../temp/loadEnv.mjs'

const SECRET_NAMES = [
  'TEMP_GOOGLE_API_KEY1',
  'TEMP_GOOGLE_API_KEY2',
  'TEMP_GOOGLE_API_KEY3',
  'GEMINI_MODEL',
]

const env = loadTempEnv()
const args = SECRET_NAMES.filter((n) => env[n]).flatMap((n) => [`${n}=${env[n]}`])

if (args.length < 3) {
  console.error('temp/.env me TEMP_GOOGLE_API_KEY1–3 chahiye')
  process.exit(1)
}

execSync(`npx supabase secrets set ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`, {
  stdio: 'inherit',
  shell: true,
})

console.log(`✓ ${args.length} secret(s) synced from temp/.env → Supabase`)
