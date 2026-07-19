export const AI_PROVIDERS = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    keyPrefix: 'AIza',
    defaultModel: 'gemini-2.0-flash',
    fields: [
      { name: 'model', label: 'Model', type: 'text', placeholder: 'gemini-2.0-flash', required: true },
    ],
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    keyPrefix: 'sk-',
    defaultModel: 'gpt-4o-mini',
    fields: [
      { name: 'model', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini', required: true },
      { name: 'organization', label: 'Organization ID (optional)', type: 'text', placeholder: 'org-...' },
    ],
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keyPrefix: 'sk-ant-',
    defaultModel: 'claude-3-5-haiku-latest',
    fields: [
      { name: 'model', label: 'Model', type: 'text', placeholder: 'claude-3-5-haiku-latest', required: true },
    ],
  },
  custom: {
    id: 'custom',
    label: 'Custom Provider',
    fields: [
      { name: 'base_url', label: 'API Base URL', type: 'text', placeholder: 'https://api.example.com/v1', required: true },
      { name: 'model', label: 'Model', type: 'text', placeholder: 'model-name', required: true },
      { name: 'auth_header', label: 'Auth Header', type: 'text', placeholder: 'Authorization', defaultValue: 'Authorization' },
      { name: 'auth_prefix', label: 'Auth Prefix', type: 'text', placeholder: 'Bearer ', defaultValue: 'Bearer ' },
    ],
  },
}

export function detectProviderFromKey(apiKey) {
  const key = String(apiKey || '').trim()
  if (!key) return 'custom'
  if (key.startsWith('AIza')) return 'gemini'
  if (key.startsWith('sk-ant-')) return 'anthropic'
  if (key.startsWith('sk-')) return 'openai'
  return 'custom'
}

export function getProviderConfig(providerId) {
  return AI_PROVIDERS[providerId] || AI_PROVIDERS.custom
}

export function maskApiKey(apiKey) {
  const key = String(apiKey || '')
  if (key.length <= 8) return '••••••••'
  return `••••${key.slice(-4)}`
}

export function buildDefaultConfig(providerId) {
  const provider = getProviderConfig(providerId)
  const config = {}
  for (const field of provider.fields) {
    if (field.defaultValue != null) config[field.name] = field.defaultValue
    else if (field.name === 'model' && provider.defaultModel) config.model = provider.defaultModel
  }
  return config
}

export const GENERATION_STAGES = {
  idle: 'Idle',
  analyzing: 'Analyzing',
  building_steps: 'Building Steps',
  compiling: 'Compiling',
  ready: 'Ready',
  failed: 'Failed',
}

export const WORKFLOW_STATUS = {
  draft: 'Draft',
  generating: 'Generating',
  ready: 'Ready',
  failed: 'Failed',
}
