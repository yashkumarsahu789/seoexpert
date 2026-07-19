import { useEffect, useState } from 'react'
import {
  AI_PROVIDERS,
  buildDefaultConfig,
  detectProviderFromKey,
  getProviderConfig,
  maskApiKey,
} from '../data/aiProviders'
import {
  addFolderApiKey,
  deleteFolderApiKey,
  listFolderApiKeys,
  updateFolderApiKey,
} from '../services/folderService'

export default function FolderApiKeysPanel({ folderId }) {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('gemini')
  const [config, setConfig] = useState(buildDefaultConfig('gemini'))
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setKeys(await listFolderApiKeys(folderId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [folderId])

  function resetForm() {
    setLabel('')
    setApiKey('')
    setProvider('gemini')
    setConfig(buildDefaultConfig('gemini'))
    setEditingId(null)
    setShowAdd(false)
  }

  function handleKeyChange(value) {
    setApiKey(value)
    const detected = detectProviderFromKey(value)
    setProvider(detected)
    setConfig(buildDefaultConfig(detected))
  }

  function handleProviderChange(nextProvider) {
    setProvider(nextProvider)
    setConfig(buildDefaultConfig(nextProvider))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await updateFolderApiKey(editingId, {
          label: label || 'Default',
          provider,
          apiKey: apiKey || undefined,
          configJson: config,
        })
      } else {
        await addFolderApiKey(folderId, {
          label: label || 'Default',
          provider,
          apiKey,
          configJson: config,
        })
      }
      resetForm()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(keyId) {
    if (!confirm('Is API key ko delete karna hai?')) return
    setError('')
    try {
      await deleteFolderApiKey(keyId)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(key) {
    setEditingId(key.id)
    setLabel(key.label)
    setApiKey('')
    setProvider(key.provider)
    setConfig({ ...buildDefaultConfig(key.provider), ...(key.config_json || {}) })
    setShowAdd(true)
  }

  const providerDef = getProviderConfig(provider)

  return (
    <section className="folder-api-keys">
      <div className="folder-section-header">
        <h2>API Keys</h2>
        <button type="button" className="folder-btn" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add Key'}
        </button>
      </div>

      <p className="folder-api-keys-note">
        Is folder ki keys sirf isi folder ke workflows me use hongi. Rate limit pe multiple keys rotate hongi.
      </p>

      {loading ? (
        <p className="feature-hub-intro">Loading keys…</p>
      ) : (
        <div className="folder-keys-list">
          {keys.map((key) => (
            <div key={key.id} className="folder-key-row">
              <div>
                <strong>{key.label}</strong>
                <span className="folder-key-provider">{AI_PROVIDERS[key.provider]?.label || key.provider}</span>
                <span className="folder-key-mask">{maskApiKey(key.api_key)}</span>
              </div>
              <div className="folder-key-actions">
                <button type="button" onClick={() => startEdit(key)}>Change</button>
                <button type="button" className="danger" onClick={() => handleDelete(key.id)}>Delete</button>
              </div>
            </div>
          ))}
          {!keys.length && <p className="feature-hub-intro">Pehle API key add karo — tab AI workflow ban payega</p>}
        </div>
      )}

      {showAdd && (
        <form className="folder-key-form" onSubmit={handleSave}>
          <input
            type="text"
            placeholder="Key label (e.g. Main Gemini)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <select value={provider} onChange={(e) => handleProviderChange(e.target.value)}>
            {Object.values(AI_PROVIDERS).map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <input
            type="password"
            placeholder={editingId ? 'Nayi key (optional — khali chhodo purani rehne ke liye)' : 'API key paste karo'}
            value={apiKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            required={!editingId}
          />
          {providerDef.fields.map((field) => (
            <input
              key={field.name}
              type={field.type || 'text'}
              placeholder={field.placeholder || field.label}
              value={config[field.name] || ''}
              onChange={(e) => setConfig((c) => ({ ...c, [field.name]: e.target.value }))}
              required={field.required}
            />
          ))}
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update Key' : 'Save Key'}
          </button>
        </form>
      )}

      {error && <p className="folder-error">{error}</p>}
    </section>
  )
}
