/** Load tools/.env + process.env (Node scripts / GitHub Actions) */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const TOOLS_ROOT = path.resolve(__dirname, '../..')
export const REPO_ROOT = path.resolve(TOOLS_ROOT, '..')

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
