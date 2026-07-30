import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Merge temp/.env VITE_* into process.env (standalone /temp config) */
function loadTempEnvForVite() {
  const envPath = resolve(process.cwd(), 'temp/.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    const val = t.slice(i + 1).trim()
    if (key.startsWith('VITE_') && val) process.env[key] = val
  }
}

loadTempEnvForVite()

const N8N_TARGET =
  process.env.VITE_N8N_BASE_URL?.replace(/\/$/, '') || 'https://lifesolvenow.onrender.com'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/seoexpert/' : '/',
  server: {
    proxy: {
      '/api/n8n': {
        target: N8N_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/n8n/, ''),
      },
    },
  },
})
