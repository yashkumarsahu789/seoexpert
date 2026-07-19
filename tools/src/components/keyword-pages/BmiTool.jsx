import { useState } from 'react'
import PageShell from './PageShell'

export default function BmiTool({ config }) {
  const [kg, setKg] = useState('')
  const [cm, setCm] = useState('')
  const [bmi, setBmi] = useState(null)

  const run = () => {
    const w = parseFloat(kg)
    const h = parseFloat(cm) / 100
    if (!w || !h) return
    setBmi((w / (h * h)).toFixed(1))
  }

  const hero = (
    <div className="kp-panel kp-panel--feature">
      <div className="kp-row">
        <input
          className="kp-input"
          type="number"
          placeholder="Weight (kg)"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          aria-label="Weight in kg"
        />
        <input
          className="kp-input"
          type="number"
          placeholder="Height (cm)"
          value={cm}
          onChange={(e) => setCm(e.target.value)}
          aria-label="Height in cm"
        />
      </div>
      <button type="button" className="kp-btn" onClick={run}>
        Get BMI
      </button>
      {bmi && (
        <p className="kp-result" aria-live="polite">
          {bmi}
        </p>
      )}
    </div>
  )

  return <PageShell config={config} hero={hero} />
}
