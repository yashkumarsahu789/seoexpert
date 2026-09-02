/** Load tools/.env + process.env (Node scripts / GitHub Actions) */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const TOOLS_ROOT = path.resolve(__dirname, '../..')
export const REPO_ROOT = path.resolve(TOOLS_ROOT, '..')

const DEFAULT_FIREBASE = {
  VITE_FIREBASE_API_KEY: 'AIzaSyDuxCtAveHMxGcbAOmuc25IgKVT__4deTY',
  VITE_FIREBASE_AUTH_DOMAIN: 'manager-fc26f.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'manager-fc26f',
  VITE_FIREBASE_STORAGE_BUCKET: 'manager-fc26f.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '534713538513',
  VITE_FIREBASE_APP_ID: '1:534713538513:web:733bddf9ca23963a5e32f0',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-0HG93MWWTZ',
}

export function loadAutomationEnv() {
  const out = { ...process.env }
  const envPaths = [path.join(TOOLS_ROOT, '.env'), path.join(REPO_ROOT, '.env')]
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const key = t.slice(0, eq).trim()
      const val = t.slice(eq + 1).trim()
      if (!out[key]) out[key] = val
    }
  }

  // Fallbacks for Firebase client config
  for (const [k, v] of Object.entries(DEFAULT_FIREBASE)) {
    if (!out[k] || !out[k].trim()) {
      out[k] = v
    }
  }

  // Normalize aliases
  if (!out.GROQ_API_KEY && out.grok) out.GROQ_API_KEY = out.grok
  if (!out['sambanova.ai'] && out.SAMBANOVA_API_KEY) out['sambanova.ai'] = out.SAMBANOVA_API_KEY
  if (!out.SAMBANOVA_API_KEY && out['sambanova.ai']) out.SAMBANOVA_API_KEY = out['sambanova.ai']
  if (!out.SERPER_API_KEY && out.SERPer_API_KEY) out.SERPER_API_KEY = out.SERPer_API_KEY

  return out
}

export function automationConfig(env = loadAutomationEnv()) {
  return {
    dailyMax: Math.max(1, Math.min(Number(env.KEYWORD_PAGES_DAILY_MAX || 1), 1)),
    useAi: String(env.KEYWORD_PAGES_USE_AI || 'true').toLowerCase() !== 'false',
    publicBase: (env.VITE_KEYWORD_PAGES_PUBLIC_BASE || env.KEYWORD_PAGES_PUBLIC_BASE || 'https://shop.LifeSolveNow.com/pages').replace(/\/$/, ''),
    appPublicBase: (env.VITE_TOOLS_PUBLIC_URL || 'https://shop.LifeSolveNow.com').replace(/\/$/, ''),
    skipKeywords: (env.KEYWORD_PAGES_SKIP || 'chatgpt,openai chatgpt').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
    serpApiKey: env.SERP_API_KEY || '',
    serperApiKey: env.SERPER_API_KEY || env.SERPer_API_KEY || '',
  }
}
