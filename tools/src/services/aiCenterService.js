/**
 * AI Center — tools/ backend: Firebase Firestore (fallback: localStorage)
 */
import {
  AI_AGENTS,
  GITHUB_DEFAULT_REPO,
  TASK_TYPES,
  evaluateAgentForTask,
  getAgentById,
  pickAgentForTask,
} from '../data/aiCenter'
import {
  buildCategoryPrompt,
  buildKeywordBriefPrompt,
  buildKeywordClassifyPrompt,
  buildKeywordDesignPrompt,
  buildKeywordSeoPrompt,
  parseCategoryResponse,
  parseKeywordBriefResponse,
  parseKeywordDesignResponse,
  parseKeywordSeoResponse,
} from '../data/aiAutomation'
import { callLlmFromBrowser } from './llmService'
import { isFirebaseConfigured, firebaseConfig } from '../firebaseClient'
import {
  getUsageToday,
  incrementUsage,
  listLocalTasks,
  nextLocalId,
  saveLocalTasks,
  clearLocalTasks,
} from '../lib/localStore'
import {
  createFirestoreTask,
  deleteAllFirestoreTasks,
  getFirestoreUsageToday,
  incrementFirestoreUsage,
  listFirestoreTasks,
  patchFirestoreTask,
} from './firestoreService'

export const FRONTEND_ONLY = !isFirebaseConfigured

export function getAiCenterStatus() {
  return {
    enabled: true,
    frontendOnly: !isFirebaseConfigured,
    firebaseConfigured: isFirebaseConfigured,
    firebaseProjectId: firebaseConfig.projectId || '',
    supabaseConfigured: false,
    githubRepo: GITHUB_DEFAULT_REPO,
    githubConfigured: Boolean(GITHUB_DEFAULT_REPO),
    agentCount: AI_AGENTS.length,
    activeAgents: AI_AGENTS.filter((a) => a.pipelineActive).length,
  }
}

async function listAllTasks(limit = 30) {
  if (isFirebaseConfigured) return listFirestoreTasks(limit)
  return listLocalTasks()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
}

async function readUsageToday() {
  if (isFirebaseConfigured) return getFirestoreUsageToday()
  return getUsageToday()
}

async function bumpUsage(agentId, calls = 1) {
  if (isFirebaseConfigured) return incrementFirestoreUsage(agentId, calls)
  return incrementUsage(agentId, calls)
}

async function persistTask(task) {
  if (isFirebaseConfigured) return createFirestoreTask(task)
  const tasks = listLocalTasks()
  const row = {
    ...task,
    id: nextLocalId(tasks),
    created_at: new Date().toISOString(),
    decline_log: task.decline_log || [],
  }
  tasks.push(row)
  saveLocalTasks(tasks)
  return row
}

async function patchTask(id, patch) {
  if (isFirebaseConfigured) return patchFirestoreTask(id, patch)
  const tasks = listLocalTasks()
  const idx = tasks.findIndex((t) => String(t.id) === String(id))
  if (idx < 0) return
  tasks[idx] = { ...tasks[idx], ...patch }
  saveLocalTasks(tasks)
}

export async function listCenterTasks(limit = 30) {
  return listAllTasks(limit)
}

export async function getAgentUsageToday() {
  return readUsageToday()
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

  return persistTask({
    task_type: taskType,
    title: title || def.label,
    input_text: text,
    estimated_calls: estimatedCalls ?? def.estimatedCalls ?? 1,
    github_repo: githubRepo || GITHUB_DEFAULT_REPO || null,
    github_path: githubPath || null,
    status: 'queued',
    assigned_agent_id: null,
    output_text: null,
    decline_log: [],
  })
}

export async function deleteAllCenterTasks() {
  if (isFirebaseConfigured) return deleteAllFirestoreTasks()
  clearLocalTasks()
}

function mockLlmOutput(task, agent) {
  if (task.task_type === 'classify_list') {
    const lines = task.input_text.split(/\n/).filter((l) => l.trim()).slice(0, 8)
    return JSON.stringify(
      {
        groups: [{ category: 'General / Other', items: lines.length ? lines : ['sample item'] }],
        total_items: lines.length || 1,
      },
      null,
      2
    )
  }

  if (task.task_type === 'keyword_page_classify') {
    const kw = task.input_text.toLowerCase()
    const isTool = /calc|timer|bmi|notepad|todo|counter/.test(kw)
    return JSON.stringify(
      {
        page_type: isTool ? 'tool' : 'brand',
        target_url: isTool ? null : 'https://example.com',
        confidence: 0.92,
        reason: isFirebaseConfigured ? 'tools Firebase orchestrator' : 'local fallback orchestrator',
      },
      null,
      2
    )
  }

  if (task.task_type === 'keyword_page_seo') {
    let keyword = task.input_text
    let brandName = ''
    try {
      const parsed = JSON.parse(task.input_text)
      keyword = parsed.keyword || keyword
      brandName = parsed.brandName || ''
    } catch {
      /* noop */
    }
    return JSON.stringify(
      {
        title: `${keyword} — Official Access | LifeSolveNow`,
        description: `Fast access to ${keyword}. Transparent LifeSolveNow redirect page with helpful FAQ.`,
        h1: brandName || keyword,
        h2: `Secure one-tap access — mobile-friendly`,
        features: ['Official redirect via LifeSolveNow', 'No login stored on this page', 'Updated for 2026 SEO'],
        requirements: ['Tap Open to continue', 'Use a modern browser'],
        faqs: [{ q: 'Is this official?', a: 'No — LifeSolveNow access page with transparent redirect.' }],
        bullets: ['Official redirect via LifeSolveNow', 'No login stored on this page'],
      },
      null,
      2
    )
  }

  return `[${agent.label}]\nProcessed: ${task.title}\n\n(Input length: ${task.input_text.length} chars)`
}

async function executeLlmTask(task, agent) {
  const def = TASK_TYPES[task.task_type]
  const preferred = def?.preferredAgents || []

  let prompt = task.input_text
  if (task.task_type === 'classify_list') {
    prompt = buildCategoryPrompt(task.input_text)
  } else if (task.task_type === 'keyword_page_classify') {
    try {
      const parsed = JSON.parse(task.input_text)
      prompt = buildKeywordClassifyPrompt(parsed.keyword || task.input_text, parsed.serpTopUrl || '')
    } catch {
      prompt = buildKeywordClassifyPrompt(task.input_text)
    }
  } else if (task.task_type === 'keyword_page_brief') {
    prompt = task.input_text.startsWith('[keyword_page_brief]') ? task.input_text : buildKeywordBriefPrompt(task.input_text)
  } else if (task.task_type === 'keyword_page_design') {
    prompt = task.input_text
  } else if (task.task_type === 'keyword_page_seo') {
    prompt = task.input_text
  }

  try {
    const { text, agentId: usedAgent } = await callLlmFromBrowser({
      prompt,
      agentId: agent.id,
      preferredAgents: preferred,
      maxTokens: def?.maxOutputTokens || 1024,
    })
    return { output: text, usedAgent }
  } catch (err) {
    const fallback = mockLlmOutput(task, agent)
    return { output: fallback, usedAgent: agent.id, fallback: true, error: err.message }
  }
}

async function processAssignedTask(task, agent) {
  await new Promise((r) => setTimeout(r, 200))

  if (task.task_type === 'github_commit' || task.task_type === 'keyword_page_commit') {
    await bumpUsage(agent.id, task.estimated_calls || 1)
    await patchTask(task.id, {
      status: 'completed',
      assigned_agent_id: agent.id,
      output_text: `Saved via tools pipeline (${task.github_path || 'local'})`,
      github_committed_at: new Date().toISOString(),
    })
    return
  }

  const { output, usedAgent, fallback, error } = await executeLlmTask(task, agent)
  await bumpUsage(usedAgent || agent.id, task.estimated_calls || 1)

  const patch = {
    status: 'completed',
    assigned_agent_id: usedAgent || agent.id,
    output_text: output,
    github_committed_at: task.github_path ? new Date().toISOString() : null,
  }
  if (fallback) patch.fallback_reason = error

  await patchTask(task.id, patch)
}

export async function orchestrateOnce() {
  const tasks = await listAllTasks(100)
  const busyAgentIds = new Set(
    tasks.filter((t) => ['assigning', 'processing'].includes(t.status) && t.assigned_agent_id).map((t) => t.assigned_agent_id)
  )

  const queued = tasks.filter((t) => t.status === 'queued').sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  if (!queued.length) return { processed: 0 }

  const task = queued[0]
  const usageToday = await readUsageToday()
  const { agent, evaluations, reason } = pickAgentForTask(task, usageToday, busyAgentIds)

  const declineLog = evaluations.filter((e) => !e.accept).map((e) => ({
    agent_id: e.agent.id,
    reason: e.reason,
    confidence: e.confidence,
  }))

  if (!agent) {
    await patchTask(task.id, { status: 'no_agent', decline_log: declineLog })
    return { processed: 0, noAgent: task.id, reason }
  }

  await patchTask(task.id, { status: 'processing', assigned_agent_id: agent.id, decline_log: declineLog })

  try {
    await processAssignedTask(task, agent)
    return { processed: 1, taskId: task.id, agentId: agent.id, reason: isFirebaseConfigured ? 'firebase' : 'local' }
  } catch (err) {
    await patchTask(task.id, { status: 'failed', output_text: `[error] ${err.message}` })
    return { processed: 0, failed: task.id, error: err.message }
  }
}

export async function runOrchestratorUntilIdle(maxTicks = 8) {
  const results = []
  for (let i = 0; i < maxTicks; i += 1) {
    const r = await orchestrateOnce()
    results.push(r)
    if (!r.processed && !r.noAgent) break
    await new Promise((res) => setTimeout(res, 400))
  }
  return results
}

export function buildAgentDashboard(agents, usageToday, tasks) {
  const busyIds = new Set(
    tasks.filter((t) => ['assigning', 'processing'].includes(t.status) && t.assigned_agent_id).map((t) => t.assigned_agent_id)
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

export { AI_AGENTS, TASK_TYPES, getAgentById, evaluateAgentForTask, buildCategoryPrompt, parseCategoryResponse, parseKeywordBriefResponse, parseKeywordDesignResponse, parseKeywordSeoResponse }
