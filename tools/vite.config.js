import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { runLlmChat } from './lib/llmRunner.mjs'

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function llmApiPlugin(mode) {
  return {
    name: 'llm-api-proxy',
    configureServer(server) {
      const env = loadEnv(mode, '.', '')
      server.middlewares.use('/api/llm', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        try {
          const raw = await readBody(req)
          const body = raw ? JSON.parse(raw) : {}
          const { prompt, agentId, preferredAgents, maxTokens } = body
          if (!prompt?.trim()) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'prompt required' }))
            return
          }
          const result = await runLlmChat({
            prompt,
            agentId: agentId || null,
            preferredAgents: preferredAgents || [],
            maxTokens: maxTokens || 1024,
            env,
          })
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'LLM failed' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), llmApiPlugin(mode)],
  base: '/',
  envDir: '.',
}))
