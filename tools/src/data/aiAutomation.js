/** Bulk LLM pipeline — n8n → Supabase → Edge Function → Cloudflare Workers AI */

import { seoTrendsBlock } from '../../lib/seo-trends.mjs'

export const PIPELINE_STEPS = [
  { step: '0', title: 'Cloudflare keys', where: 'Supabase secrets + .env cloudflare.*' },
  { step: '1', title: 'bulk_tasks table', where: 'Supabase SQL migration 008' },
  { step: '2', title: 'process-llm-task', where: 'Supabase Edge Function' },
  { step: '3', title: 'Database trigger (pg_net)', where: 'Auto — migration 009 applied on Supabase' },
  { step: '4', title: 'Cloudflare secrets', where: 'supabase secrets set CLOUDFLARE_*' },
  { step: '5', title: 'n8n enqueue', where: 'Supabase Insert → input_text' },
]

/** All LLM / AI keys in local .env (reference vault — values mat UI me daalo) */
export const LOCAL_LLM_ENV_KEYS = [
  {
    key: 'grok',
    providerId: 'groq',
    note: 'Groq API key (gsk_…) — ultra-fast OpenAI-compatible',
  },
  {
    key: 'sambanova.ai',
    providerId: 'sambanova',
    note: 'SambaNova Cloud API key (UUID)',
  },
  {
    key: 'huggingface',
    providerId: 'huggingface',
    note: 'Hugging Face token (hf_…) — Inference / Serverless',
  },
  {
    key: 'cloudflare.account_id',
    providerId: 'cloudflare',
    note: '32-char Account ID — Supabase CLOUDFLARE_ACCOUNT_ID me bhi',
  },
  {
    key: 'cloudflare.api_token',
    providerId: 'cloudflare',
    note: 'Workers AI token — Supabase CLOUDFLARE_API_TOKEN me bhi',
  },
  {
    key: 'github_token',
    providerId: 'github',
    note: 'GitHub PAT — repo access only (LLM nahi)',
  },
]

/** Non-Cloudflare providers stored in .env (backup / future integrations) */
export const LLM_PROVIDERS = [
  {
    id: 'groq',
    label: 'Groq',
    envKey: 'grok',
    envKeyNote: '.env me key naam grok hai (Groq gsk_ token)',
    pipelineRole: 'standby',
    docsUrl: 'https://console.groq.com/docs',
    apiBase: 'https://api.groq.com/openai/v1',
    pricingNote: 'Free tier — per-model RPM/TPM limits',
    bestFor: 'Fastest inference, OpenAI-compatible chat/completions',
    canDo: [
      'OpenAI-compatible chat/completions API',
      'Real-time bulk classify (webhook speed)',
      'JSON structured output prompts',
      'Backup jab Cloudflare quota khatam ho',
    ],
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B Versatile',
        contextTokens: 128000,
        maxOutputTokens: 32768,
        bestFor: 'Strong general + long context',
        canDo: [
          'Lambee product/competitor lists classify karna',
          'Audit action plan draft (detailed steps)',
          'Multi-category JSON grouping (50+ items)',
          'Long email/ticket threads summarize karna',
          'SEO content outline + keyword clusters',
          'Complex edge-case reasoning (ambiguous items)',
        ],
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B Instant',
        contextTokens: 128000,
        maxOutputTokens: 8192,
        bestFor: 'Cheap/fast classify & short replies',
        canDo: [
          'Fast product line → category sort (current demo jaisa)',
          'Short meta title / description generate',
          'Support ticket 1-line classify',
          'Keyword intent tag (informational / transactional)',
          'Low-latency n8n webhook responses',
          'Simple yes/no + reason JSON',
        ],
      },
      {
        id: 'mixtral-8x7b-32768',
        label: 'Mixtral 8x7B',
        contextTokens: 32768,
        maxOutputTokens: 32768,
        bestFor: 'MoE — balanced quality/speed',
        canDo: [
          'Balanced quality + speed classify',
          'Hindi + English mixed shop data sort',
          'Competitor feature list compare summarize',
          'Structured bullet summaries',
          'Moderate reasoning without 70B cost',
        ],
      },
    ],
  },
  {
    id: 'sambanova',
    label: 'SambaNova Cloud',
    envKey: 'sambanova.ai',
    pipelineRole: 'standby',
    docsUrl: 'https://docs.sambanova.ai/cloud',
    apiBase: 'https://api.sambanova.ai/v1',
    pricingNote: 'Developer tier — check SambaNova console',
    bestFor: 'Large Llama models, enterprise-grade throughput',
    canDo: [
      'Enterprise-grade Llama inference',
      'Heavy audit / competitor reports',
      'Long-form structured JSON',
      'Batch processing via OpenAI-compatible API',
    ],
    models: [
      {
        id: 'Meta-Llama-3.1-405B-Instruct',
        label: 'Llama 3.1 405B Instruct',
        contextTokens: 16384,
        maxOutputTokens: 4096,
        bestFor: 'Highest quality reasoning (slow/heavy)',
        canDo: [
          'Deep competitor gap analysis write-up',
          'Multi-pillar SEO audit narrative (SEO/AEO/GEO)',
          'Complex action plan with priorities',
          'Long requirement checklist explain karna',
          'Hardest classify cases (similar categories)',
        ],
      },
      {
        id: 'Meta-Llama-3.1-70B-Instruct',
        label: 'Llama 3.1 70B Instruct',
        contextTokens: 16384,
        maxOutputTokens: 4096,
        bestFor: 'Strong default for classify & summarize',
        canDo: [
          'Product list → category groups (JSON)',
          'Shop keyword clusters summarize',
          'Audit finding → human-readable fix steps',
          'Meta descriptions batch generate',
          'Rank/indexing report summary',
        ],
      },
      {
        id: 'Meta-Llama-3.1-8B-Instruct',
        label: 'Llama 3.1 8B Instruct',
        contextTokens: 16384,
        maxOutputTokens: 4096,
        bestFor: 'Lightweight, low latency',
        canDo: [
          'Quick ticket/product classify',
          'Short summaries (under 500 words)',
          'Simple keyword tagging',
          'Fast n8n follow-up messages',
          'Low-cost daily automation runs',
        ],
      },
    ],
  },
  {
    id: 'huggingface',
    label: 'Hugging Face Inference',
    envKey: 'huggingface',
    pipelineRole: 'standby',
    docsUrl: 'https://huggingface.co/docs/api-inference',
    apiBase: 'https://api-inference.huggingface.co/models',
    pricingNote: 'Free tier limited — Pro for higher rate limits',
    bestFor: 'Thousands of open models via model ID',
    canDo: [
      'Koi bhi public HF model ID se call',
      'Specialized models try karna (embeddings, NER, etc.)',
      'Fallback jab doosre providers down hon',
      'Custom fine-tuned models deploy karke use',
    ],
    models: [
      {
        id: 'meta-llama/Meta-Llama-3-8B-Instruct',
        label: 'Meta Llama 3 8B Instruct',
        contextTokens: 8192,
        maxOutputTokens: 4096,
        bestFor: 'General instruct, widely available',
        canDo: [
          'General product/category classify',
          'SEO meta + short product copy',
          'FAQ answers from scraped text',
          'Simple JSON extraction prompts',
        ],
      },
      {
        id: 'mistralai/Mistral-7B-Instruct-v0.3',
        label: 'Mistral 7B Instruct v0.3',
        contextTokens: 32768,
        maxOutputTokens: 4096,
        bestFor: 'Fast multilingual classify',
        canDo: [
          'Hindi / English / mixed locale data sort',
          'EU language shop listings classify',
          'Longer context than 8B Llama (32k)',
          'Competitor page text summarize',
        ],
      },
      {
        id: 'google/gemma-2-9b-it',
        label: 'Gemma 2 9B IT',
        contextTokens: 8192,
        maxOutputTokens: 4096,
        bestFor: 'Compact Google instruct model',
        canDo: [
          'Compact summaries & bullet lists',
          'Short classification tasks',
          'Lightweight content moderation labels',
          'Quick structured tags (brand, category, intent)',
        ],
      },
    ],
  },
  {
    id: 'github',
    label: 'GitHub (integration)',
    envKey: 'github_token',
    pipelineRole: 'integration',
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
    pricingNote: 'Not an LLM — repo read/write for automation',
    bestFor: 'Code/repo workflows only — delete operations avoid karo',
    canDo: [
      'Repo files read / update (PR ke through)',
      'Workflow status & CI logs check',
      'Requirements baseline sync to repo',
      'n8n / script se automated commits',
      'Issues & PR comments (read/create)',
    ],
    cannotDo: ['LLM text generate nahi', 'Repo delete / force push mat karo'],
    models: [],
  },
]

export const CF_MODELS = [
  {
    id: 'llama',
    label: 'Llama 3.1 8B Fast',
    model: '@cf/meta/llama-3.1-8b-instruct-fast',
    secretKey: 'llama',
    isDefault: true,
    rpm: 300,
    contextTokens: 128000,
    maxOutputTokens: 2048,
    defaultOutputTokens: 256,
    neuronsPer1MIn: 4119,
    neuronsPer1MOut: 34868,
    pricingNote: 'Free-tier neurons (shared daily pool)',
    estNeuronsPerCall: '30–80',
    estDailyCalls: '150–300',
    bestFor: 'Fast, cheap product/list classification',
    canDo: [
      'Product lines → category groups (current bulk_tasks demo)',
      'Shop inventory / ticket list JSON classify',
      'Short SEO meta title + description draft',
      'Keyword intent tagging (buy / info / support)',
      'Telegram alert message summarize',
      'Daily free-tier friendly bulk runs (~150–300/day)',
    ],
  },
  {
    id: 'glm',
    label: 'GLM 4.7 Flash',
    model: '@cf/zai-org/glm-4.7-flash',
    secretKey: 'glm',
    rpm: 300,
    contextTokens: 131072,
    maxOutputTokens: 8192,
    defaultOutputTokens: null,
    neuronsPer1MIn: null,
    neuronsPer1MOut: null,
    pricingNote: '$0.06 / 1M input · $0.40 / 1M output (paid)',
    estNeuronsPerCall: '40–100',
    estDailyCalls: '100–200',
    bestFor: 'Very long lists, multilingual, large context',
    canDo: [
      'Bahut lambi multi-line lists ek shot me classify',
      'Hindi + English mixed scraped data sort',
      'Competitor sitemap / crawl samples group karna',
      'Long audit requirement lists bucket karna',
      'Extended JSON output (8192 token out)',
      'Multilingual shop catalog categories',
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek R1 Distill Qwen 32B',
    model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    secretKey: 'deepseek',
    rpm: 300,
    contextTokens: 80000,
    maxOutputTokens: 8192,
    defaultOutputTokens: 256,
    neuronsPer1MIn: null,
    neuronsPer1MOut: null,
    pricingNote: '$0.50 / 1M input · $4.88 / 1M output (paid)',
    estNeuronsPerCall: '80–200',
    estDailyCalls: '50–100',
    bestFor: 'Complex reasoning (slowest, most expensive)',
    canDo: [
      'Competitor gap analysis (deep reasoning)',
      'SEO / AEO / GEO audit action plan likhna',
      'Ambiguous items jahan category clear nahi',
      'Multi-step logic: priority + impact score',
      'Technical audit findings explain karna',
      'Chain-of-thought style answers (slow, costly)',
    ],
  },
]

export const MODEL_SWITCH_COMMANDS = [
  'supabase secrets set CF_AI_MODEL=llama   # or glm / deepseek',
  'VITE_CF_AI_MODEL=llama   # .env — UI display only',
]

export const MODEL_USE_CASES = [
  { use: 'Product list categorize (current flow)', modelId: 'llama', provider: 'cloudflare' },
  { use: 'Very long multi-line lists', modelId: 'glm', provider: 'cloudflare' },
  { use: 'Complex reasoning needed', modelId: 'deepseek', provider: 'cloudflare' },
  { use: 'Fast backup API (OpenAI-compatible)', modelId: 'llama-3.1-8b-instant', provider: 'groq' },
  { use: 'Heavy quality via SambaNova', modelId: 'Meta-Llama-3.1-70B-Instruct', provider: 'sambanova' },
  { use: 'Custom open model on HF', modelId: 'meta-llama/Meta-Llama-3-8B-Instruct', provider: 'huggingface' },
]

/** Cloudflare Workers AI free-tier limits (shared neuron pool across all models) */
export const CF_LIMITS = {
  freeNeuronsPerDay: 10000,
  resetUtc: '00:00 UTC daily',
  textGenRpm: 300,
  demoMaxInputChars: 4000,
  demoMaxOutputTokens: 1024,
  /** Rough estimate: short classify call ≈ 30–80 neurons */
  estNeuronsPerDemoReq: '30–80',
  /** At ~50 neurons/req → ~200 demo calls/day on free tier (varies by input length) */
  estDemoReqsPerDay: '~150–300',
  pricingPaid: '$0.011 per 1,000 neurons above free quota (Workers Paid plan)',
  docsUrl: 'https://developers.cloudflare.com/workers-ai/platform/limits/',
}

/** Hard caps inside this app (Edge Function + UI), separate from Cloudflare model max */
export const APP_PIPELINE_LIMITS = {
  uiInputMaxChars: CF_LIMITS.demoMaxInputChars,
  edgeMaxOutputTokens: 1024,
  promptOverheadChars: 800,
  insertMaxChars: CF_LIMITS.demoMaxInputChars + 800,
}

export const DEMO_CATEGORIES = [
  'Product Inquiry',
  'Technical Support',
  'Billing & Payment',
  'Shipping & Delivery',
  'Returns & Refunds',
  'Spam / Invalid',
  'General / Other',
]

export const DEMO_SAMPLE_RAW = `iPhone 15 Pro Max
Milk 1 Litre
Nike Running Shoes
Electricity Bill June 2026
Laptop Charger
Netflix Subscription
Office Rent`

export function extractRawInput(inputText) {
  if (!inputText) return ''
  const marker = 'RAW DATA:'
  if (inputText.includes(marker)) {
    return inputText
      .split(marker)[1]
      ?.replace(/^[\s\n"]+|[\s\n"]+$/g, '')
      .trim() || ''
  }
  return inputText.trim()
}

export function formatTaskTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function buildCategoryPrompt(rawText, categories = DEMO_CATEGORIES) {
  const list = categories.map((c) => `- ${c}`).join('\n')
  const raw = String(rawText || '').trim().slice(0, CF_LIMITS.demoMaxInputChars)
  return `[demo:category]
You are a data classifier. RAW DATA may contain many separate items (lines, commas, or bullets).

Task:
1. Split into distinct items/products/lines.
2. Assign EACH item to exactly ONE allowed category.
3. Group items under category headings.

Allowed categories:
${list}

Reply ONLY with valid JSON (no markdown):
{"groups":[{"category":"<exact category>","items":["item 1","item 2"]}],"total_items":5}

Rules:
- Every item from input must appear exactly once in some group.
- Use short item names as written in input.
- Omit empty groups.

RAW DATA:
"""
${raw}
"""`
}

function tryParseJson(text) {
  if (!text) return null
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  try {
    return cleaned ? JSON.parse(cleaned) : null
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
  }
  return null
}

export function parseCategoryResponse(text) {
  const obj = tryParseJson(text)
  if (!obj) return null

  if (Array.isArray(obj.groups) && obj.groups.length > 0) {
    const groups = obj.groups
      .filter((g) => g?.category && Array.isArray(g.items))
      .map((g) => ({
        category: String(g.category),
        items: g.items.map((i) => String(i).trim()).filter(Boolean),
      }))
      .filter((g) => g.items.length > 0)

    if (groups.length === 0) return null

    const total = groups.reduce((n, g) => n + g.items.length, 0)
    return {
      mode: 'grouped',
      groups,
      total_items: typeof obj.total_items === 'number' ? obj.total_items : total,
    }
  }

  if (obj.category) {
    return { mode: 'single', ...normalizeCategoryResult(obj) }
  }
  return null
}

export function groupedSummary(parsed) {
  if (!parsed || parsed.mode !== 'grouped') return null
  return `${parsed.groups.length} categories · ${parsed.total_items} items`
}

function normalizeCategoryResult(obj) {
  return {
    category: obj.category,
    confidence: obj.confidence,
    reason: obj.reason,
    keywords: Array.isArray(obj.keywords) ? obj.keywords.slice(0, 3) : [],
  }
}

export function getActiveModelInfo() {
  const id = getCfModel()
  return CF_MODELS.find((m) => m.id === id) || CF_MODELS[0]
}

/** @deprecated single-item results only */
export function categoryResultRows(parsed) {
  if (!parsed?.category) return []
  return [
    { heading: 'Category', value: parsed.category },
    {
      heading: 'Confidence',
      value: parsed.confidence != null ? `${Math.round(parsed.confidence * 100)}%` : '—',
    },
    { heading: 'Reason', value: parsed.reason || '—' },
    {
      heading: 'Keywords',
      value: Array.isArray(parsed.keywords) && parsed.keywords.length
        ? parsed.keywords.join(', ')
        : '—',
    },
  ]
}

/** Supabase Edge Function secrets (supabase secrets set ...) */
export const SUPABASE_SECRETS = [
  {
    key: 'CLOUDFLARE_ACCOUNT_ID',
    required: true,
    note: 'Dashboard URL ya Overview tab se Account ID',
    example: 'a1b2c3d4e5f6...',
  },
  {
    key: 'CLOUDFLARE_API_TOKEN',
    required: true,
    note: 'My Profile → API Tokens → Workers AI (Edit) template',
    example: 'Bearer token (browser me mat daalo)',
  },
  {
    key: 'CF_AI_MODEL',
    required: false,
    note: 'llama | glm | deepseek | full @cf/... path',
    example: 'llama',
  },
]

/** Local .env — UI + n8n webhook only */
export const VITE_ENV_VARS = [
  { key: 'VITE_AI_ENABLED', example: 'true', note: 'AI Automation page active' },
  { key: 'VITE_CF_AI_MODEL', example: 'llama', note: 'Display: expected Workers AI model' },
  {
    key: 'VITE_N8N_BULK_LLM_WEBHOOK_URL',
    example: 'https://.../webhook/bulk-llm-enqueue',
    note: 'n8n bulk enqueue webhook (optional — direct Supabase insert bhi chalega)',
  },
  ...LOCAL_LLM_ENV_KEYS.map((row) => ({
    key: row.key,
    example: 'see .env',
    note: row.note,
  })),
]

/** Render n8n — scrape side only, no LLM keys */
export const N8N_ENV_VARS = [
  { key: 'SUPABASE_URL', required: true, note: 'bulk_tasks INSERT ke liye', example: 'https://xxx.supabase.co' },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    note: 'n8n Supabase Insert (Render env only)',
    example: 'service_role key',
  },
]

export const SETUP_COMMANDS = [
  'supabase login',
  'supabase link --project-ref YOUR_PROJECT_REF',
  'supabase db push',
  'supabase functions new process-llm-task   # already in repo — skip if exists',
  'supabase functions deploy process-llm-task --no-verify-jwt',
  'supabase secrets set CLOUDFLARE_ACCOUNT_ID=<your-32-char-id> CLOUDFLARE_API_TOKEN=<your-token> CF_AI_MODEL=llama',
  'npm run n8n:push -- bulk_llm_enqueue',
]

export function getCfModel() {
  return (import.meta.env.VITE_CF_AI_MODEL || 'llama').toLowerCase()
}

export function isAiEnabled() {
  const v = import.meta.env.VITE_AI_ENABLED
  return v === 'true' || v === '1'
}

export function isBulkWebhookConfigured() {
  return Boolean(import.meta.env.VITE_N8N_BULK_LLM_WEBHOOK_URL?.trim())
}

/** Keyword Pages pipeline — kab AI, kab sirf template/code */
export const KEYWORD_PAGES_AI_RULES = [
  {
    step: 'keyword discovery',
    usesAi: false,
    how: 'Google Suggest + shop_rank_snapshots (n8n free)',
  },
  {
    step: 'SERP top site',
    usesAi: false,
    how: 'freeSerpOrPaid scrape (n8n _free-audit-utils)',
  },
  {
    step: 'brand vs tool classify',
    usesAi: 'optional',
    taskType: 'keyword_page_classify',
    how: 'Rule-based pehle; ambiguous ho to AI classify',
  },
  {
    step: 'intent + market brief',
    usesAi: true,
    taskType: 'keyword_page_brief',
    how: 'AI pehle samjhe: kyun search, market me kya hai, user kya expect karta hai',
  },
  {
    step: 'visual identity / theme',
    usesAi: true,
    taskType: 'keyword_page_design',
    how: 'Brand logo colors, light theme, professional look — market ke hisaab se',
  },
  {
    step: 'React page build',
    usesAi: false,
    how: 'Brief + design + SEO → buildPageConfig → React components',
  },
  {
    step: 'SEO code layer',
    usesAi: false,
    how: 'JSON-LD WebPage + FAQ, OG tags, canonical — seo-trends.mjs',
  },
  {
    step: 'brand SEO copy',
    usesAi: true,
    taskType: 'keyword_page_seo',
    how: 'AI — title/meta/H1/H2/features/FAQ (tool + brand dono)',
  },
  {
    step: 'sitemap + robots.txt',
    usesAi: false,
    how: 'Auto rebuild tools/public/pages/sitemap.xml on GitHub',
  },
  {
    step: 'daily indexing request',
    usesAi: false,
    how: 'Google ping + Bing ping + IndexNow — 9 AM IST workflow bhi',
  },
  {
    step: 'daily publish',
    usesAi: true,
    how: 'scripts/daily-keyword-page.mjs — GitHub Actions cron 8 AM IST, 1 page/24h, no n8n',
  },
  {
    step: 'GitHub commit + deploy',
    usesAi: false,
    taskType: 'keyword_page_commit',
    how: 'GitHub agent → ai-center-github → GitHub Actions (1 file/day max)',
  },
]

export const KEYWORD_PAGES_LIMITS = {
  dailyPagesNoAi: 'unlimited (template/code)',
  dailyPagesWithAiSeo: '150–300 (Cloudflare free tier — same as AI Center)',
  maxPagesPerDay: 1,
  maxPagesPerCronRun: 1,
  windowHours: 24,
  edgeMaxOutputTokens: APP_PIPELINE_LIMITS.edgeMaxOutputTokens,
  githubAgentDailyCalls: 5000,
}

export function buildKeywordBriefPrompt(keyword, serpTopUrl = '', ruleHint = {}) {
  return `[keyword_page_brief]
You are a product strategist for LifeSolveNow keyword landing pages.

Analyze this search keyword BEFORE any page is built.

Reply ONLY valid JSON:
{
  "purpose": "why user searches this (1-2 sentences)",
  "intent": "navigational|informational|transactional|utility",
  "page_type": "brand|tool",
  "tool_type": "calculator|timer|bmi|password|notepad|todo|counter|landing|null",
  "market_summary": "how this exists in market today (competitors, norms)",
  "user_expectation": "what user expects on landing in first 3 seconds",
  "differentiator": "what our page should emphasize vs generic templates",
  "confidence": 0.0-1.0
}

Rules:
- brand = user wants a known website/app (youtube, amazon, gmail)
- tool = free utility in browser (calculator, timer, bmi)
- Be specific to THIS keyword — no generic filler
- SERP URL hint: ${serpTopUrl || 'none'}
- Rule-based guess: ${JSON.stringify(ruleHint).slice(0, 400)}

KEYWORD: ${String(keyword).slice(0, 500)}`
}

export function buildKeywordDesignPrompt(keyword, brief, serpTopUrl = '') {
  return `[keyword_page_design]
You are a UI/brand designer for LifeSolveNow keyword pages.

Given the market brief, design a PROFESSIONAL real-looking page theme.
Match authentic brand colors when page_type=brand (YouTube red, Google clean white, etc.).
For tools, use clean light themes unless market expects dark (e.g. dev tools).

Reply ONLY valid JSON:
{
  "theme_style": "light|dark|brand-authentic",
  "light": true,
  "bg": "#hex",
  "surface": "#hex",
  "accent": "#hex",
  "accent_text": "#hex",
  "text": "#hex",
  "muted": "#hex",
  "pattern": "grid|soft|lines|pulse|dots",
  "icon": "single emoji matching brand/tool",
  "tone": "professional|minimal|playful",
  "hero_focus": "what the main widget/button should emphasize (1 sentence)"
}

Rules:
- Colors must be real hex codes, accessible contrast
- brand-authentic: copy known brand palette (not random purple gradients)
- tool pages: prefer white/light professional unless brief says otherwise
- SERP URL: ${serpTopUrl || 'none'}

KEYWORD: ${keyword}
BRIEF:
${JSON.stringify(brief, null, 2).slice(0, 2000)}`
}

export function buildKeywordClassifyPrompt(keyword, serpTopUrl = '') {
  return `[keyword_page_classify]
Classify this search keyword for a 1-page site.

Reply ONLY valid JSON:
{"page_type":"brand"|"tool","target_url":"https://..."|null,"confidence":0.0-1.0,"reason":"..."}

Rules:
- brand = user wants a famous site (chatgpt, youtube, amazon) → target_url = official site
- tool = utility keyword (calculator, timer, bmi) → target_url null
- SERP top URL hint: ${serpTopUrl || 'none'}

KEYWORD: ${String(keyword).slice(0, 500)}`
}

export function buildKeywordSeoPrompt(keyword, pageMeta = {}) {
  const { brandName, targetUrl, pageType, toolType, label, brief } = pageMeta
  const isBrand = pageType === 'brand'
  return `[keyword_page_seo]
Write SEO + on-page copy for a LifeSolveNow keyword page.

SEO trends:
${seoTrendsBlock()}

Reply ONLY valid JSON:
{
  "title": "50-60 chars",
  "description": "150-160 chars meta",
  "h1": "main heading — specific to keyword",
  "h2": "subheading — user intent in one line",
  "features": ["3-4 key features bullets"],
  "requirements": ["2-3 how-to-use steps"],
  "faqs": [{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]
}

Rules:
- Hero uses ONLY h1 + h2 — features/requirements/faq go below fold
- ${isBrand ? 'Transparent: LifeSolveNow access page, not official site' : 'Free in-browser tool — no signup'}
- Match user_expectation from brief — no generic AI fluff
- FAQs answer real questions for this keyword

Keyword: ${keyword}
Page type: ${pageType || 'tool'}
Tool type: ${toolType || 'landing'}
Label: ${label || keyword}
${isBrand ? `Brand: ${brandName}\nRedirect: ${targetUrl}` : ''}
${brief ? `Market brief:\n${JSON.stringify(brief).slice(0, 1500)}` : ''}`
}

export function parseKeywordBriefResponse(text) {
  const obj = tryParseJsonLoose(text)
  if (!obj?.purpose) return null
  return {
    purpose: String(obj.purpose),
    intent: String(obj.intent || 'informational'),
    page_type: obj.page_type === 'brand' ? 'brand' : 'tool',
    tool_type: obj.tool_type && obj.tool_type !== 'null' ? String(obj.tool_type) : null,
    market_summary: String(obj.market_summary || ''),
    user_expectation: String(obj.user_expectation || ''),
    differentiator: String(obj.differentiator || ''),
    confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.8,
  }
}

export function parseKeywordDesignResponse(text) {
  const obj = tryParseJsonLoose(text)
  if (!obj?.accent || !obj?.bg) return null
  return {
    theme_style: String(obj.theme_style || 'light'),
    light: obj.light !== false,
    bg: String(obj.bg),
    surface: String(obj.surface || '#ffffff'),
    accent: String(obj.accent),
    accent_text: String(obj.accent_text || '#ffffff'),
    text: String(obj.text || '#0f172a'),
    muted: String(obj.muted || '#64748b'),
    pattern: ['grid', 'soft', 'lines', 'pulse', 'dots'].includes(obj.pattern) ? obj.pattern : 'soft',
    icon: String(obj.icon || '🌐'),
    tone: String(obj.tone || 'professional'),
    hero_focus: String(obj.hero_focus || ''),
  }
}

export function parseKeywordSeoResponse(text) {
  const obj = tryParseJsonLoose(text)
  if (!obj?.title) return null
  const faqs = Array.isArray(obj.faqs)
    ? obj.faqs
        .filter((f) => f?.q && f?.a)
        .map((f) => ({ q: String(f.q), a: String(f.a) }))
    : []
  return {
    title: String(obj.title),
    description: String(obj.description || ''),
    h1: String(obj.h1 || obj.title),
    h2: String(obj.h2 || ''),
    features: Array.isArray(obj.features) ? obj.features.map(String) : [],
    requirements: Array.isArray(obj.requirements) ? obj.requirements.map(String) : [],
    faqs: faqs.length ? faqs : undefined,
    bullets: Array.isArray(obj.bullets) ? obj.bullets.map(String) : [],
  }
}

function tryParseJsonLoose(text) {
  if (!text) return null
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) {
      try {
        return JSON.parse(m[0])
      } catch {
        return null
      }
    }
  }
  return null
}

export function statusBadgeClass(status) {
  if (status === 'completed') return 'done'
  if (status === 'processing') return 'processing'
  if (status === 'failed') return 'failed'
  return 'pending'
}
