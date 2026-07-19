import { supabase, isSupabaseConfigured } from '../supabaseClient'

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `folder-${Date.now()}`
}

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase missing — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set karo')
  }
}

export async function listFolders() {
  requireSupabase()
  const { data, error } = await supabase
    .from('workflow_folders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getFolder(folderId) {
  requireSupabase()
  const { data, error } = await supabase
    .from('workflow_folders')
    .select('*')
    .eq('id', folderId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function createFolder(name) {
  requireSupabase()
  const trimmed = String(name || '').trim()
  if (!trimmed) throw new Error('Folder name khali hai')

  const baseSlug = slugify(trimmed)
  let slug = baseSlug
  let attempt = 0
  while (attempt < 5) {
    const { data, error } = await supabase
      .from('workflow_folders')
      .insert({ name: trimmed, slug })
      .select('*')
      .single()
    if (!error) return data
    if (error.code === '23505') {
      attempt += 1
      slug = `${baseSlug}-${attempt}`
      continue
    }
    throw new Error(error.message)
  }
  throw new Error('Folder create failed — slug conflict')
}

export async function deleteFolder(folderId) {
  requireSupabase()
  const { error } = await supabase.from('workflow_folders').delete().eq('id', folderId)
  if (error) throw new Error(error.message)
}

export async function listFolderApiKeys(folderId) {
  requireSupabase()
  const { data, error } = await supabase
    .from('folder_api_keys')
    .select('id, folder_id, label, provider, api_key, config_json, is_active, created_at, updated_at')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function addFolderApiKey(folderId, { label, provider, apiKey, configJson }) {
  requireSupabase()
  const key = String(apiKey || '').trim()
  if (!key) throw new Error('API key khali hai')

  const { data, error } = await supabase
    .from('folder_api_keys')
    .insert({
      folder_id: folderId,
      label: label || 'Default',
      provider: provider || 'custom',
      api_key: key,
      config_json: configJson || {},
      is_active: true,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateFolderApiKey(keyId, updates) {
  requireSupabase()
  const payload = {}
  if (updates.label != null) payload.label = updates.label
  if (updates.provider != null) payload.provider = updates.provider
  if (updates.apiKey != null) payload.api_key = updates.apiKey
  if (updates.configJson != null) payload.config_json = updates.configJson
  if (updates.isActive != null) payload.is_active = updates.isActive

  const { data, error } = await supabase
    .from('folder_api_keys')
    .update(payload)
    .eq('id', keyId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteFolderApiKey(keyId) {
  requireSupabase()
  const { error } = await supabase.from('folder_api_keys').delete().eq('id', keyId)
  if (error) throw new Error(error.message)
}

export async function listFolderWorkflows(folderId) {
  requireSupabase()
  const { data, error } = await supabase
    .from('folder_workflows')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getWorkflow(workflowId) {
  requireSupabase()
  const { data, error } = await supabase
    .from('folder_workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function createWorkflow(folderId, { name, userPrompt }) {
  requireSupabase()
  const trimmedName = String(name || '').trim()
  const prompt = String(userPrompt || '').trim()
  if (!trimmedName) throw new Error('Workflow name khali hai')
  if (!prompt) throw new Error('Workflow description paste karo')

  const { data, error } = await supabase
    .from('folder_workflows')
    .insert({
      folder_id: folderId,
      name: trimmedName,
      user_prompt: prompt,
      status: 'generating',
      generation_stage: 'analyzing',
      generation_progress: { currentStep: 0, totalSteps: 0 },
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateWorkflow(workflowId, updates) {
  requireSupabase()
  const payload = {}
  if (updates.name != null) payload.name = updates.name
  if (updates.userPrompt != null) payload.user_prompt = updates.userPrompt
  if (updates.status != null) payload.status = updates.status
  if (updates.generationStage != null) payload.generation_stage = updates.generationStage
  if (updates.generationProgress != null) payload.generation_progress = updates.generationProgress
  if (updates.specJson != null) payload.spec_json = updates.specJson
  if (updates.uiSchema != null) payload.ui_schema = updates.uiSchema
  if (updates.errorMessage != null) payload.error_message = updates.errorMessage

  const { data, error } = await supabase
    .from('folder_workflows')
    .update(payload)
    .eq('id', workflowId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function listWorkflowSteps(workflowId) {
  requireSupabase()
  const { data, error } = await supabase
    .from('folder_workflow_steps')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('step_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function deleteWorkflowSteps(workflowId) {
  requireSupabase()
  const { error } = await supabase.from('folder_workflow_steps').delete().eq('workflow_id', workflowId)
  if (error) throw new Error(error.message)
}

export async function updateWorkflowStep(stepId, updates) {
  requireSupabase()
  const payload = {}
  if (updates.title != null) payload.title = updates.title
  if (updates.category != null) payload.category = updates.category
  if (updates.status != null) payload.status = updates.status
  if (updates.prompt != null) payload.prompt = updates.prompt
  if (updates.aiResponse != null) payload.ai_response = updates.aiResponse

  const { data, error } = await supabase
    .from('folder_workflow_steps')
    .update(payload)
    .eq('id', stepId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function listWorkflowRuns(workflowId, limit = 20) {
  requireSupabase()
  const { data, error } = await supabase
    .from('folder_workflow_runs')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data || []
}

export async function createWorkflowRun(workflowId, inputJson) {
  requireSupabase()
  const { data, error } = await supabase
    .from('folder_workflow_runs')
    .insert({ workflow_id: workflowId, input_json: inputJson || {}, status: 'pending' })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateWorkflowRun(runId, updates) {
  requireSupabase()
  const payload = {}
  if (updates.status != null) payload.status = updates.status
  if (updates.outputJson != null) payload.output_json = updates.outputJson
  if (updates.errorMessage != null) payload.error_message = updates.errorMessage

  const { data, error } = await supabase
    .from('folder_workflow_runs')
    .update(payload)
    .eq('id', runId)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function restartWorkflowGeneration(workflowId, userPrompt) {
  requireSupabase()
  await deleteWorkflowSteps(workflowId)
  return updateWorkflow(workflowId, {
    userPrompt,
    status: 'generating',
    generationStage: 'analyzing',
    generationProgress: { currentStep: 0, totalSteps: 0 },
    specJson: null,
    uiSchema: null,
    errorMessage: null,
  })
}
