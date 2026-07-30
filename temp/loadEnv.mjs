/**
 * Load temp/.env — shared by setup scripts (not imported in browser).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const TEMP_ENV_PATH = resolve(__dirname, '.env')

export function loadTempEnv() {
  if (!existsSync(TEMP_ENV_PATH)) {
    throw new Error(`temp/.env missing — copy temp/.env.example → temp/.env`)
  }

  const env = {}
  for (const line of readFileSync(TEMP_ENV_PATH, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    const val = t.slice(i + 1).trim()
    if (key && val) env[key] = val
  }
  return env
}

export function requireTempEnv(keys) {
  const env = loadTempEnv()
  const missing = keys.filter((k) => !env[k]?.trim())
  if (missing.length) {
    throw new Error(`temp/.env me missing: ${missing.join(', ')}`)
  }
  return env
}
