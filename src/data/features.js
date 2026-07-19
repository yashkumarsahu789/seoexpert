/** App features — home grid + per-feature sub-routes */
export const FEATURES = [
  {
    id: 'audit',
    path: '/audit',
    name: 'Website Audit',
    icon: '🔍',
    accent: '#059669',
    description: 'SEO/AEO/GEO audit · daily keywords + rank for saved sites',
    primary: true,
  },
  {
    id: 'shops',
    path: '/shops',
    name: 'Shop Sync',
    icon: '🏪',
    accent: '#7c3aed',
    description: 'Sitemap sync · daily index ping · keyword rank tracking',
  },
  {
    id: 'guard',
    path: '/guard',
    name: 'Render Guard',
    icon: '🛡️',
    accent: '#0ea5e9',
    description: 'n8n sleep rokne ke liye heartbeat ping',
  },
  {
    id: 'automations',
    path: '/automations',
    name: 'Auto Jobs',
    icon: '⚙️',
    accent: '#6366f1',
    description: 'Daily rules sync · scheduled re-audits (background)',
  },
  {
    id: 'ai-automation',
    path: '/ai-automation',
    name: 'AI Automation',
    icon: '🤖',
    accent: '#f59e0b',
    description: 'n8n scrape → Supabase → Cloudflare Workers AI (bulk LLM)',
  },
  {
    id: 'ai-center',
    path: '/ai-center',
    name: 'AI Center',
    icon: '🧠',
    accent: '#ec4899',
    description: 'Multi-agent hub — capability match, limits, auto GitHub commit',
  },
  {
    id: 'webflow',
    path: '/webflow',
    externalUrl: import.meta.env.VITE_WEBFLOW_APP_URL || 'http://localhost:5174',
    name: 'Webflow',
    icon: '◻️',
    accent: '#4353ff',
    description: 'Batao kya chahiye → AI banayega → webflow.com par live site',
  },
  {
    id: 'whatsapp',
    path: '/whatsapp',
    name: 'WhatsApp Automation',
    icon: '💬',
    accent: '#25d366',
    description: 'Apna number — Hello 1 & 2 har 10 sec (whatsapp-web.js, no Cloud API)',
  },
]

export const AUDIT_OPTIONS = [
  { path: '/audit/run', label: 'Run Audit', desc: 'Site URL daalo, naya audit chalao', step: '▶' },
  { path: '/audit/checks', label: 'SEO / AEO / GEO', desc: 'Kya hai, kya missing, kya update', step: '1' },
  { path: '/audit/keywords', label: 'Keywords & Rank', desc: 'Keyword + Google rank position', step: '2' },
  { path: '/audit/competitors', label: 'Competitors', desc: 'Kaun rank karta hai + beat plan', step: '3' },
  { path: '/audit/plan', label: 'Action Plan', desc: 'Saari fixes priority order me', step: '4' },
  { path: '/audit/sites', label: 'Saved Sites', desc: 'Sites list · re-audit · daily auto', step: '★' },
  { path: '/audit/history', label: 'Past Audits', desc: 'Purane reports dubara kholo', step: '🕐' },
]

export function getFeatureByPath(path) {
  return FEATURES.find((f) => path.startsWith(f.path)) ?? null
}
