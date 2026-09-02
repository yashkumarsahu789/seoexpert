import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { WorkflowAppProvider } from './context/WorkflowAppContext'
import AppLayout from './layouts/AppLayout'
import AuditLayout from './layouts/AuditLayout'
import FeatureHubPage from './pages/FeatureHubPage'
import FolderHubPage from './pages/FolderHubPage'
import FolderDetailPage from './pages/FolderDetailPage'
import WorkflowBuilderPage from './pages/WorkflowBuilderPage'
import TempHubPage from './pages/TempHubPage'
import TempModelsPage from './pages/TempModelsPage'
import AutomationsPage from './pages/AutomationsPage'
import AiAutomationPage from './pages/AiAutomationPage'
import AiCenterPage from './pages/AiCenterPage'
import WhatsAppAutomationPage from './pages/WhatsAppAutomationPage'
import GuardPage from './pages/GuardPage'
import ShopsPage from './pages/ShopsPage'
import AuditHomePage from './pages/audit/AuditHomePage'
import AuditRunPage from './pages/audit/AuditRunPage'
import AuditChecksPage from './pages/audit/AuditChecksPage'
import AuditKeywordsPage from './pages/audit/AuditKeywordsPage'
import AuditCompetitorsPage from './pages/audit/AuditCompetitorsPage'
import AuditPlanPage from './pages/audit/AuditPlanPage'
import AuditSitesPage from './pages/audit/AuditSitesPage'
import AuditHistoryPage from './pages/audit/AuditHistoryPage'

const PERSONAL_FEATURE_PATHS = new Set([
  '/personal',
  '/audit',
  '/shops',
  '/guard',
  '/automations',
  '/ai-automation',
  '/ai-center',
  '/whatsapp',
  '/temp',
])

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <WorkflowAppProvider>
      <BrowserRouter basename={routerBasename}>
        <Routes>
          <Route element={<AppLayout personalPaths={PERSONAL_FEATURE_PATHS} />}>
            <Route index element={<FolderHubPage />} />
            <Route path="personal" element={<FeatureHubPage />} />
            <Route path="temp" element={<TempHubPage />} />
            <Route path="temp/models" element={<TempModelsPage />} />
            <Route path="folders/:folderId" element={<FolderDetailPage />} />
            <Route path="folders/:folderId/workflows/:workflowId" element={<WorkflowBuilderPage />} />
            <Route path="audit" element={<AuditLayout />}>
              <Route index element={<AuditHomePage />} />
              <Route path="run" element={<AuditRunPage />} />
              <Route path="checks" element={<AuditChecksPage />} />
              <Route path="keywords" element={<AuditKeywordsPage />} />
              <Route path="competitors" element={<AuditCompetitorsPage />} />
              <Route path="plan" element={<AuditPlanPage />} />
              <Route path="sites" element={<AuditSitesPage />} />
              <Route path="history" element={<AuditHistoryPage />} />
            </Route>
            <Route path="shops" element={<ShopsPage />} />
            <Route path="guard" element={<GuardPage />} />
            <Route path="automations" element={<AutomationsPage />} />
            <Route path="ai-automation" element={<AiAutomationPage />} />
            <Route path="ai-center" element={<AiCenterPage />} />
            <Route path="whatsapp" element={<WhatsAppAutomationPage />} />
            <Route path="workflows" element={<Navigate to="/automations" replace />} />
            <Route path="keywords" element={<Navigate to="/audit/keywords" replace />} />
            <Route path="newfile/website_audit" element={<Navigate to="/audit" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WorkflowAppProvider>
  )
}
