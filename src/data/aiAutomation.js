/** Bulk LLM pipeline — n8n → Supabase → Edge Function → Google Gemini */

export const PIPELINE_STEPS = [
  { step: '1', title: 'bulk_tasks table', where: 'Supabase SQL migration 008' },
  { step: '2', title: 'process-llm-task', where: 'Supabase Edge Function (Gemini)' },
  { step: '3', title: 'Database trigger (pg_net)', where: 'Auto — migration 009' },
  { step: '4', title: 'Gemini keys', where: 'Supabase secrets: GEMINI_API_KEY + rotation pool' },
  { step: '5', title: 'n8n enqueue (optional)', where: 'VITE_N8N_BULK_LLM_WEBHOOK_URL' },
]

/** Active Gemini models — sirf ye use hote hain */
export const GEMINI_MODELS = [
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash (latest)',
    isDefault: true,
    rpm: 15,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    pricingNote: 'Free tier — Google AI Studio RPM/TPD limits',
    bestFor: 'Fast classify — sab keys is par kaam karti hain',
    canDo: [
      'Product lines → category groups (bulk_tasks demo)',
      'Shop inventory / ticket list JSON classify',
      'Short SEO meta drafts',
    ],
  },
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    rpm: 30,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    pricingNote: 'Free tier — higher RPM',
    bestFor: 'High-volume daily batches',
    canDo: [
      'Simple category tagging',
      'Short summaries',
    ],
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    rpm: 15,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    pricingNote: 'Free tier — quota alag track hoti hai',
    bestFor: 'Structured JSON output',
    canDo: [
      'Detailed classify with reasoning',
      'Multi-category JSON grouping',
    ],
  },
]

/** .env key names for rotation pool (values UI me kabhi mat dikhao) */
export const GEMINI_ENV_KEYS = [
  { key: 'GEMINI_API_KEY', note: 'Primary key — Edge Function pehle isse try karta hai' },
  { key: 'GEMINI_MODEL', note: 'Default model id (gemini-2.0-flash)' },
  { key: 'Google_API_KEY1–3', note: 'Rotation pool' },
  { key: 'GEMINI_API_KEY4–9', note: 'Rotation pool (AIza + AQ tokens)' },
]

export const APP_PIPELINE_LIMITS = {
  uiInputMaxChars: 4000,
  edgeMaxOutputTokens: 1024,
  promptOverheadChars: 800,
  insertMaxChars: 4800,
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
  const raw = String(rawText || '').trim().slice(0, APP_PIPELINE_LIMITS.uiInputMaxChars)
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
  const id = getGeminiModel()
  return GEMINI_MODELS.find((m) => m.id === id) || GEMINI_MODELS[0]
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

export const SUPABASE_SECRETS = [
  {
    key: 'GEMINI_API_KEY',
    required: true,
    note: 'Primary Google AI Studio key (AIza…)',
    example: 'AIzaSy…',
  },
  {
    key: 'GEMINI_MODEL',
    required: false,
    note: 'gemini-2.0-flash | gemini-2.0-flash-lite | gemini-1.5-flash',
    example: 'gemini-2.0-flash',
  },
  {
    key: 'GEMINI_API_KEY4–9',
    required: false,
    note: 'Optional rotation pool — supabase secrets set individually',
    example: 'AQ.… or AIza…',
  },
]

export const VITE_ENV_VARS = [
  { key: 'VITE_AI_ENABLED', example: 'true', note: 'AI Automation page active' },
  { key: 'VITE_GEMINI_MODEL', example: 'gemini-2.0-flash', note: 'Display: expected Gemini model' },
  {
    key: 'VITE_N8N_BULK_LLM_WEBHOOK_URL',
    example: 'https://.../webhook/bulk-llm-enqueue',
    note: 'n8n bulk enqueue webhook (optional)',
  },
  ...GEMINI_ENV_KEYS.map((row) => ({
    key: row.key,
    example: 'see .env',
    note: row.note,
  })),
]

export const N8N_ENV_VARS = [
  { key: 'SUPABASE_URL', required: true, note: 'bulk_tasks INSERT ke liye', example: 'https://xxx.supabase.co' },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    note: 'n8n Supabase Insert (Render env only)',
    example: 'service_role key',
  },
  { key: 'GEMINI_API_KEY', required: false, note: 'Audit gap analysis (n8n snippets)', example: 'AIzaSy…' },
]

export const SETUP_COMMANDS = [
  'supabase login',
  'supabase link --project-ref YOUR_PROJECT_REF',
  'supabase db push',
  'supabase functions deploy process-llm-task --no-verify-jwt',
  'supabase secrets set GEMINI_API_KEY=<AIza-key> GEMINI_MODEL=gemini-2.0-flash',
  'npm run gemini:test',
]

export function getGeminiModel() {
  return (import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-latest').toLowerCase()
}

export function isAiEnabled() {
  const v = import.meta.env.VITE_AI_ENABLED
  return v === 'true' || v === '1'
}

export function isBulkWebhookConfigured() {
  return Boolean(import.meta.env.VITE_N8N_BULK_LLM_WEBHOOK_URL?.trim())
}

export function statusBadgeClass(status) {
  if (status === 'completed') return 'done'
  if (status === 'processing') return 'processing'
  if (status === 'failed') return 'failed'
  return 'pending'
}
