import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TEMP_AI_MODELS, TEMP_KEY_SLOT_NAMES, TEMP_TASK_MODEL_MAP } from '../data/tempAiModels'
import { getTempModelUsageSnapshot } from '../services/tempAiLoop'

export default function TempModelsPage() {
  const usage = useMemo(() => getTempModelUsageSnapshot(), [])

  return (
    <div className="feature-hub temp-models-page">
      <nav className="feature-breadcrumb">
        <Link to="/temp">← Temp AI</Link>
        <span> / AI models and limits</span>
      </nav>

      <p className="feature-hub-intro">
        Sirf ye models · keys {TEMP_KEY_SLOT_NAMES.join(', ')} · dusri pipelines me use nahi
      </p>

      <section className="temp-key-lock-banner">
        <strong>🔒 Key lock</strong>
        <span>Config file: <code>temp/.env</code> — keys locked; bulk/audit pipeline in keys use nahi karti</span>
      </section>

      <h3 className="temp-section-title">Models</h3>
      <div className="temp-model-table-wrap">
        <table className="temp-model-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Tier</th>
              <th>RPM</th>
              <th>RPD</th>
              <th>Best for</th>
              <th>Can do</th>
              <th>Aaj (local)</th>
            </tr>
          </thead>
          <tbody>
            {TEMP_AI_MODELS.map((m) => {
              const u = usage.models[m.id]
              return (
                <tr key={m.id}>
                  <td>
                    <strong>{m.label}</strong>
                    <code className="temp-model-id">{m.id}</code>
                  </td>
                  <td>
                    <span className={`temp-tier temp-tier-${m.tier}`}>{m.tier}</span>
                    {m.freeTier === 'limited' && <span className="temp-free-note"> limited free</span>}
                  </td>
                  <td>{m.rpm}</td>
                  <td>{m.rpd}</td>
                  <td>{m.bestFor}</td>
                  <td>
                    <ul className="temp-cando">
                      {m.canDo.slice(0, 3).map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </td>
                  <td>{u ? `${u.usedToday} / ${u.rpd}` : `0 / ${m.rpd}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h3 className="temp-section-title">Task → model auto-assign</h3>
      <div className="temp-task-map">
        {Object.entries(TEMP_TASK_MODEL_MAP).map(([task, models]) => (
          <div key={task} className="temp-task-row">
            <strong>{task}</strong>
            <span>{models.join(' → ')}</span>
          </div>
        ))}
      </div>

      <p className="ai-muted" style={{ marginTop: '1rem' }}>
        Live Google limits: AI Studio → Rate limits. Local usage reset daily (UTC date). Busy model pe loop wait karta hai.
      </p>
    </div>
  )
}
