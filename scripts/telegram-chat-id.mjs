#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')

if (!existsSync(envPath)) {
  console.error('.env file missing')
  process.exit(1)
}

const env = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
const token = env
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line.startsWith('TELEGRAM_BOT_TOKEN='))
  ?.slice('TELEGRAM_BOT_TOKEN='.length)
  ?.trim()

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN empty in .env')
  process.exit(1)
}

const base = `https://api.telegram.org/bot${token}`

const [meRes, hookRes, updatesRes] = await Promise.all([
  fetch(`${base}/getMe`),
  fetch(`${base}/getWebhookInfo`),
  fetch(`${base}/getUpdates`),
])

const me = await meRes.json()
const hook = await hookRes.json()
const updates = await updatesRes.json()

console.log('\nBot:', me.result?.username ? `@${me.result.username}` : me)
console.log('Bot ID (ye CHAT_ID nahi hai):', me.result?.id ?? 'unknown')
console.log('Webhook URL:', hook.result?.url || '(none — good for getUpdates)')

const envChatId = env
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line.startsWith('TELEGRAM_CHAT_ID='))
  ?.slice('TELEGRAM_CHAT_ID='.length)
  ?.trim()

if (envChatId && me.result?.id && String(envChatId) === String(me.result.id)) {
  console.log('\n⚠️  .env TELEGRAM_CHAT_ID bot ki ID hai — tumhari personal ID alag hoti hai.')
  console.log('   @userinfobot se apna Id lo, bot ID mat use karo.')
}

if (!updates.ok || !updates.result?.length) {
  console.log('\n❌ Koi message nahi mila.')
  console.log('1. Telegram → @' + (me.result?.username || 'yourbot') + ' → /start bhejo')
  console.log('2. Phir dubara: npm run telegram:chat-id')
  console.log('\nYa @userinfobot se apna Id copy karo → TELEGRAM_CHAT_ID')
  process.exit(1)
}

const chats = new Map()
for (const u of updates.result) {
  const chat = u.message?.chat || u.edited_message?.chat
  if (chat?.id) {
    chats.set(chat.id, {
      id: chat.id,
      name: [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || chat.username,
      type: chat.type,
    })
  }
}

console.log('\n✅ Chat ID(s) mil gaye:\n')
for (const c of chats.values()) {
  console.log(`  TELEGRAM_CHAT_ID=${c.id}   (${c.name}, ${c.type})`)
}
