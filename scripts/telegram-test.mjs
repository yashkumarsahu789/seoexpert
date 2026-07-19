#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')

function readEnv(key) {
  const env = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
  const prefix = `${key}=`
  return env
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(prefix))
    ?.slice(prefix.length)
    ?.trim()
}

const token = readEnv('TELEGRAM_BOT_TOKEN')
const chatId = readEnv('TELEGRAM_CHAT_ID')

if (!token || !chatId) {
  console.error('TELEGRAM_BOT_TOKEN aur TELEGRAM_CHAT_ID .env me bharo')
  process.exit(1)
}

const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: `✅ LifeSolveNow test OK\n${now} (IST)\nChat ID sahi hai — n8n ab msg bhej sakta hai.`,
    disable_notification: false,
  }),
})

const data = await res.json()
if (!data.ok) {
  console.error('❌ Failed:', data.description || data)
  if (data.description?.includes('chat not found')) {
    console.error('→ @lifesolvenowbot ko /start bhejo, phir dubara try karo')
  }
  process.exit(1)
}

console.log('✅ Test message bhej diya — Telegram check karo (notification aani chahiye)')
console.log('Chat ID:', chatId)
