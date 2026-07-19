import { useState } from 'react'
import PageShell from './PageShell'

export default function CalculatorTool({ config }) {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')

  const calc = () => {
    try {
      const val = Function(`"use strict"; return (${expr})`)()
      setResult(String(val))
    } catch {
      setResult('Invalid')
    }
  }

  const hero = (
    <div className="kp-panel kp-panel--feature">
      <input
        className="kp-input"
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        placeholder="e.g. 25 * 4 + 10"
        onKeyDown={(e) => e.key === 'Enter' && calc()}
        aria-label="Calculation expression"
      />
      <button type="button" className="kp-btn" onClick={calc}>
        Calculate
      </button>
      {result !== '' && <p className="kp-result" aria-live="polite">{result}</p>}
    </div>
  )

  return <PageShell config={config} hero={hero} />
}
