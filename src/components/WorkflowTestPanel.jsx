import { useEffect, useState } from 'react'
import { createWorkflowRun, listWorkflowRuns } from '../services/folderService'
import { testWorkflowRun } from '../services/folderAiService'

export default function WorkflowTestPanel({ folderId, workflowId, uiSchema, specJson }) {
  const [fields, setFields] = useState({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [runs, setRuns] = useState([])

  const schemaFields = uiSchema?.fields || []

  useEffect(() => {
    const initial = {}
    for (const f of schemaFields) {
      initial[f.name] = f.defaultValue || ''
    }
    setFields(initial)
  }, [uiSchema])

  async function loadRuns() {
    try {
      setRuns(await listWorkflowRuns(workflowId, 10))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadRuns()
  }, [workflowId])

  async function handleRun(e) {
    e.preventDefault()
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const run = await createWorkflowRun(workflowId, fields)
      const output = await testWorkflowRun(folderId, workflowId, fields, run.id)
      setResult(output.output || output)
      await loadRuns()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="workflow-test-panel">
      <h3>{uiSchema?.title || 'Test Workflow'}</h3>
      {uiSchema?.description && <p>{uiSchema.description}</p>}

      <form onSubmit={handleRun}>
        {schemaFields.map((field) => (
          <label key={field.name} className="workflow-test-field">
            <span>{field.label || field.name}</span>
            {field.type === 'textarea' ? (
              <textarea
                value={fields[field.name] || ''}
                onChange={(e) => setFields((f) => ({ ...f, [field.name]: e.target.value }))}
                rows={3}
              />
            ) : field.type === 'select' ? (
              <select
                value={fields[field.name] || ''}
                onChange={(e) => setFields((f) => ({ ...f, [field.name]: e.target.value }))}
              >
                <option value="">Select…</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'url' ? 'url' : 'text'}
                value={fields[field.name] || ''}
                onChange={(e) => setFields((f) => ({ ...f, [field.name]: e.target.value }))}
                placeholder={field.placeholder || ''}
              />
            )}
          </label>
        ))}

        {!schemaFields.length && (
          <p className="feature-hub-intro">No input fields — direct run karo</p>
        )}

        <button type="submit" disabled={running}>
          {running ? 'Running…' : uiSchema?.submitLabel || 'Run Test'}
        </button>
      </form>

      {error && <p className="folder-error">{error}</p>}

      {result && (
        <div className="workflow-test-result">
          <h4>Result</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {specJson && (
        <details className="workflow-spec-details">
          <summary>Automation Spec (read-only)</summary>
          <pre>{JSON.stringify(specJson, null, 2)}</pre>
        </details>
      )}

      {runs.length > 0 && (
        <div className="workflow-runs-history">
          <h4>Run History</h4>
          {runs.map((run) => (
            <details key={run.id}>
              <summary>
                {new Date(run.created_at).toLocaleString()} — {run.status}
              </summary>
              <pre>{JSON.stringify(run.output_json || run.input_json, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
