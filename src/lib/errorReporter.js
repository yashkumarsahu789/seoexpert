import { reportErrorToN8N } from '../services/n8nService.js'

let initialized = false

export function initErrorReporter() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    reportErrorToN8N({
      message: reason?.message || String(reason || 'Unhandled rejection'),
      statusCode: 500,
    })
  })
}
