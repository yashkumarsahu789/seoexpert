import { supabase, isSupabaseConfigured } from '../supabaseClient'

function todayUtc() {
  return new Date().toISOString().slice(0, 10)
}

export async function listTempBoxes() {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('temp_automation_boxes')
    .select('*')
    .neq('kind', 'runner')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createTempBox({ slug, name, description, icon, accent, path, kind, taskType }) {
  if (!isSupabaseConfigured) throw new Error('Supabase configure nahi — temp/.env check karo')
  const { data, error } = await supabase
    .from('temp_automation_boxes')
    .insert({
      slug,
      name,
      description: description || '',
      icon: icon || '📦',
      accent: accent || '#6366f1',
      path,
      kind: kind || 'automation',
      task_type: taskType || 'general',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listTempRuns({ limit = 30, boxId } = {}) {
  if (!isSupabaseConfigured) return []
  let q = supabase
    .from('temp_ai_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (boxId) q = q.eq('box_id', boxId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function insertTempRun(row) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('temp_ai_runs')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTempRun(id, patch) {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.from('temp_ai_runs').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function fetchTempModelUsage() {
  if (!isSupabaseConfigured) return {}
  const day = todayUtc()
  const { data, error } = await supabase
    .from('temp_model_usage')
    .select('model_id, calls_used')
    .eq('usage_date', day)
  if (error) throw error
  const map = {}
  for (const row of data || []) {
    map[row.model_id] = row.calls_used
  }
  return map
}

export async function incrementTempModelUsage(modelId) {
  if (!isSupabaseConfigured) return
  const day = todayUtc()
  const { data: existing } = await supabase
    .from('temp_model_usage')
    .select('calls_used')
    .eq('model_id', modelId)
    .eq('usage_date', day)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('temp_model_usage')
      .update({ calls_used: (existing.calls_used || 0) + 1 })
      .eq('model_id', modelId)
      .eq('usage_date', day)
  } else {
    await supabase.from('temp_model_usage').insert({
      model_id: modelId,
      usage_date: day,
      calls_used: 1,
    })
  }
}
