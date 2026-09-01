/**
 * Local API for React UI — default http://127.0.0.1:3742
 * POST /api/wa/start  { "phone": "919876543210" }
 * GET  /api/wa/status
 * POST /api/wa/stop
 */
const http = require('http')
const {
  HELLO_COUNT,
  HELLO_INTERVAL_MS,
  createWaClient,
  normalizePhone,
  runHelloLoop,
} = require('./hello')

const PORT = Number(process.env.WA_SERVER_PORT || 3742)

const state = {
  connected: false,
  qrDataUrl: '',
  running: false,
  current: 0,
  total: HELLO_COUNT,
  phone: '',
  logs: [],
  error: '',
}

let client = null
let initPromise = null
let stopRequested = false
let loopPromise = null

function pushLog(line, kind = 'info') {
  state.logs.unshift({ at: new Date().toISOString(), line, kind })
  state.logs = state.logs.slice(0, 30)
  console.log(`[${kind}] ${line}`)
}

function ensureClient() {
  // Client object early set hota hai — ready se pehle return mat karo
  // (warna sendMessage → getChat undefined)
  if (client && state.connected) return Promise.resolve(client)
  if (initPromise) return initPromise

  initPromise = new Promise((resolve, reject) => {
    try {
      client = createWaClient({
        onQr: (_qr, qrDataUrl) => {
          state.qrDataUrl = qrDataUrl
          state.connected = false
          pushLog('QR ready — WhatsApp se scan karo', 'info')
        },
        onReady: () => {
          state.connected = true
          state.qrDataUrl = ''
          state.error = ''
          pushLog('WhatsApp Web connected', 'ok')
          resolve(client)
        },
        onAuthFailure: (msg) => {
          state.error = String(msg)
          initPromise = null
          pushLog(`Auth fail: ${msg}`, 'err')
          reject(new Error(msg))
        },
        onDisconnected: (reason) => {
          state.connected = false
          // next ensureClient re-init wait kare
          initPromise = null
          pushLog(`Disconnected: ${reason}`, 'warn')
        },
        onInitError: (err) => {
          state.error = err.message || 'Browser init failed'
          initPromise = null
          client = null
          reject(err)
        },
      })
    } catch (err) {
      state.error = err.message || 'Browser init failed'
      initPromise = null
      client = null
      reject(err)
      return
    }

    client.initialize().catch((err) => {
      state.error = err.message || 'Init failed'
      initPromise = null
      client = null
      reject(err)
    })
  })

  return initPromise
}

async function startLoop(phone) {
  if (state.running) {
    throw new Error('Pehle se chal raha hai')
  }

  const clean = normalizePhone(phone)
  if (!clean) throw new Error('Invalid phone')

  stopRequested = false
  state.running = true
  state.current = 0
  state.phone = clean
  state.error = ''
  pushLog(`Start — +${clean} par ${HELLO_COUNT} messages har 10 sec`, 'info')

  await ensureClient()

  loopPromise = runHelloLoop(client, clean, {
    count: HELLO_COUNT,
    intervalMs: HELLO_INTERVAL_MS,
    shouldStop: () => stopRequested,
    onProgress: (i, total, text) => {
      state.current = i
      pushLog(`Bheja: "${text}"`, 'ok')
    },
  })
    .then(() => {
      if (!stopRequested) pushLog(`Done — ${HELLO_COUNT}/${HELLO_COUNT}`, 'ok')
    })
    .catch((err) => {
      state.error = err.message || 'Send failed'
      pushLog(state.error, 'err')
    })
    .finally(() => {
      state.running = false
      loopPromise = null
    })

  return loopPromise
}

function stopLoop() {
  stopRequested = true
  state.running = false
  pushLog('Stop requested', 'warn')
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1e6) reject(new Error('Body too large'))
    })
    req.on('end', () => {
      if (!data) return resolve({})
      try {
        resolve(JSON.parse(data))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return json(res, 204, {})
  }

  try {
    if (req.url === '/api/wa/status' && req.method === 'GET') {
      return json(res, 200, {
        connected: state.connected,
        qrDataUrl: state.qrDataUrl,
        running: state.running,
        current: state.current,
        total: state.total,
        phone: state.phone,
        logs: state.logs,
        error: state.error,
        helloCount: HELLO_COUNT,
        intervalSec: HELLO_INTERVAL_MS / 1000,
      })
    }

    if (req.url === '/api/wa/start' && req.method === 'POST') {
      const body = await readBody(req)
      await startLoop(body.phone)
      return json(res, 200, { ok: true })
    }

    if (req.url === '/api/wa/stop' && req.method === 'POST') {
      stopLoop()
      return json(res, 200, { ok: true })
    }

    return json(res, 404, { error: 'Not found' })
  } catch (err) {
    return json(res, 400, { error: err.message || 'Request failed' })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`WA automation server: http://127.0.0.1:${PORT}`)
  console.log(`Test mode: ${HELLO_COUNT} messages every ${HELLO_INTERVAL_MS / 1000}s`)
  ensureClient().catch(() => {
    /* QR flow handles first connect */
  })
})
