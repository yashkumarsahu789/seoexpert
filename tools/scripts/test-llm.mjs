import { loadEnv } from 'vite'
import { runLlmChat } from '../lib/llmRunner.mjs'

const env = loadEnv('development', '.', '')
const result = await runLlmChat({
  prompt: 'Reply only: {"ok":true}',
  agentId: 'groq-llama-3.1-8b-instant',
  maxTokens: 30,
  env,
})
console.log('OK', result.agentId, result.text.slice(0, 80))
