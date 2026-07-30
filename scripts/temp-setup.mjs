/**
 * Full /temp setup from temp/.env
 * 1) Verify env  2) DB migration  3) Sync secrets  4) Deploy temp-ai
 * Usage: npm run temp:setup
 */
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadTempEnv } from '../temp/loadEnv.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const REQUIRED = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'TEMP_GOOGLE_API_KEY1',
  'TEMP_GOOGLE_API_KEY2',
  'TEMP_GOOGLE_API_KEY3',
]

function run(cmd, label) {
  console.log(`\n▶ ${label}`)
  execSync(cmd, { stdio: 'inherit', cwd: root, shell: true })
}

try {
  const env = loadTempEnv()
  const missing = REQUIRED.filter((k) => !env[k]?.trim())
  if (missing.length) {
    console.error('temp/.env me missing:', missing.join(', '))
    process.exit(1)
  }
  console.log('✓ temp/.env OK — Supabase:', env.VITE_SUPABASE_URL)
  console.log('✓ TEMP keys: 3/3')

  try {
    run('npx supabase db push', 'Supabase migration (temp_automation_boxes, temp_ai_runs, …)')
  } catch {
    console.warn('\n⚠ db push skip — agar tables nahi bani to Supabase SQL Editor me chalao:')
    console.warn('   supabase/migrations/020_temp_ai.sql')
  }

  run('node scripts/sync-temp-ai-secrets.mjs', 'Sync TEMP keys → Supabase secrets')

  run('npx supabase functions deploy temp-ai --no-verify-jwt', 'Deploy Edge Function temp-ai')

  console.log('\n✅ /temp setup complete')
  console.log('   Dev: npm run dev  →  open /temp')
  console.log('   Share: temp/.env file bhejo teammate ko (GitHub pe mat daalo)')
} catch (err) {
  console.error('\n❌ Setup failed:', err.message)
  console.error('   Pehle: supabase login && supabase link --project-ref YOUR_REF')
  process.exit(1)
}
