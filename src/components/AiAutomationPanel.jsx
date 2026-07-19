import { useCallback, useEffect, useState } from 'react'
import {
  APP_PIPELINE_LIMITS,
  DEMO_SAMPLE_RAW,
  GEMINI_MODELS,
  N8N_ENV_VARS,
  PIPELINE_STEPS,
  SETUP_COMMANDS,
  SUPABASE_SECRETS,
  VITE_ENV_VARS,
  buildCategoryPrompt,
  categoryResultRows,
  extractRawInput,
  formatTaskTime,
  getActiveModelInfo,
  groupedSummary,
  parseCategoryResponse,
  statusBadgeClass,
} from '../data/aiAutomation'
import {
  checkGeminiSecrets,
  deleteAllBulkTasks,
  getAiSetupStatus,
  insertBulkTask,
  listBulkTasks,
  pollBulkTask,
} from '../services/aiAutomationService'

function OutputBlock({ parsed }) {
  if (!parsed) return null

  if (parsed.mode === 'grouped' && parsed.groups?.length) {
    return (
      <div className="ai-grouped-output">
        <p className="ai-grouped-meta">
          {parsed.total_items} items sorted into {parsed.groups.length} categories
        </p>
        {parsed.groups.map((g) => (
          <div key={g.category} className="ai-category-group">
            <h4 className="ai-group-heading">{g.category}</h4>
            <ul className="ai-group-items">
              {g.items.map((item, idx) => (
                <li key={`${g.category}-${idx}`}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  const rows = categoryResultRows(parsed)
  if (!rows.length) return null
  return (
    <div className="ai-output-block">
      {rows.map((r) => (
        <div key={r.heading} className="ai-output-row">
          <span className="ai-output-key">{r.heading}</span>
          <span className="ai-output-val">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function TaskDetail({ task }) {
  const parsed = task.ai_response ? parseCategoryResponse(task.ai_response) : null
  const raw = extractRawInput(task.input_text)
  const err =
    task.status === 'failed' && task.ai_response
      ? task.ai_response.replace(/^\[error\]\s*/, '')
      : null

  return (
    <div className="ai-history-detail">
      {raw && (
        <>
          <p className="ai-detail-label">Input (raw data)</p>
          <pre className="ai-raw-block">{raw}</pre>
        </>
      )}
      {parsed ? (
        <>
          <p className="ai-detail-label">Output (AI classification)</p>
          <OutputBlock parsed={parsed} />
        </>
      ) : err ? (
        <>
          <p className="ai-detail-label">Output (error)</p>
          <p className="ai-alert ai-alert-error">{err}</p>
        </>
      ) : (
        task.ai_response && (
          <>
            <p className="ai-detail-label">Output (raw)</p>
            <pre className="ai-raw-block">{task.ai_response}</pre>
          </>
        )
      )}
      <p className="ai-muted ai-detail-meta">
        Task #{task.id} · {formatTaskTime(task.created_at)}
      </p>
    </div>
  )
}

function formatTokenCount(n) {
  if (n == null) return '—'
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)
}

function ModelCanDoList({ items }) {
  if (!items?.length) return null
  return (
    <ul className="ai-model-cando-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default function AiAutomationPanel() {
  const status = getAiSetupStatus()
  const activeModel = getActiveModelInfo()
  const modelLabel = activeModel.label

  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState(null)
  const [inputText, setInputText] = useState(DEMO_SAMPLE_RAW)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitResult, setSubmitResult] = useState(null)
  const [clearLoading, setClearLoading] = useState(false)
  const [secretCheck, setSecretCheck] = useState(null)
  const [secretCheckLoading, setSecretCheckLoading] = useState(false)

  const refreshTasks = useCallback(async () => {
    if (!status.supabaseConfigured) {
      setTasksLoading(false)
      return
    }
    setTasksError(null)
    try {
      setTasks(await listBulkTasks())
    } catch (err) {
      setTasksError(err.message)
    } finally {
      setTasksLoading(false)
    }
  }, [status.supabaseConfigured])

  useEffect(() => {
    refreshTasks()
    const timer = setInterval(refreshTasks, 8000)
    return () => clearInterval(timer)
  }, [refreshTasks])

  const runCategoryDemo = async () => {
    setSubmitLoading(true)
    setSubmitError(null)
    setSubmitResult(null)
    try {
      const prompt = buildCategoryPrompt(inputText)
      const row = await insertBulkTask(prompt, { maxChars: APP_PIPELINE_LIMITS.insertMaxChars })
      setSubmitResult({ id: row.id, status: 'pending' })
      await refreshTasks()
      const done = await pollBulkTask(row.id)
      setSubmitResult(done)
      await refreshTasks()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const clearAllTasks = async () => {
    setClearLoading(true)
    setTasksError(null)
    try {
      await deleteAllBulkTasks()
      setSubmitResult(null)
      setTasks([])
    } catch (err) {
      setTasksError(err.message)
    } finally {
      setClearLoading(false)
    }
  }

  const runSecretCheck = async () => {
    setSecretCheckLoading(true)
    setSecretCheck(null)
    try {
      setSecretCheck(await checkGeminiSecrets())
    } catch (err) {
      setSecretCheck({ error: err.message })
    } finally {
      setSecretCheckLoading(false)
    }
  }

  const parsedResult =
    submitResult?.ai_response && submitResult.status === 'completed'
      ? parseCategoryResponse(submitResult.ai_response)
      : null

  const failMsg =
    submitResult?.status === 'failed' && submitResult.ai_response
      ? submitResult.ai_response.replace(/^\[error\]\s*/, '')
      : null

  return (
    <div className="ai-panel">
      <header className="ai-panel-header">
        <h2>Data Classifier</h2>
        <p>Har line/item alag category me group hoga — heading ke niche product names</p>
        <div className="ai-panel-meta">
          <span>{modelLabel}</span>
          <span>{status.supabaseConfigured ? 'Connected' : 'Supabase missing'}</span>
        </div>
      </header>

      {!status.supabaseConfigured && (
        <p className="ai-alert ai-alert-error">VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY .env me set karo</p>
      )}

      <section className="ai-card">
        <h3>Step 1 — Raw data</h3>
        <textarea
          className="ai-input-textarea"
          rows={5}
          placeholder="Email, ticket, chat, ya scraped text…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={!status.supabaseConfigured || submitLoading}
        />
        <div className="ai-actions">
          <button type="button" className="ai-btn-secondary" onClick={() => setInputText(DEMO_SAMPLE_RAW)} disabled={submitLoading}>
            Sample
          </button>
          <button
            type="button"
            className="ai-btn-primary"
            onClick={runCategoryDemo}
            disabled={!status.supabaseConfigured || submitLoading || !inputText.trim()}
          >
            {submitLoading ? 'Classifying…' : 'Step 2 — Classify'}
          </button>
        </div>
        {submitError && <p className="ai-alert ai-alert-error">{submitError}</p>}
      </section>

      {submitResult && (
        <section className={`ai-card ${submitResult.status === 'failed' ? 'ai-card-failed' : 'ai-card-success'}`}>
          <h3>Step 3 — Result</h3>
          {parsedResult ? (
            <OutputBlock parsed={parsedResult} />
          ) : failMsg ? (
            <p className="ai-alert ai-alert-error">{failMsg}</p>
          ) : (
            submitResult.ai_response && <pre className="ai-raw-out">{submitResult.ai_response}</pre>
          )}
        </section>
      )}

      <section className="ai-card ai-card-muted">
        <div className="ai-card-head-row">
          <h3>History</h3>
          <button
            type="button"
            className="ai-btn-secondary ai-btn-sm"
            onClick={clearAllTasks}
            disabled={!status.supabaseConfigured || clearLoading || tasks.length === 0}
          >
            {clearLoading ? '…' : 'Clear all'}
          </button>
        </div>
        {tasksLoading && <p className="ai-muted">Loading…</p>}
        {tasksError && <p className="ai-alert ai-alert-error">{tasksError}</p>}
        {!tasksLoading && tasks.length === 0 && !tasksError && (
          <p className="ai-muted">Abhi koi result nahi</p>
        )}
        {!tasksLoading && tasks.length > 0 && (
          <p className="ai-muted ai-history-hint">Row dabao — poora result + raw input dikhega</p>
        )}
        {tasks.length > 0 && (
          <ul className="ai-history-list">
            {tasks.map((t) => {
              const parsed = t.ai_response ? parseCategoryResponse(t.ai_response) : null
              return (
                <li key={t.id}>
                  <details className="ai-history-item">
                    <summary className="ai-history-summary">
                      <span className="ai-history-cat">
                        {groupedSummary(parsed) ||
                          parsed?.category ||
                          `Task #${t.id}`}
                      </span>
                      {parsed?.mode === 'single' && parsed.confidence != null && (
                        <span className="ai-history-conf">
                          {Math.round(parsed.confidence * 100)}%
                        </span>
                      )}
                      {parsed?.mode === 'single' && parsed.reason && (
                        <span className="ai-history-reason">{parsed.reason}</span>
                      )}
                      <span className={`badge badge-${statusBadgeClass(t.status)}`}>{t.status}</span>
                      <span className="ai-history-chevron" aria-hidden>
                        ▼
                      </span>
                    </summary>
                    <TaskDetail task={t} />
                  </details>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <details className="ai-more">
        <summary>Models & setup</summary>
        <p className="ai-muted ai-model-details-intro">
          Sirf Google Gemini use hota hai. Keys .env me hain; Edge Function Supabase secrets se padhta hai.
        </p>

        <div className="ai-model-cards">
          {GEMINI_MODELS.map((m) => (
            <article
              key={m.id}
              className={`ai-model-card${m.id === status.model ? ' ai-model-card-active' : ''}`}
            >
              <div className="ai-model-card-head">
                <h5>{m.label}</h5>
                {m.isDefault && <span className="ai-model-badge">Default</span>}
                {m.id === status.model && <span className="ai-model-badge ai-model-badge-active">Active</span>}
              </div>
              <table className="ai-model-table">
                <tbody>
                  <tr>
                    <th>Model id</th>
                    <td><code>{m.id}</code></td>
                  </tr>
                  <tr>
                    <th>Context</th>
                    <td>{formatTokenCount(m.contextTokens)} tokens</td>
                  </tr>
                  <tr>
                    <th>Max output</th>
                    <td>{formatTokenCount(m.maxOutputTokens)} tokens</td>
                  </tr>
                  <tr>
                    <th>Pricing</th>
                    <td>{m.pricingNote}</td>
                  </tr>
                  <tr>
                    <th>Best for</th>
                    <td>{m.bestFor}</td>
                  </tr>
                </tbody>
              </table>
              <ModelCanDoList items={m.canDo} />
            </article>
          ))}
        </div>

        <ul className="ai-limits-list">
          <li>
            <strong>Input:</strong> max {APP_PIPELINE_LIMITS.uiInputMaxChars.toLocaleString()} chars
          </li>
          <li>
            <strong>Output:</strong> max {APP_PIPELINE_LIMITS.edgeMaxOutputTokens} tokens
          </li>
          <li>
            <strong>Active model:</strong> <code>{activeModel.id}</code>
          </li>
        </ul>

        <ol className="ai-pipeline-list">
          {PIPELINE_STEPS.map((s) => (
            <li key={s.step}>
              <strong>{s.title}</strong> — {s.where}
            </li>
          ))}
        </ol>
        <pre className="ai-cli-block">{SETUP_COMMANDS.join('\n')}</pre>
        <button type="button" className="ai-btn-secondary" onClick={runSecretCheck} disabled={secretCheckLoading}>
          {secretCheckLoading ? 'Checking…' : 'Verify Gemini secrets'}
        </button>
        {secretCheck?.diagnostics && (
          <pre className="ai-cli-block">{JSON.stringify(secretCheck.diagnostics, null, 2)}</pre>
        )}
        {secretCheck?.hint && <p className="ai-muted">{secretCheck.hint}</p>}
        {secretCheck?.error && <p className="ai-alert ai-alert-error">{secretCheck.error}</p>}
        <ul className="ai-env-list">
          {[...SUPABASE_SECRETS, ...N8N_ENV_VARS, ...VITE_ENV_VARS].map((v) => (
            <li key={v.key}>
              <code>{v.key}</code> — {v.note}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
