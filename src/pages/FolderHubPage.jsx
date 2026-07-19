import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createFolder, listFolders } from '../services/folderService'

export default function FolderHubPage() {
  const [folders, setFolders] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setFolders(await listFolders())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await createFolder(name)
      setName('')
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="feature-hub">
      <p className="feature-hub-intro">Apna folder banao — andar workflows + API keys manage karo</p>

      <form className="folder-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Folder name (e.g. Client ABC)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={creating}
        />
        <button type="submit" disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : '+ New Folder'}
        </button>
      </form>

      {error && <p className="folder-error">{error}</p>}

      {loading ? (
        <p className="feature-hub-intro">Loading folders…</p>
      ) : (
        <div className="feature-grid">
          {folders.map((folder) => (
            <Link
              key={folder.id}
              to={`/folders/${folder.id}`}
              className="feature-card"
              style={{ '--feature-accent': '#7c3aed' }}
            >
              <span className="feature-card-icon">📁</span>
              <h2>{folder.name}</h2>
              <p>Workflows · API keys · AI automation</p>
            </Link>
          ))}
          {!folders.length && (
            <div className="feature-card feature-card-empty">
              <span className="feature-card-icon">✨</span>
              <h2>Pehla folder banao</h2>
              <p>Upar naam likho — phir andar workflows add kar sakte ho</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
