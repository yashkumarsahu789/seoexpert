import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FolderApiKeysPanel from '../components/FolderApiKeysPanel'
import {
  createWorkflow,
  getFolder,
  listFolderWorkflows,
} from '../services/folderService'
import { GENERATION_STAGES, WORKFLOW_STATUS } from '../data/aiProviders'

function statusBadge(workflow) {
  if (workflow.status === 'ready') return { label: 'Ready', cls: 'badge-ready' }
  if (workflow.status === 'failed') return { label: 'Failed', cls: 'badge-failed' }
  if (workflow.status === 'generating') {
    return { label: GENERATION_STAGES[workflow.generation_stage] || 'Generating', cls: 'badge-generating' }
  }
  return { label: WORKFLOW_STATUS[workflow.status] || workflow.status, cls: 'badge-draft' }
}

export default function FolderDetailPage() {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const [folder, setFolder] = useState(null)
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [wfName, setWfName] = useState('')
  const [wfPrompt, setWfPrompt] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [f, wfs] = await Promise.all([getFolder(folderId), listFolderWorkflows(folderId)])
      if (!f) throw new Error('Folder nahi mila')
      setFolder(f)
      setWorkflows(wfs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [folderId])

  async function handleCreateWorkflow(e) {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const wf = await createWorkflow(folderId, { name: wfName, userPrompt: wfPrompt })
      setShowAdd(false)
      setWfName('')
      setWfPrompt('')
      await load()
      navigate(`/folders/${folderId}/workflows/${wf.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <p className="feature-hub-intro">Loading…</p>
  if (!folder) return <p className="folder-error">{error || 'Folder not found'}</p>

  return (
    <div className="feature-hub">
      <nav className="feature-breadcrumb">
        <Link to="/">← Home</Link>
        <span> / {folder.name}</span>
      </nav>

      <FolderApiKeysPanel folderId={folderId} />

      <div className="folder-section-header">
        <h2>Workflows</h2>
        <button type="button" className="folder-btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add Workflow'}
        </button>
      </div>

      {showAdd && (
        <form className="folder-workflow-form" onSubmit={handleCreateWorkflow}>
          <input
            type="text"
            placeholder="Workflow name"
            value={wfName}
            onChange={(e) => setWfName(e.target.value)}
            required
          />
          <textarea
            placeholder="Apna task/workflow yahan paste karo — AI isko steps me todo banayega"
            value={wfPrompt}
            onChange={(e) => setWfPrompt(e.target.value)}
            rows={6}
            required
          />
          <button type="submit" disabled={creating}>
            {creating ? 'Starting AI…' : 'Create & Generate'}
          </button>
        </form>
      )}

      {error && <p className="folder-error">{error}</p>}

      <div className="feature-grid">
        {workflows.map((wf) => {
          const badge = statusBadge(wf)
          return (
            <Link
              key={wf.id}
              to={`/folders/${folderId}/workflows/${wf.id}`}
              className="feature-card"
              style={{ '--feature-accent': '#059669' }}
            >
              <span className="feature-card-icon">⚡</span>
              <h2>{wf.name}</h2>
              <p>{wf.user_prompt?.slice(0, 80)}{wf.user_prompt?.length > 80 ? '…' : ''}</p>
              <span className={`workflow-status-badge ${badge.cls}`}>{badge.label}</span>
            </Link>
          )
        })}
        {!workflows.length && !showAdd && (
          <div className="feature-card feature-card-empty">
            <span className="feature-card-icon">⚡</span>
            <h2>Pehla workflow add karo</h2>
            <p>Task paste karo — AI automation banayega</p>
          </div>
        )}
      </div>
    </div>
  )
}
