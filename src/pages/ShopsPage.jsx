import { Link } from 'react-router-dom'
import { SyncPanel } from '../components/WorkflowPanels'
import { useWorkflowApp } from '../context/WorkflowAppContext'

export default function ShopsPage() {
  const app = useWorkflowApp()
  return (
    <div className="feature-page">
      <nav className="feature-breadcrumb">
        <Link to="/personal">← All Features</Link>
        <span>/</span>
        <strong>Shop Sync</strong>
      </nav>
      <SyncPanel
        syncing={app.syncing}
        loading={app.loading}
        syncError={app.syncError}
        syncStats={app.syncStats}
        lastSync={app.lastSync}
        shops={app.shops}
        indexingQueue={app.indexingQueue}
        shopRanks={app.shopRanks}
        runSync={app.runSync}
      />
    </div>
  )
}
