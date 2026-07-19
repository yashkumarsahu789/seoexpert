/**
 * CLI: node index.js 919876543210
 * Ek baar QR scan — phir Hello 1, Hello 2 har 10 sec (test mode).
 */
const { createWaClient, normalizePhone, runHelloLoop } = require('./hello')

const phoneArg = process.argv[2] || process.env.WA_TARGET_PHONE || ''
const phone = normalizePhone(phoneArg)

if (!phone) {
  console.error('Usage: node index.js <phone>')
  console.error('Example: node index.js 919876543210')
  process.exit(1)
}

console.log(`Target: ${phone} — 2 messages har 10 sec`)

const client = createWaClient()

client.on('ready', async () => {
  try {
    await runHelloLoop(client, phone)
    console.log('Done — 2/2 messages bhej diye.')
  } catch (err) {
    console.error('Loop error:', err.message || err)
  } finally {
    setTimeout(() => process.exit(0), 1500)
  }
})

client.initialize().catch((err) => {
  console.error('Init failed:', err.message || err)
  process.exit(1)
})
