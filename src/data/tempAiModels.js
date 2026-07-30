/**
 * /temp — Google AI Studio model catalog + limits
 * Keys: TEMP_GOOGLE_API_KEY1–3 only (locked to this folder)
 *
 * Limits are conservative free-tier estimates — live values:
 * https://aistudio.google.com/rate-limit
 */

export const TEMP_KEY_SLOT_NAMES = [
  'TEMP_GOOGLE_API_KEY1',
  'TEMP_GOOGLE_API_KEY2',
  'TEMP_GOOGLE_API_KEY3',
]

/** Task kinds → preferred model ids — kaam aate hi auto pick (busy/limit pe wait) */
export const TEMP_TASK_MODEL_MAP = {
  classify: ['gemini-2.0-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.0-flash'],
  seo_meta: ['gemini-2.0-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash'],
  keyword: ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'],
  multilingual: ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'],
  summary: ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'],
  audit: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'],
  competitor: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
  action_plan: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-pro'],
  deep_reason: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  general: ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
}

export const TEMP_AI_MODELS = [
  {
    id: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    tier: 'lite',
    freeTier: true,
    rpm: 30,
    rpd: 1500,
    tpm: 1000000,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    bestFor: 'High-volume simple classify / short tags',
    canDo: [
      'Product / ticket line classify',
      'Short SEO meta drafts',
      'Keyword intent tags',
      'Yes/no + reason JSON',
    ],
  },
  {
    id: 'gemini-flash-lite-latest',
    label: 'Gemini Flash Lite (latest)',
    tier: 'lite',
    freeTier: true,
    rpm: 30,
    rpd: 1500,
    tpm: 1000000,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    bestFor: 'Cheapest / fastest bulk runs',
    canDo: ['Simple category tagging', 'Short summaries', 'Low-latency webhook replies'],
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash (latest)',
    tier: 'flash',
    freeTier: true,
    rpm: 15,
    rpd: 1500,
    tpm: 1000000,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    bestFor: 'Default daily automation workhorse',
    canDo: [
      'Bulk list classify',
      'SEO meta + keyword clusters',
      'Hindi + English light mix',
      'Structured JSON groups',
    ],
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    tier: 'flash',
    freeTier: true,
    rpm: 15,
    rpd: 1500,
    tpm: 1000000,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    bestFor: 'Structured JSON + medium reasoning',
    canDo: [
      'Audit summary → fix steps',
      'Multi-category JSON grouping',
      'Action plan drafts',
      'Competitor feature list summarize',
    ],
  },
  {
    id: 'gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash 001',
    tier: 'flash',
    freeTier: true,
    rpm: 15,
    rpd: 1500,
    tpm: 1000000,
    contextTokens: 1048576,
    maxOutputTokens: 8192,
    bestFor: 'Pinned stable Flash revision',
    canDo: ['Same as 2.0 Flash — pinned ID for reproducible runs'],
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    tier: 'flash',
    freeTier: true,
    rpm: 10,
    rpd: 1500,
    tpm: 1000000,
    contextTokens: 1048576,
    maxOutputTokens: 65536,
    bestFor: 'Stronger Flash — multimodal + longer out',
    canDo: [
      'Deeper audit / competitor write-ups',
      'Longer action plans',
      'Image + text inputs (when needed)',
    ],
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    tier: 'lite',
    freeTier: true,
    rpm: 15,
    rpd: 1500,
    tpm: 1000000,
    contextTokens: 1048576,
    maxOutputTokens: 65536,
    bestFor: '2.5-family cheap / fast lane',
    canDo: ['High-volume 2.5 classify', 'Short structured replies'],
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    tier: 'pro',
    freeTier: 'limited',
    rpm: 5,
    rpd: 50,
    tpm: 250000,
    contextTokens: 1048576,
    maxOutputTokens: 65536,
    bestFor: 'Deep reasoning (tight free quota)',
    canDo: [
      'Hard competitor gap analysis',
      'Multi-pillar SEO/AEO/GEO strategy',
      'Ambiguous edge-case classify',
    ],
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    tier: 'lite',
    freeTier: true,
    rpm: 15,
    rpd: 1000,
    tpm: 250000,
    contextTokens: 1048576,
    maxOutputTokens: 65536,
    bestFor: 'Newer lite — cost-sensitive prototypes',
    canDo: ['Fast text classify', 'Short multimodal prompts'],
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    tier: 'flash',
    freeTier: true,
    rpm: 10,
    rpd: 1500,
    tpm: 250000,
    contextTokens: 1048576,
    maxOutputTokens: 65536,
    bestFor: 'Latest Flash general work (verify free row in AI Studio)',
    canDo: ['General automation', 'Structured JSON', 'Summaries'],
  },
]

export function getTempModel(id) {
  return TEMP_AI_MODELS.find((m) => m.id === id) || null
}

export function preferredModelsForTask(taskType) {
  const ids = TEMP_TASK_MODEL_MAP[taskType] || TEMP_TASK_MODEL_MAP.general
  return ids.map(getTempModel).filter(Boolean)
}
