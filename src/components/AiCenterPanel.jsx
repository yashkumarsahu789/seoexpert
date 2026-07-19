import { useCallback, useEffect, useState } from 'react'
import {
  AI_AGENTS,
  GITHUB_DEFAULT_REPO,
  TASK_TYPES,
  agentStatusBadgeClass,
  centerTaskBadgeClass,
  formatCenterTime,
} from '../data/aiCenter'
import { DEMO_SAMPLE_RAW } from '../data/aiAutomation'
import {
  buildAgentDashboard,
  deleteAllCenterTasks,
  getAiCenterStatus,
  getAgentUsageToday,
  listCenterTasks,
  orchestrateOnce,
  previewTaskAssignment,
  submitCenterTask,
} from '../services/aiCenterService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

function AgentCard({ agent }) {
  const statusClass = agentStatusBadgeClass(agent.status)

  return (
    <article className={`aic-agent-card aic-agent-${agent.status}`}>
      <header className="aic-agent-head">
        <div>
          <h4>{agent.label}</h4>
          <p className="aic-agent-provider">{agent.providerLabel}</p>
        </div>
        <span className={`badge badge-${statusClass}`}>{agent.status}</span>
      </header>

      <div className="aic-agent-stats">
        <div>
          <span className="aic-stat-label">Aaj use</span>
          <strong>
            {agent.usedToday} / {agent.limits.dailyCalls}
          </strong>
        </div>
        <div>
          <span className="aic-stat-label">Bacha</span>
          <strong>{agent.remainingToday}</strong>
        </div>
        <div>
          <span className="aic-stat-label">RPM</span>
          <strong>{agent.limits.rpm}</strong>
        </div>
      </div>

      {agent.currentTask && (
        <p className="aic-agent-task">
          <strong>Ab kaam:</strong> #{agent.currentTask.id} {agent.currentTask.title}
        </p>
      )}

      <details className="aic-agent-capabilities">
        <summary>Capabilities ({agent.capabilities.length})</summary>
        <ul>
          {agent.capabilities.map((c) => (
            <li key={c}>{TASK_TYPES[c]?.label || c}</li>
          ))}
        </ul>
        {agent.canDo?.length > 0 && (
          <>
            <p className="aic-muted">Kya kar sakta hai:</p>
            <ul className="aic-can-do">
              {agent.canDo.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </details>
    </article>
  )
}

function TaskRow({ task }) {
  const agent = AI_AGENTS.find((a) => a.id === task.assigned_agent_id)
  const declines = Array.isArray(task.decline_log) ? task.decline_log : []

  return (
    <details className="aic-task-item">
      <summary>
        <span className="aic-task-title">#{task.id} {task.title}</span>
        <span className="aic-task-type">{TASK_TYPES[task.task_type]?.label || task.task_type}</span>
        {agent && <span className="aic-task-agent">{agent.label}</span>}
        <span className={`badge badge-${centerTaskBadgeClass(task.status)}`}>{task.status}</span>
      </summary>
      <div className="aic-task-body">
        <p className="aic-muted">Created: {formatCenterTime(task.created_at)}</p>
        {task.input_text && (
          <>
            <p className="aic-detail-label">Input</p>
            <pre className="ai-raw-out">{task.input_text.slice(0, 1200)}</pre>
          </>
        )}
        {task.output_text && (
          <>
            <p className="aic-detail-label">Output</p>
            <pre className="ai-raw-out">{task.output_text.slice(0, 2000)}</pre>
          </>
        )}
        {task.github_repo && task.github_path && (
          <p className="aic-muted">
            GitHub: {task.github_repo}/{task.github_path}
            {task.github_committed_at && ` · committed ${formatCenterTime(task.github_committed_at)}`}
          </p>
        )}
        {declines.length > 0 && (
          <>
            <p className="aic-detail-label">Agents ne chhoda (100% sure / limit)</p>
            <ul className="aic-decline-list">
              {declines.slice(0, 8).map((d) => (
                <li key={d.agent_id}>
                  <code>{d.agent_id}</code> — {d.reason}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  )
}

export default function AiCenterPanel() {
  const status = getAiCenterStatus()

  const [agents, setAgents] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orchestratorOn, setOrchestratorOn] = useState(true)
  const [lastOrchestration, setLastOrchestration] = useState(null)

  const [taskType, setTaskType] = useState('classify_list')
  const [title, setTitle] = useState('')
  const [inputText, setInputText] = useState(DEMO_SAMPLE_RAW)
  const [githubPath, setGithubPath] = useState('data/ai-center-output.json')
  const [autoGithub, setAutoGithub] = useState(Boolean(GITHUB_DEFAULT_REPO))
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [githubCheck, setGithubCheck] = useState(null)
  const [githubCheckLoading, setGithubCheckLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!status.supabaseConfigured) {
      setLoading(false)
      return
    }
    setError(null)
    try {
      const [usage, taskRows] = await Promise.all([getAgentUsageToday(), listCenterTasks()])
      setTasks(taskRows)
      setAgents(buildAgentDashboard(AI_AGENTS, usage, taskRows))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status.supabaseConfigured])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 6000)
    return () => clearInterval(timer)
  }, [refresh])

  useEffect(() => {
    if (!orchestratorOn || !status.supabaseConfigured) return undefined

    let cancelled = false

    const tick = async () => {
      try {
        const result = await orchestrateOnce()
        if (!cancelled) setLastOrchestration({ at: new Date().toISOString(), ...result })
        if (result.processed > 0) await refresh()
      } catch (err) {
        if (!cancelled) setLastOrchestration({ at: new Date().toISOString(), error: err.message })
      }
    }

    tick()
    const timer = setInterval(tick, 5000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [orchestratorOn, status.supabaseConfigured, refresh])

  useEffect(() => {
    const busyIds = new Set(
      agents.filter((a) => a.status === 'busy').map((a) => a.id)
    )
    const usage = Object.fromEntries(agents.map((a) => [a.id, a.usedToday]))
    setPreview(previewTaskAssignment(taskType, inputText, usage, busyIds))
  }, [taskType, inputText, agents])

  const handleSubmit = async () => {
    setSubmitLoading(true)
    setSubmitError(null)
    try {
      await submitCenterTask({
        taskType,
        title: title.trim() || TASK_TYPES[taskType]?.label,
        inputText,
        githubRepo: autoGithub ? GITHUB_DEFAULT_REPO : null,
        githubPath: autoGithub ? githubPath : null,
      })
      setTitle('')
      await refresh()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await deleteAllCenterTasks()
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const runGithubCheck = async () => {
    if (!SUPABASE_URL) return
    setGithubCheckLoading(true)
    setGithubCheck(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-center-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      })
      setGithubCheck(await res.json())
    } catch (err) {
      setGithubCheck({ error: err.message })
    } finally {
      setGithubCheckLoading(false)
    }
  }

  const idleCount = agents.filter((a) => a.status === 'idle').length
  const busyCount = agents.filter((a) => a.status === 'busy').length
  const queuedCount = tasks.filter((t) => t.status === 'queued').length

  return (
    <div className="aic-panel">
      <header className="ai-panel-header">
        <h2>AI Center</h2>
        <p>
          Saare AI agents yahan register hain — task aate hi apni capability + daily limit ke hisab se kaam
          khud chunenge. 100% sure nahi ya limit kam → task chhod denge. Free agent accept karke non-stop kaam
          karta rahega.
        </p>
        <div className="ai-panel-meta">
          <span>{status.activeAgents} active agents</span>
          <span>{idleCount} idle</span>
          <span>{busyCount} busy</span>
          <span>{queuedCount} queued</span>
          <span>{orchestratorOn ? 'Orchestrator ON' : 'Orchestrator OFF'}</span>
        </div>
      </header>

      {!status.supabaseConfigured && (
        <p className="ai-alert ai-alert-error">VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY .env me set karo</p>
      )}

      <section className="aic-card aic-card-hero">
        <div className="aic-card-head-row">
          <h3>Agent fleet — kaun kya kar raha hai</h3>
          <label className="aic-toggle">
            <input
              type="checkbox"
              checked={orchestratorOn}
              onChange={(e) => setOrchestratorOn(e.target.checked)}
            />
            Auto orchestrate
          </label>
        </div>
        {loading && <p className="ai-muted">Loading agents…</p>}
        {error && <p className="ai-alert ai-alert-error">{error}</p>}
        <div className="aic-agent-grid">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
        {lastOrchestration && (
          <p className="aic-muted aic-orchestrator-log">
            Last tick: {formatCenterTime(lastOrchestration.at)}
            {lastOrchestration.processed > 0 && ` · processed task #${lastOrchestration.taskId} → ${lastOrchestration.agentId}`}
            {lastOrchestration.noAgent && ` · no agent for #${lastOrchestration.noAgent}`}
            {lastOrchestration.error && ` · ${lastOrchestration.error}`}
          </p>
        )}
      </section>

      <section className="aic-card">
        <h3>Naya task bhejo</h3>
        <div className="aic-form-row">
          <label>
            Task type
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)} disabled={submitLoading}>
              {Object.values(TASK_TYPES)
                .filter((t) => t.id !== 'github_commit')
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} (~{t.estimatedCalls} call)
                  </option>
                ))}
            </select>
          </label>
          <label>
            Title (optional)
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={TASK_TYPES[taskType]?.label}
              disabled={submitLoading}
            />
          </label>
        </div>

        <textarea
          className="ai-input-textarea"
          rows={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={submitLoading}
        />

        <div className="aic-github-row">
          <label className="aic-toggle">
            <input
              type="checkbox"
              checked={autoGithub}
              onChange={(e) => setAutoGithub(e.target.checked)}
              disabled={!GITHUB_DEFAULT_REPO}
            />
            Complete hone pe GitHub me auto-update
          </label>
          {autoGithub && (
            <input
              type="text"
              className="aic-github-path"
              value={githubPath}
              onChange={(e) => setGithubPath(e.target.value)}
              placeholder="path/in/repo.json"
            />
          )}
        </div>
        {!GITHUB_DEFAULT_REPO && (
          <p className="aic-muted">VITE_GITHUB_REPO set karo — repo auto-commit ke liye</p>
        )}

        {preview && (
          <div className="aic-preview">
            {preview.agent ? (
              <p>
                <strong>Ab accept karega:</strong> {preview.agent.label}{' '}
                <span className="aic-muted">
                  ({preview.evaluations?.find((e) => e.accept)?.remaining ?? '?'} calls bache)
                </span>
              </p>
            ) : (
              <p className="ai-alert ai-alert-error">
                Abhi koi agent 100% capable + free nahi — {preview.reason}
              </p>
            )}
          </div>
        )}

        <div className="ai-actions">
          <button type="button" className="ai-btn-secondary" onClick={() => setInputText(DEMO_SAMPLE_RAW)}>
            Sample
          </button>
          <button
            type="button"
            className="ai-btn-primary"
            onClick={handleSubmit}
            disabled={!status.supabaseConfigured || submitLoading || !inputText.trim()}
          >
            {submitLoading ? 'Queueing…' : 'Queue task'}
          </button>
        </div>
        {submitError && <p className="ai-alert ai-alert-error">{submitError}</p>}
      </section>

      <section className="aic-card ai-card-muted">
        <div className="aic-card-head-row">
          <h3>Task queue</h3>
          <button
            type="button"
            className="ai-btn-secondary ai-btn-sm"
            onClick={handleClear}
            disabled={!tasks.length}
          >
            Clear all
          </button>
        </div>
        {!tasks.length && <p className="ai-muted">Queue khali hai</p>}
        <div className="aic-task-list">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      </section>

      <details className="ai-more">
        <summary>GitHub + setup</summary>
        <ul className="ai-limits-list">
          <li>
            <strong>Repo:</strong> {GITHUB_DEFAULT_REPO || 'VITE_GITHUB_REPO missing'}
          </li>
          <li>
            <strong>Token:</strong> Supabase secret <code>GITHUB_TOKEN</code> (full repo perms PAT)
          </li>
          <li>
            <strong>Flow:</strong> LLM complete → file commit same path → agents apni limit dekh ke accept
          </li>
        </ul>
        <button type="button" className="ai-btn-secondary" onClick={runGithubCheck} disabled={githubCheckLoading}>
          {githubCheckLoading ? 'Checking…' : 'Verify GitHub token'}
        </button>
        {githubCheck && (
          <pre className="ai-cli-block">{JSON.stringify(githubCheck, null, 2)}</pre>
        )}
        <p className="ai-muted">
          Migration: <code>supabase db push</code> (012_ai_center) · Edge:{' '}
          <code>supabase functions deploy ai-center-github --no-verify-jwt</code> · Secret:{' '}
          <code>supabase secrets set GITHUB_TOKEN=ghp_...</code>
        </p>
      </details>
    </div>
  )
}
