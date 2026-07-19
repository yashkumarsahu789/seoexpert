/** AI Center — multi-agent registry, capability matching, self-selection rules */

import { APP_PIPELINE_LIMITS, GEMINI_MODELS } from './aiAutomation'

export const TASK_TYPES = {
  classify_list: {
    id: 'classify_list',
    label: 'List / product classify',
    description: 'Lines, products, tickets → category groups (JSON)',
    estimatedCalls: 1,
    maxInputChars: 4000,
    preferredAgents: ['gemini-flash-latest', 'gemini-2.0-flash-lite'],
  },
  seo_meta: {
    id: 'seo_meta',
    label: 'SEO meta draft',
    description: 'Title + description for pages/products',
    estimatedCalls: 1,
    maxInputChars: 2000,
    preferredAgents: ['gemini-flash-latest', 'gemini-2.0-flash-lite'],
  },
  keyword_intent: {
    id: 'keyword_intent',
    label: 'Keyword intent tag',
    description: 'informational / transactional / support',
    estimatedCalls: 1,
    maxInputChars: 3000,
    preferredAgents: ['gemini-flash-latest'],
  },
  multilingual_classify: {
    id: 'multilingual_classify',
    label: 'Multilingual classify',
    description: 'Hindi + English mixed data sorting',
    estimatedCalls: 1,
    maxInputChars: 8000,
    preferredAgents: ['gemini-flash-latest', 'gemini-2.0-flash'],
  },
  audit_summary: {
    id: 'audit_summary',
    label: 'Audit summary',
    description: 'Findings → human-readable fix steps',
    estimatedCalls: 2,
    maxInputChars: 6000,
    preferredAgents: ['gemini-2.0-flash', 'gemini-flash-latest'],
  },
  competitor_analysis: {
    id: 'competitor_analysis',
    label: 'Competitor gap analysis',
    description: 'Deep reasoning — gap report + priorities',
    estimatedCalls: 3,
    maxInputChars: 10000,
    preferredAgents: ['gemini-2.0-flash'],
  },
  action_plan: {
    id: 'action_plan',
    label: 'Action plan',
    description: 'Multi-pillar SEO/AEO/GEO prioritized plan',
    estimatedCalls: 2,
    maxInputChars: 8000,
    preferredAgents: ['gemini-2.0-flash', 'gemini-flash-latest'],
  },
  github_commit: {
    id: 'github_commit',
    label: 'GitHub repo update',
    description: 'Task output → repo file commit (PAT required)',
    estimatedCalls: 1,
    maxInputChars: 500000,
    preferredAgents: ['github'],
  },
}

const TASK_CAPABILITY_MAP = {
  classify_list: ['classify', 'product', 'category', 'json', 'bulk'],
  seo_meta: ['seo', 'meta', 'title', 'description'],
  keyword_intent: ['keyword', 'intent', 'tag'],
  multilingual_classify: ['multilingual', 'hindi', 'english', 'long context'],
  audit_summary: ['audit', 'summary', 'fix', 'technical'],
  competitor_analysis: ['competitor', 'gap', 'reasoning', 'deep'],
  action_plan: ['action', 'plan', 'priority', 'seo', 'aeo', 'geo'],
  github_commit: ['repo', 'github', 'commit', 'file'],
}

function agentCanDoText(agent, keywords) {
  const hay = [...(agent.canDo || []), agent.bestFor || '', agent.label || ''].join(' ').toLowerCase()
  return keywords.some((k) => hay.includes(k.toLowerCase()))
}

function buildGeminiAgents() {
  return GEMINI_MODELS.map((m) => ({
    id: m.id,
    provider: 'gemini',
    providerLabel: 'Google Gemini',
    modelId: m.id,
    modelPath: m.id,
    label: m.label,
    pipelineActive: true,
    capabilities: Object.keys(TASK_TYPES).filter((taskId) => {
      const keys = TASK_CAPABILITY_MAP[taskId] || []
      return agentCanDoText(m, keys)
    }),
    limits: {
      dailyCalls: 200,
      rpm: m.rpm || 15,
      maxInputChars: Math.min(m.contextTokens / 4, APP_PIPELINE_LIMITS.uiInputMaxChars * 2),
      maxOutputTokens: m.maxOutputTokens || 2048,
    },
    canDo: m.canDo,
    bestFor: m.bestFor,
  }))
}

function buildGithubAgent() {
  return {
    id: 'github',
    provider: 'github',
    providerLabel: 'GitHub',
    modelId: 'github',
    modelPath: null,
    label: 'GitHub Integration',
    pipelineActive: Boolean(import.meta.env.VITE_GITHUB_REPO?.trim()),
    capabilities: ['github_commit'],
    limits: {
      dailyCalls: 5000,
      rpm: 60,
      maxInputChars: 500000,
      maxOutputTokens: 0,
    },
    canDo: ['Repo files read / update via PAT'],
    bestFor: 'Code/repo workflows only',
  }
}

export const AI_AGENTS = [...buildGeminiAgents(), buildGithubAgent()]

export function getAgentById(id) {
  return AI_AGENTS.find((a) => a.id === id) || null
}

export function getTaskType(id) {
  return TASK_TYPES[id] || null
}

/** 100% confidence required — agent must be in preferred list OR strong capability match */
export function computeAgentConfidence(agent, taskType) {
  const def = TASK_TYPES[taskType]
  if (!def) return 0

  if (taskType === 'github_commit') {
    return agent.id === 'github' ? 1 : 0
  }

  if (!agent.capabilities.includes(taskType)) return 0

  if (def.preferredAgents?.includes(agent.id)) return 1

  const keys = TASK_CAPABILITY_MAP[taskType] || []
  const strong = keys.filter((k) => agentCanDoText(agent, [k])).length
  const ratio = keys.length ? strong / keys.length : 0

  if (taskType === 'competitor_analysis' || taskType === 'action_plan') {
    if (agent.id === 'gemini-2.0-flash') return 1
    return ratio >= 0.75 ? 0.9 : 0.6
  }

  return ratio >= 0.5 ? 1 : 0.7
}

export function evaluateAgentForTask(agent, task, usageToday = {}, busyAgentIds = new Set()) {
  const taskDef = TASK_TYPES[task.task_type]
  if (!taskDef) {
    return { accept: false, confidence: 0, reason: 'unknown task type' }
  }

  if (busyAgentIds.has(agent.id)) {
    return { accept: false, confidence: 0, reason: 'abhi busy hai — pehle current task khatam hone do' }
  }

  if (!agent.pipelineActive && agent.id !== 'github') {
    return { accept: false, confidence: 0, reason: 'standby — pipeline me active nahi' }
  }

  const confidence = computeAgentConfidence(agent, task.task_type)
  if (confidence < 1) {
    return {
      accept: false,
      confidence,
      reason: `100% sure nahi (${Math.round(confidence * 100)}%) — task chhoda`,
    }
  }

  const inputLen = (task.input_text || '').length
  const maxChars = taskDef.maxInputChars
  if (inputLen > agent.limits.maxInputChars) {
    return {
      accept: false,
      confidence,
      reason: `input bahut bada (${inputLen} > ${agent.limits.maxInputChars} limit)`,
    }
  }

  const needed = task.estimated_calls ?? taskDef.estimatedCalls ?? 1
  const used = usageToday[agent.id] || 0
  const remaining = agent.limits.dailyCalls - used
  if (remaining < needed) {
    return {
      accept: false,
      confidence,
      reason: `daily limit kaafi nahi (chahiye ${needed}, bacha ${remaining})`,
    }
  }

  return { accept: true, confidence, reason: 'capable + limit OK', remaining, needed }
}

export function pickAgentForTask(task, usageToday = {}, busyAgentIds = new Set()) {
  const evaluations = AI_AGENTS.map((agent) => ({
    agent,
    ...evaluateAgentForTask(agent, task, usageToday, busyAgentIds),
  }))

  const capable = evaluations.filter((e) => e.accept)
  if (!capable.length) {
    return { agent: null, evaluations, reason: 'koi capable + free agent nahi mila' }
  }

  capable.sort((a, b) => {
    const pref = TASK_TYPES[task.task_type]?.preferredAgents || []
    const aPref = pref.indexOf(a.agent.id)
    const bPref = pref.indexOf(b.agent.id)
    const aScore = aPref >= 0 ? aPref : 99
    const bScore = bPref >= 0 ? bPref : 99
    if (aScore !== bScore) return aScore - bScore
    return (b.remaining ?? 0) - (a.remaining ?? 0)
  })

  return { agent: capable[0].agent, evaluations, reason: 'best fit' }
}

export function agentStatusLabel(agent, { busy, exhausted }) {
  if (busy) return 'busy'
  if (exhausted) return 'exhausted'
  if (!agent.pipelineActive && agent.id !== 'github') return 'standby'
  return 'idle'
}

export function agentStatusBadgeClass(status) {
  if (status === 'idle') return 'done'
  if (status === 'busy') return 'processing'
  if (status === 'exhausted') return 'failed'
  return 'pending'
}

export function centerTaskBadgeClass(status) {
  if (status === 'completed') return 'done'
  if (status === 'processing' || status === 'assigning') return 'processing'
  if (status === 'failed' || status === 'no_agent') return 'failed'
  return 'pending'
}

export function formatCenterTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export const GITHUB_DEFAULT_REPO = import.meta.env.VITE_GITHUB_REPO || ''
