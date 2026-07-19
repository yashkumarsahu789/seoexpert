const WA_API = import.meta.env.VITE_WA_AUTOMATION_URL || 'http://127.0.0.1:3742'

export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

export function isValidPhone(raw) {
  const digits = normalizePhone(raw)
  return digits.length >= 10 && digits.length <= 15
}

export const HELLO_COUNT = 2
export const HELLO_INTERVAL_MS = 10_000

export async function fetchWaStatus() {
  const res = await fetch(`${WA_API}/api/wa/status`)
  if (!res.ok) throw new Error(`Server offline (${res.status})`)
  return res.json()
}

export async function startWaHello(phone) {
  const res = await fetch(`${WA_API}/api/wa/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizePhone(phone) }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Start failed (${res.status})`)
  return data
}

export async function stopWaHello() {
  const res = await fetch(`${WA_API}/api/wa/stop`, { method: 'POST' })
  if (!res.ok) throw new Error(`Stop failed (${res.status})`)
  return res.json()
}

export function getCliCommand(phone) {
  const clean = normalizePhone(phone) || '919876543210'
  return `npm run wa:hello -- ${clean}`
}
