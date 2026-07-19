/** Quick end-to-end bulk_tasks classify test */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const env = {}
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const prompt = `[demo:category]
Reply ONLY valid JSON for items: iPhone, Milk, Netflix
{"groups":[{"category":"Product Inquiry","items":["iPhone"]}],"total_items":3}`

const { data, error } = await sb.from('bulk_tasks').insert({ input_text: prompt }).select('id,status').single()
if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}

console.log('Inserted task #' + data.id)

for (let i = 0; i < 25; i += 1) {
  await new Promise((r) => setTimeout(r, 3000))
  const { data: row } = await sb.from('bulk_tasks').select('status, ai_response').eq('id', data.id).single()
  console.log(`Poll ${i + 1}: ${row?.status}`)
  if (row?.status === 'completed') {
    console.log('Response:', row.ai_response?.slice(0, 300))
    process.exit(0)
  }
  if (row?.status === 'failed') {
    console.error('Failed:', row.ai_response)
    process.exit(1)
  }
}

console.error('Timeout')
process.exit(1)
