/** AI Center — multi-agent registry, capability matching, self-selection rules */

import { CF_LIMITS, CF_MODELS, LLM_PROVIDERS } from './aiAutomation'

export const TASK_TYPES = {
  classify_list: {
    id: 'classify_list',
    label: 'List / product classify',
    description: 'Lines, products, tickets → category groups (JSON)',
    estimatedCalls: 1,
    maxInputChars: 4000,
    preferredAgents: ['cf-llama', 'cf-glm', 'groq-llama-3.1-8b-instant'],
  },
  seo_meta: {
    id: 'seo_meta',
    label: 'SEO meta draft',
    description: 'Title + description for pages/products',
    estimatedCalls: 1,
    maxInputChars: 2000,
    preferredAgents: ['cf-llama', 'groq-llama-3.1-8b-instant', 'cf-glm'],
  },
  keyword_intent: {
    id: 'keyword_intent',
    label: 'Keyword intent tag',
    description: 'informational / transactional / support',
    estimatedCalls: 1,
    maxInputChars: 3000,
    preferredAgents: ['cf-llama', 'groq-llama-3.1-8b-instant'],
  },
  multilingual_classify: {
    id: 'multilingual_classify',
    label: 'Multilingual classify',
    description: 'Hindi + English mixed data sorting',
    estimatedCalls: 1,
    maxInputChars: 8000,
    preferredAgents: ['cf-glm', 'hf-mistralai/Mistral-7B-Instruct-v0.3', 'groq-mixtral-8x7b-32768'],
  },
  audit_summary: {
    id: 'audit_summary',
    label: 'Audit summary',
    description: 'Findings → human-readable fix steps',
    estimatedCalls: +2,
    maxInputChars: 6000,
    preferredAgents: ['cf-deepseek', 'sambanova-Meta-Llama-3.1-70B-Instruct', 'groq-llama-3.3-70b-versatile'],
  },
  competitor_analysis: {
    id: 'competitor_analysis',
    label: 'Competitor gap analysis',
    description: 'Deep reasoning — gap report + priorities',
    estimatedCalls: 3,
    maxInputChars: 10000,
    preferredAgents: ['cf-deepseek', 'sambanova-Meta-Llama-3.1-405B-Instruct'],
  },
  action_plan: {
    id: 'action_plan',
    label: 'Action plan',
    description: 'Multi-pillar SEO/AEO/GEO prioritized plan',
    estimatedCalls: 2,
    maxInputChars: 8000,
    preferredAgents: ['cf-deepseek', 'sambanova-Meta-Llama-3.1-70B-Instruct', 'groq-llama-3.3-70b-versatile'],
  },
  github_commit: {
    id: 'github_commit',
    label: 'GitHub repo update',
    description: 'Task output → repo file commit (PAT required)',
    estimatedCalls: 1,
    maxInputChars: 500000,
    preferredAgents: ['github'],
  },
  /** Keyword Pages pipeline — tools/ daily landing + tool sites */
  keyword_page_classify: {
    id: 'keyword_page_classify',
    label: 'Keyword → brand vs tool',
    description: 'Top keyword + SERP URL → page_type JSON (brand redirect vs free tool)',
    estimatedCalls: 1,
    maxInputChars: 2000,
    preferredAgents: ['cf-llama', 'groq-llama-3.1-8b-instant', 'cf-glm'],
  },
  keyword_page_seo: {
    id: 'keyword_page_seo',
    label: 'Page SEO copy',
    description: 'Title, meta, H1/H2, features, FAQ — tool ya brand landing',
    estimatedCalls: 1,
    maxInputChars: 2500,
    preferredAgents: ['cf-llama', 'cf-glm', 'groq-llama-3.1-8b-instant'],
  },
  keyword_page_brief: {
    id: 'keyword_page_brief',
    label: 'Keyword intent + market brief',
    description: 'Kyun search ho raha, market me kya hai, page kya solve kare',
    estimatedCalls: 1,
    maxInputChars: 3000,
    preferredAgents: ['groq-llama-3.1-8b-instant', 'cf-llama', 'sambanova-Meta-Llama-3.1-70B-Instruct'],
  },
  keyword_page_design: {
    id: 'keyword_page_design',
    label: 'Visual identity + theme',
    description: 'Brand/logo colors, light/dark, professional look matching market',
    estimatedCalls: 1,
    maxInputChars: 2500,
    preferredAgents: ['groq-llama-3.1-8b-instant', 'cf-glm', 'sambanova-Meta-Llama-3.1-8B-Instruct'],
  },
  keyword_page_commit: {
    id: 'keyword_page_commit',
    label: 'Deploy keyword page HTML',
    description: 'Generated HTML → tools/public/pages/{slug}.html on GitHub',
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
  keyword_page_classify: ['keyword', 'intent', 'tag', 'classify', 'json'],
  keyword_page_seo: ['seo', 'meta', 'title', 'description'],
  keyword_page_brief: ['keyword', 'intent', 'competitor', 'reasoning'],
  keyword_page_design: ['seo', 'meta', 'title', 'description'],
  keyword_page_commit: ['repo', 'github', 'commit', 'file'],
}

function parseDailyCalls(est) {
  if (!est) return 100
  const nums = String(est).match(/\d+/g)
  if (!nums?.length) return 100
  return Math.min(...nums.map(Number))
}

function agentCanDoText(agent, keywords) {
  const hay = [...(agent.canDo || []), agent.bestFor || '', agent.label || ''].join(' ').toLowerCase()
  return keywords.some((k) => hay.includes(k.toLowerCase()))
}

function buildCfAgents() {
  return CF_MODELS.map((m) => ({
    id: `cf-${m.id}`,
    provider: 'cloudflare',
    providerLabel: 'Cloudflare Workers AI',
    modelId: m.id,
    modelPath: m.model,
    label: m.label,
    pipelineActive: true,
    capabilities: Object.keys(TASK_TYPES).filter((taskId) => {
      const keys = TASK_CAPABILITY_MAP[taskId] || []
      return agentCanDoText(m, keys)
    }),
    limits: {
      dailyCalls: parseDailyCalls(m.estDailyCalls),
      rpm: m.rpm || CF_LIMITS.textGenRpm,
      maxInputChars: Math.min(m.contextTokens / 4, CF_LIMITS.demoMaxInputChars * 2),
      maxOutputTokens: m.maxOutputTokens || 2048,
    },
    canDo: m.canDo,
    bestFor: m.bestFor,
  }))
}

function buildProviderAgents() {
  const agents = []
  for (const provider of LLM_PROVIDERS) {
    if (provider.id === 'github') {
      agents.push({
        id: 'github',
        provider: 'github',
        providerLabel: provider.label,
        modelId: 'github',
        modelPath: null,
        label: 'GitHub Integration',
        pipelineActive: Boolean(import.meta.env.VITE_GITHUB_REPO?.trim()),
        capabilities: ['github_commit', 'keyword_page_commit'],
        limits: {
          dailyCalls: 5000,
          rpm: 60,
          maxInputChars: 500000,
          maxOutputTokens: 0,
        },
        canDo: provider.canDo,
        cannotDo: provider.cannotDo,
        bestFor: provider.bestFor,
      })
      continue
    }
    for (const model of provider.models || []) {
      const id = `${provider.id}-${model.id}`
      agents.push({
        id,
        provider: provider.id,
        providerLabel: provider.label,
        modelId: model.id,
        modelPath: model.id,
        label: model.label,
        pipelineActive: provider.id === 'groq' || provider.id === 'sambanova' || provider.id === 'huggingface',
        capabilities: Object.keys(TASK_TYPES).filter((taskId) => {
          if (taskId === 'github_commit' || taskId === 'keyword_page_commit') return false
          const keys = TASK_CAPABILITY_MAP[taskId] || []
          return agentCanDoText(model, keys)
        }),
        limits: {
          dailyCalls: provider.id === 'groq' ? 200 : 100,
          rpm: 60,
          maxInputChars: Math.min((model.contextTokens || 8192) / 4, 32000),
          maxOutputTokens: model.maxOutputTokens || 4096,
        },
        canDo: model.canDo,
        bestFor: model.bestFor,
      })
    }
  }
  return agents
}

export const AI_AGENTS = [...buildCfAgents(), ...buildProviderAgents()]

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

  if (taskType === 'github_commit' || taskType === 'keyword_page_commit') {
    return agent.id === 'github' ? 1 : 0
  }

  if (!agent.capabilities.includes(taskType)) return 0

  if (def.preferredAgents?.includes(agent.id)) return 1

  const keys = TASK_CAPABILITY_MAP[taskType] || []
  const strong = keys.filter((k) => agentCanDoText(agent, [k])).length
  const ratio = keys.length ? strong / keys.length : 0

  if (taskType === 'competitor_analysis' || taskType === 'action_plan') {
    if (agent.id.includes('deepseek') || agent.modelId?.includes('405B') || agent.modelId?.includes('70b-versatile')) {
      return ratio >= 0.5 ? 1 : 0.85
    }
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
