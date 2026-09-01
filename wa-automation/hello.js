const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcodeTerminal = require('qrcode-terminal')
const QRCode = require('qrcode')
const { getBrowserHelpMessage, getPuppeteerConfig } = require('./browser')

const HELLO_COUNT = 2
const HELLO_INTERVAL_MS = 10_000

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

function toChatId(phone) {
  return `${normalizePhone(phone)}@c.us`
}

function createWaClient(handlers = {}) {
  const { config: puppeteerConfig, executablePath } = getPuppeteerConfig()
  if (!executablePath) {
    const err = new Error(getBrowserHelpMessage())
    process.nextTick(() => handlers.onInitError?.(err))
    throw err
  }

  console.log(`Browser: ${executablePath}`)

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: puppeteerConfig,
  })

  client.on('qr', async (qr) => {
    console.log('\nWhatsApp QR — phone se Linked Devices > Link a Device se scan karo:\n')
    qrcodeTerminal.generate(qr, { small: true })
    let qrDataUrl = ''
    try {
      qrDataUrl = await QRCode.toDataURL(qr)
    } catch {
      /* ignore */
    }
    handlers.onQr?.(qr, qrDataUrl)
  })

  client.on('ready', () => {
    console.log('WhatsApp Web connected.')
    handlers.onReady?.()
  })

  client.on('authenticated', () => {
    handlers.onAuthenticated?.()
  })

  client.on('auth_failure', (msg) => {
    console.error('Auth failure:', msg)
    handlers.onAuthFailure?.(msg)
  })

  client.on('disconnected', (reason) => {
    console.warn('Disconnected:', reason)
    handlers.onDisconnected?.(reason)
  })

  return client
}

async function resolveChatId(client, phone) {
  const digits = normalizePhone(phone)
  if (!digits) throw new Error('Invalid phone number')

  // Prefer WhatsApp-registered id (handles number format / LID)
  try {
    const wid = await client.getNumberId(digits)
    if (wid?._serialized) return wid._serialized
  } catch (err) {
    console.warn('getNumberId failed, fallback chatId:', err.message)
  }

  return toChatId(digits)
}

async function waitForStore(client, timeoutMs = 45_000) {
  const page = client.pupPage
  if (!page) {
    // Ready event ke baad thoda wait — Store inject ho
    await sleep(2500)
    return
  }

  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const ready = await page.evaluate(() => {
        // eslint-disable-next-line no-undef
        const store = window.Store
        return Boolean(store && store.Chat && typeof store.Chat.get === 'function')
      })
      if (ready) return
    } catch {
      /* page not ready yet */
    }
    await sleep(500)
  }

  // Last try — sendMessage still often works after short settle
  await sleep(1500)
}

async function runHelloLoop(client, phone, options = {}) {
  const count = options.count ?? HELLO_COUNT
  const intervalMs = options.intervalMs ?? HELLO_INTERVAL_MS
  const onProgress = options.onProgress || (() => {})
  const shouldStop = options.shouldStop || (() => false)

  if (!normalizePhone(phone)) {
    throw new Error('Invalid phone number')
  }

  if (!client?.info) {
    throw new Error('WhatsApp client ready nahi hai — QR scan / wait karo')
  }

  await waitForStore(client)
  const chatId = await resolveChatId(client, phone)
  console.log(`Resolved chat: ${chatId}`)

  for (let i = 1; i <= count; i += 1) {
    if (shouldStop()) break

    const messageText = `Hello ${i}`
    await client.sendMessage(chatId, messageText)
    console.log(`Sent: ${messageText} -> ${chatId}`)
    onProgress(i, count, messageText)

    if (i < count && !shouldStop()) {
      await sleep(intervalMs)
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = {
  HELLO_COUNT,
  HELLO_INTERVAL_MS,
  normalizePhone,
  toChatId,
  createWaClient,
  runHelloLoop,
  sleep,
}
