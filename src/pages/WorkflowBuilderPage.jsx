import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import WorkflowTestPanel from '../components/WorkflowTestPanel'
import { GENERATION_STAGES } from '../data/aiProviders'
import {
  getFolder,
  getWorkflow,
  listWorkflowSteps,
  restartWorkflowGeneration,
  updateWorkflow,
  updateWorkflowStep,
} from '../services/folderService'
import {
  isGenerating,
  orchestrateWorkflowOnce,
  regenerateStep,
} from '../services/folderAiService'

export default function WorkflowBuilderPage() {
  const { folderId, workflowId } = useParams()
  const [folder, setFolder] = useState(null)
  const [workflow, setWorkflow] = useState(null)
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const [f, wf, st] = await Promise.all([
        getFolder(folderId),
        getWorkflow(workflowId),
        listWorkflowSteps(workflowId),
      ])
      setFolder(f)
      setWorkflow(wf)
      setSteps(st)
      setEditPrompt(wf?.user_prompt || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [folderId, workflowId])

  useEffect(() => {
    if (!workflow || !isGenerating(workflow)) return undefined

    const timer = setInterval(async () => {
      try {
        await orchestrateWorkflowOnce(workflowId, folderId)
        await load()
      } catch (err) {
        setError(err.message)
      }
    }, 5000)

    orchestrateWorkflowOnce(workflowId, folderId)
      .then(() => load())
      .catch((err) => setError(err.message))

    return () => clearInterval(timer)
  }, [workflow?.status, workflow?.generation_stage, workflowId, folderId])

  async function handleSavePrompt() {
    setBusy(true)
    setError('')
    try {
      await updateWorkflow(workflowId, { userPrompt: editPrompt })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRegenerateAll() {
    setBusy(true)
    setError('')
    try {
      await restartWorkflowGeneration(workflowId, editPrompt)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRegenerateStep(stepId) {
    setBusy(true)
    setError('')
    try {
      await regenerateStep(folderId, workflowId, stepId)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleStepTitleChange(step, title) {
    await updateWorkflowStep(step.id, { title })
    await load()
  }

  if (loading) return <p className="feature-hub-intro">Loading workflow…</p>
  if (!workflow) return <p className="folder-error">{error || 'Workflow not found'}</p>

  const progress = workflow.generation_progress || {}
  const progressPct =
    progress.totalSteps > 0 ? Math.round((progress.currentStep / progress.totalSteps) * 100) : 0

  return (
    <div className="feature-hub workflow-builder">
      <nav className="feature-breadcrumb">
        <Link to="/">← Home</Link>
        <Link to={`/folders/${folderId}`}> / {folder?.name || 'Folder'}</Link>
        <span> / {workflow.name}</span>
      </nav>

      <div className="workflow-builder-header">
        <h2>{workflow.name}</h2>
        <span className={`workflow-status-badge badge-${workflow.status}`}>
          {GENERATION_STAGES[workflow.generation_stage] || workflow.status}
        </span>
      </div>

      {isGenerating(workflow) && (
        <div className="workflow-progress">
          <div className="workflow-progress-bar" style={{ width: `${progressPct}%` }} />
          <p>
            AI building… {progress.currentStep || 0}/{progress.totalSteps || '?'} steps
          </p>
        </div>
      )}

      {workflow.error_message && <p className="folder-error">{workflow.error_message}</p>}
      {error && <p className="folder-error">{error}</p>}

      <section className="workflow-edit-section">
        <h3>Workflow Description</h3>
        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          rows={5}
          disabled={busy}
        />
        <div className="workflow-edit-actions">
          <button type="button" onClick={handleSavePrompt} disabled={busy}>
            Save Prompt
          </button>
          <button type="button" onClick={handleRegenerateAll} disabled={busy}>
            Re-run Full AI Build
          </button>
        </div>
      </section>

      {steps.length > 0 && (
        <section className="workflow-steps-section">
          <h3>Steps ({steps.length})</h3>
          <div className="workflow-steps-list">
            {steps.map((step) => (
              <details key={step.id} className="workflow-step-item" open={step.status === 'pending'}>
                <summary>
                  <span className="step-order">{step.step_order}</span>
                  <input
                    className="step-title-input"
                    value={step.title}
                    onChange={(e) => handleStepTitleChange(step, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className={`step-status step-status-${step.status}`}>{step.status}</span>
                </summary>
                <p className="step-prompt">{step.prompt}</p>
                {step.ai_response && (
                  <pre className="step-response">{JSON.stringify(step.ai_response, null, 2)}</pre>
                )}
                <button type="button" onClick={() => handleRegenerateStep(step.id)} disabled={busy}>
                  Re-generate Step
                </button>
              </details>
            ))}
          </div>
        </section>
      )}

      {workflow.status === 'ready' && workflow.ui_schema && (
        <WorkflowTestPanel
          folderId={folderId}
          workflowId={workflowId}
          uiSchema={workflow.ui_schema}
          specJson={workflow.spec_json}
        />
      )}
    </div>
  )
}
