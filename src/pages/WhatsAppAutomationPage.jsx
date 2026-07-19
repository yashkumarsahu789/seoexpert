import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HELLO_COUNT,
  fetchWaStatus,
  getCliCommand,
  isValidPhone,
  startWaHello,
  stopWaHello,
} from '../services/whatsappAutomationService'

export default function WhatsAppAutomationPage() {
  const [phone, setPhone] = useState('')
  const [running, setRunning] = useState(false)
  const [connected, setConnected] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [current, setCurrent] = useState(0)
  const [log, setLog] = useState([])
  const [error, setError] = useState('')
  const [serverOnline, setServerOnline] = useState(false)
  const pollRef = useRef(null)

  const syncStatus = useCallback(async () => {
    try {
      const s = await fetchWaStatus()
      setServerOnline(true)
      setConnected(Boolean(s.connected))
      setQrDataUrl(s.qrDataUrl || '')
      setRunning(Boolean(s.running))
      setCurrent(s.current || 0)
      setLog(s.logs || [])
      if (s.error) setError(s.error)
      return s
    } catch {
      setServerOnline(false)
      return null
    }
  }, [])

  useEffect(() => {
    syncStatus()
    pollRef.current = setInterval(syncStatus, 2000)
    return () => clearInterval(pollRef.current)
  }, [syncStatus])

  const start = useCallback(async () => {
    setError('')
    if (!isValidPhone(phone)) {
      setError('Sahi number daalo — country code ke saath ya 10 digit Indian number')
      return
    }
    if (!serverOnline) {
      setError('Pehle terminal me `npm run wa:server` chalao')
      return
    }

    try {
      await startWaHello(phone)
      await syncStatus()
    } catch (err) {
      setError(err?.message || 'Start fail')
    }
  }, [phone, serverOnline, syncStatus])

  const stop = useCallback(async () => {
    try {
      await stopWaHello()
      await syncStatus()
    } catch (err) {
      setError(err?.message || 'Stop fail')
    }
  }, [syncStatus])

  const cliCmd = getCliCommand(phone)

  return (
    <div className="feature-page">
      <nav className="feature-breadcrumb">
        <Link to="/personal">← All Features</Link>
        <span>/</span>
        <strong>WhatsApp Automation</strong>
      </nav>

      <div className="wa-panel">
        <header className="wa-panel-header">
          <h2>💬 WhatsApp Hello Demo</h2>
          <p>
            Apna number daalo — har <strong>10 sec</strong> par <strong>Hello 1</strong> aur{' '}
            <strong>Hello 2</strong> (test mode) WhatsApp par aayega.
          </p>
          <p className="wa-panel-note">
            WhatsApp Cloud API nahi — <code>whatsapp-web.js</code> se WhatsApp Web automate
            hota hai. Ek baar QR scan karo.
          </p>
        </header>

        {!serverOnline && (
          <div className="wa-card wa-card-warn">
            <h3>Step 1 — Server start karo</h3>
            <p>Terminal me project root se ye command chalao:</p>
            <code className="wa-cli">npm run wa:server</code>
            <p className="wa-hint">Ya sirf CLI test:</p>
            <code className="wa-cli">{cliCmd}</code>
          </div>
        )}

        {serverOnline && !connected && qrDataUrl && (
          <div className="wa-card">
            <h3>Step 2 — QR scan karo</h3>
            <p>WhatsApp → Linked Devices → Link a Device</p>
            <img src={qrDataUrl} alt="WhatsApp QR" className="wa-qr" />
          </div>
        )}

        <div className="wa-card">
          <label className="wa-label" htmlFor="wa-phone">
            Target WhatsApp number
          </label>
          <input
            id="wa-phone"
            type="tel"
            className="wa-input"
            placeholder="91XXXXXXXXXX ya 10 digit"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={running}
            autoComplete="tel"
          />

          <details className="wa-activate">
            <summary>Kaise kaam karta hai?</summary>
            <ol>
              <li>
                <code>npm run wa:server</code> — local Node server (port 3742)
              </li>
              <li>Pehli baar QR scan — session save hota hai (dubara scan nahi)</li>
              <li>Number daalo + Start — Hello 1, phir 10 sec baad Hello 2</li>
              <li>
                ⚠️ Test ke liye apne hi number par karo — spam se ban ho sakta hai
              </li>
            </ol>
          </details>

          {error && <p className="wa-error">{error}</p>}

          <div className="wa-actions">
            {!running ? (
              <button
                type="button"
                className="wa-btn wa-btn-primary"
                onClick={start}
                disabled={!serverOnline}
              >
                Start — {HELLO_COUNT} messages
              </button>
            ) : (
              <button type="button" className="wa-btn wa-btn-stop" onClick={stop}>
                Stop
              </button>
            )}
          </div>

          {running && (
            <div className="wa-progress">
              <div
                className="wa-progress-bar"
                style={{ width: `${(current / HELLO_COUNT) * 100}%` }}
              />
              <span>
                {current}/{HELLO_COUNT} — agla message 10 sec me
              </span>
            </div>
          )}

          {connected && !running && serverOnline && (
            <p className="wa-hint wa-hint-ok">✓ WhatsApp Web connected</p>
          )}
        </div>

        {log.length > 0 && (
          <div className="wa-card wa-log">
            <h3>Log</h3>
            <ul>
              {log.map((entry) => (
                <li key={entry.at + entry.line} className={`wa-log-${entry.kind}`}>
                  {entry.line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
