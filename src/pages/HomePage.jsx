import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import WorkflowCard from '../components/WorkflowCard'
import { WORKFLOW_REGISTRY, filterWorkflows } from '../data/workflows'
import { useWorkflowApp } from '../context/WorkflowAppContext'
import { heartbeatStatus } from '../services/heartbeatService'

export default function HomePage() {
  const [search, setSearch] = useState('')
  const { lastPingAt, lastSync, syncStats } = useWorkflowApp()

  const workflows = useMemo(() => filterWorkflows(WORKFLOW_REGISTRY, search), [search])

  return (
    <>
      <section className="workflows-audit-cta">
        <div>
          <strong>Website audit yahan nahi chalta</strong>
          <p>
            URL daal kar audit chalane ke liye upar <strong>Run Audit</strong> tab kholo — wahan URL
            box, Run Audit button, aur 4-step results milenge.
          </p>
        </div>
        <Link to="/" className="workflows-audit-cta-btn">
          Run Audit →
        </Link>
      </section>

      <div className="home-search-wrap">
        <input
          type="search"
          className="home-search"
          placeholder="Search workflows…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search workflows"
        />
      </div>

      <div className="workflow-feed">
        {workflows.length === 0 && (
          <p className="empty-feed">Koi workflow match nahi hua — search change karo.</p>
        )}
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            active={
              workflow.kind === 'guard'
                ? heartbeatStatus(lastPingAt) === 'alive'
                : workflow.kind !== 'audit'
            }
            lastPingAt={
              workflow.kind === 'guard'
                ? lastPingAt
                : workflow.kind === 'sync'
                  ? lastSync?.toISOString()
                  : undefined
            }
            previewOverride={
              workflow.kind === 'sync' && syncStats
                ? `${syncStats.fetched} shops · ${syncStats.inserted} new · ${syncStats.updated} updated`
                : workflow.kind === 'guard' && lastPingAt
                  ? `Heartbeat ${new Date(lastPingAt).toLocaleTimeString()}`
                  : undefined
            }
          />
        ))}
      </div>
    </>
  )
}
