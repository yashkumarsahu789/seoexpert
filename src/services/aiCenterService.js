import { supabase, isSupabaseConfigured } from '../supabaseClient'
import {
  AI_AGENTS,
  GITHUB_DEFAULT_REPO,
  TASK_TYPES,
  evaluateAgentForTask,
  getAgentById,
  pickAgentForTask,
} from '../data/aiCenter'
import { buildCategoryPrompt, isAiEnabled } from '../data/aiAutomation'
import { pollBulkTask } from './aiAutomationService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

export function getAiCenterStatus() {
  return {
    enabled: isAiEnabled(),
    supabaseConfigured: isSupabaseConfigured,
    githubRepo: GITHUB_DEFAULT_REPO,
    githubConfigured: Boolean(GITHUB_DEFAULT_REPO),
    agentCount: AI_AGENTS.length,
    activeAgents: AI_AGENTS.filter((a) => a.pipelineActive).length,
  }
}

export async function listCenterTasks(limit = 30) {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('ai_center_tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data || []
}

export async function getAgentUsageToday() {
  if (!isSupabaseConfigured) return {}

  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('ai_agent_usage')
    .select('agent_id, calls_used')
    .eq('usage_date', today)

  if (error) throw new Error(error.message)

  const map = {}
  for (const row of data || []) {
    map[row.agent_id] = row.calls_used
  }
  return map
}

async function incrementAgentUsage(agentId, calls = 1) {
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('ai_agent_usage')
    .select('calls_used')
    .eq('agent_id', agentId)
    .eq('usage_date', today)
    .maybeSingle()

  const next = (existing?.calls_used || 0) + calls
  const { error } = await supabase.from('ai_agent_usage').upsert(
    { agent_id: agentId, usage_date: today, calls_used: next },
    { onConflict: 'agent_id,usage_date' }
  )
  if (error) throw new Error(error.message)
}

export async function submitCenterTask({
  taskType,
  title,
  inputText,
  githubRepo,
  githubPath,
  estimatedCalls,
}) {
  const def = TASK_TYPES[taskType]
  if (!def) throw new Error(`Unknown task type: ${taskType}`)

  const text = String(inputText || '').trim()
  if (!text) throw new Error('input khali hai')

  if (!isSupabaseConfigured) {
    throw new Error('Supabase missing — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set karo')
  }

  const { data, error } = await supabase
    .from('ai_center_tasks')
    .insert({
      task_type: taskType,
      title: title || def.label,
      input_text: text,
      estimated_calls: estimatedCalls ?? def.estimatedCalls ?? 1,
      github_repo: githubRepo || GITHUB_DEFAULT_REPO || null,
      github_path: githubPath || null,
      status: 'queued',
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteAllCenterTasks() {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured')
  const { error } = await supabase.from('ai_center_tasks').delete().neq('id', 0)
  if (error) throw new Error(error.message)
}

function buildPromptForTask(task) {
  if (task.task_type === 'classify_list') {
    return buildCategoryPrompt(task.input_text)
  }

  const def = TASK_TYPES[task.task_type]
  return `[ai-center:${task.task_type}]
Task: ${def?.label || task.task_type}
${def?.description || ''}

Reply with clear structured output (JSON preferred when listing items).

INPUT:
"""
${task.input_text}
"""`
}

async function runLlmTask(task, agent) {
  const prompt = buildPromptForTask(task)

  const { data: bulk, error: bulkErr } = await supabase
    .from('bulk_tasks')
    .insert({
      input_text: prompt,
      model_key: agent.modelId || agent.id.replace(/^cf-/, ''),
    })
    .select('id, status, created_at')
    .single()

  if (bulkErr) throw new Error(bulkErr.message)

  await supabase
    .from('ai_center_tasks')
    .update({
      bulk_task_id: bulk.id,
      status: 'processing',
      assigned_agent_id: agent.id,
    })
    .eq('id', task.id)

  const done = await pollBulkTask(bulk.id, { maxAttempts: 45, intervalMs: 2500 })

  if (done.status === 'failed') {
    throw new Error(done.ai_response?.replace(/^\[error\]\s*/, '') || 'LLM task failed')
  }

  return done.ai_response || ''
}

async function commitToGithub(task, content) {
  if (!task.github_repo || !task.github_path) return null
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL missing for GitHub commit')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-center-github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: task.github_repo,
      path: task.github_path,
      content,
      message: `ai-center: ${task.title} (#${task.id})`,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.error || `GitHub commit failed (${res.status})`)
  return data
}

async function processAssignedTask(task, agent) {
  if (task.task_type === 'github_commit') {
    const content = task.input_text
    const gh = await commitToGithub(task, content)
    await incrementAgentUsage(agent.id, task.estimated_calls || 1)
    await supabase
      .from('ai_center_tasks')
      .update({
        status: 'completed',
        output_text: `Committed to ${task.github_repo}/${task.github_path}`,
        output_payload: gh,
        github_committed_at: new Date().toISOString(),
        assigned_agent_id: agent.id,
      })
      .eq('id', task.id)
    return
  }

  const output = await runLlmTask(task, agent)
  await incrementAgentUsage(agent.id, task.estimated_calls || 1)

  let githubCommittedAt = null
  let outputPayload = null

  if (task.github_repo && task.github_path && output) {
    try {
      const gh = await commitToGithub({ ...task, title: task.title }, output)
      githubCommittedAt = new Date().toISOString()
      outputPayload = { github: gh }
      await incrementAgentUsage('github', 1)
    } catch (err) {
      outputPayload = { github_error: err.message }
    }
  }

  await supabase
    .from('ai_center_tasks')
    .update({
      status: 'completed',
      output_text: output,
      output_payload: outputPayload,
      github_committed_at: githubCommittedAt,
    })
    .eq('id', task.id)
}

export async function orchestrateOnce() {
  if (!isSupabaseConfigured) return { processed: 0, skipped: true }

  const { data: processing } = await supabase
    .from('ai_center_tasks')
    .select('assigned_agent_id')
    .in('status', ['assigning', 'processing'])

  const busyAgentIds = new Set((processing || []).map((r) => r.assigned_agent_id).filter(Boolean))

  const { data: queued, error } = await supabase
    .from('ai_center_tasks')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw new Error(error.message)
  if (!queued?.length) return { processed: 0 }

  const task = queued[0]
  const usageToday = await getAgentUsageToday()
  const { agent, evaluations, reason } = pickAgentForTask(task, usageToday, busyAgentIds)

  const declineLog = evaluations
    .filter((e) => !e.accept)
    .map((e) => ({
      agent_id: e.agent.id,
      reason: e.reason,
      confidence: e.confidence,
    }))

  if (!agent) {
    await supabase
      .from('ai_center_tasks')
      .update({ status: 'no_agent', decline_log: declineLog })
      .eq('id', task.id)
    return { processed: 0, noAgent: task.id, reason }
  }

  await supabase
    .from('ai_center_tasks')
    .update({
      status: 'assigning',
      assigned_agent_id: agent.id,
      decline_log: declineLog,
    })
    .eq('id', task.id)

  try {
    await processAssignedTask({ ...task, assigned_agent_id: agent.id }, agent)
    return { processed: 1, taskId: task.id, agentId: agent.id, reason }
  } catch (err) {
    await supabase
      .from('ai_center_tasks')
      .update({
        status: 'failed',
        output_text: `[error] ${err.message}`,
      })
      .eq('id', task.id)
    return { processed: 0, failed: task.id, error: err.message }
  }
}

export function buildAgentDashboard(agents, usageToday, tasks) {
  const busyIds = new Set(
    tasks
      .filter((t) => ['assigning', 'processing'].includes(t.status) && t.assigned_agent_id)
      .map((t) => t.assigned_agent_id)
  )

  const currentTaskByAgent = {}
  for (const t of tasks) {
    if (t.assigned_agent_id && ['assigning', 'processing'].includes(t.status)) {
      currentTaskByAgent[t.assigned_agent_id] = t
    }
  }

  return agents.map((agent) => {
    const used = usageToday[agent.id] || 0
    const remaining = agent.limits.dailyCalls - used
    const exhausted = remaining <= 0
    const busy = busyIds.has(agent.id)
    const status = busy ? 'busy' : exhausted ? 'exhausted' : agent.pipelineActive ? 'idle' : 'standby'

    return {
      ...agent,
      usedToday: used,
      remainingToday: Math.max(0, remaining),
      status,
      currentTask: currentTaskByAgent[agent.id] || null,
    }
  })
}

export function previewTaskAssignment(taskType, inputText, usageToday = {}, busyAgentIds = new Set()) {
  const task = {
    task_type: taskType,
    input_text: inputText,
    estimated_calls: TASK_TYPES[taskType]?.estimatedCalls ?? 1,
  }
  return pickAgentForTask(task, usageToday, busyAgentIds)
}

export { AI_AGENTS, TASK_TYPES, getAgentById, evaluateAgentForTask }
