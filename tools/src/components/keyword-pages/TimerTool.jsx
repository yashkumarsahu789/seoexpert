import { useEffect, useRef, useState } from 'react'
import PageShell from './PageShell'

export default function TimerTool({ config }) {
  const [secs, setSecs] = useState(60)
  const [left, setLeft] = useState(60)
  const [running, setRunning] = useState(false)
  const ref = useRef(null)

  useEffect(() => () => clearInterval(ref.current), [])

  const start = () => {
    clearInterval(ref.current)
    let s = Number(secs) || 60
    setLeft(s)
    setRunning(true)
    ref.current = setInterval(() => {
      s -= 1
      setLeft(s)
      if (s <= 0) {
        clearInterval(ref.current)
        setRunning(false)
      }
    }, 1000)
  }

  const stop = () => {
    clearInterval(ref.current)
    setRunning(false)
  }

  const hero = (
    <div className="kp-panel kp-panel--feature kp-panel--center">
      <p className="kp-result" aria-live="polite">
        {left}s
      </p>
      <input
        className="kp-input"
        type="number"
        min={1}
        value={secs}
        disabled={running}
        onChange={(e) => setSecs(e.target.value)}
        aria-label="Timer seconds"
      />
      <div className="kp-row">
        <button type="button" className="kp-btn" onClick={start} disabled={running}>
          Start
        </button>
        <button type="button" className="kp-btn kp-btn--ghost" onClick={stop}>
          Stop
        </button>
      </div>
    </div>
  )

  return <PageShell config={config} hero={hero} />
}
