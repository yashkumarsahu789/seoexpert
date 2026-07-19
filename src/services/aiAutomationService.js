import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { getGeminiModel, isAiEnabled, isBulkWebhookConfigured } from '../data/aiAutomation'

const BULK_WEBHOOK = import.meta.env.VITE_N8N_BULK_LLM_WEBHOOK_URL || ''
const N8N_BASE = import.meta.env.VITE_N8N_BASE_URL || ''

export function getAiSetupStatus() {
  return {
    enabled: isAiEnabled(),
    model: getGeminiModel(),
    supabaseConfigured: isSupabaseConfigured,
    bulkWebhookConfigured: isBulkWebhookConfigured(),
    n8nBaseConfigured: Boolean(N8N_BASE?.trim()),
  }
}

export async function listBulkTasks(limit = 20) {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('bulk_tasks')
    .select('id, input_text, ai_response, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

export async function deleteAllBulkTasks() {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')

  const { error } = await supabase.from('bulk_tasks').delete().neq('id', 0)
  if (error) throw new Error(error.message)
  return true
}

export async function insertBulkTask(inputText, { maxChars = 4000 } = {}) {
  const text = String(inputText || '').trim()
  if (!text) throw new Error('input_text khali hai')
  if (text.length > maxChars) {
    throw new Error(`Input bahut lamba hai (max ${maxChars} chars)`)
  }

  if (!isSupabaseConfigured) {
    throw new Error('Supabase missing — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set karo')
  }

  const { data, error } = await supabase
    .from('bulk_tasks')
    .insert({ input_text: text })
    .select('id, status, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function enqueueViaN8n(inputText) {
  if (!BULK_WEBHOOK?.trim()) {
    throw new Error('VITE_N8N_BULK_LLM_WEBHOOK_URL missing — .env me set karo')
  }

  const res = await fetch(BULK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input_text: inputText }),
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.error || `n8n webhook failed (${res.status})`)
  }

  return { status: res.status, data }
}

export async function checkGeminiSecrets() {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new Error('VITE_SUPABASE_URL missing')

  const res = await fetch(`${url}/functions/v1/process-llm-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check-secrets' }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `Check failed (${res.status})`)
  return data
}

export async function pollBulkTask(id, { maxAttempts = 30, intervalMs = 2000 } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')

  for (let i = 0; i < maxAttempts; i += 1) {
    const { data, error } = await supabase
      .from('bulk_tasks')
      .select('id, ai_response, status, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data && (data.status === 'completed' || data.status === 'failed')) {
      return data
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('Timeout — task abhi bhi processing me hai')
}
