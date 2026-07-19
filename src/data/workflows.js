export const WORKFLOW_REGISTRY = [
  {
    id: 'website_audit',
    name: 'Website Audit',
    icon: '🔍',
    accent: '#059669',
    preview: 'Primary — 4-step SEO + AEO + GEO audit pipeline',
    category: 'seo',
    kind: 'audit',
  },
  {
    id: 'requirements_daily_sync',
    name: 'Requirements Daily Sync',
    icon: '📚',
    accent: '#6366f1',
    preview: 'Daily rules: Official + Patents + Trackers → Supabase',
    category: 'seo',
    kind: 'scheduler',
  },
  {
    id: 'website_audit_daily',
    name: 'Daily Audit Scheduler',
    icon: '📅',
    accent: '#0891b2',
    preview: 'Har din 6 AM IST — saved sites re-audit',
    category: 'seo',
    kind: 'scheduler',
  },
  {
    id: 'render_lifetime_guard',
    name: 'Render Lifetime Guard',
    icon: '🛡️',
    accent: '#0ea5e9',
    preview: 'Har 5 min ping · Supabase heartbeat',
    category: 'infrastructure',
    kind: 'guard',
  },
  {
    id: 'auto_shop_sync',
    name: 'Auto Shop Sync',
    icon: '🏪',
    accent: '#7c3aed',
    preview: 'rs_shops → SEO shops table',
    category: 'seo',
    kind: 'sync',
  },
  {
    id: 'telegram_time_demo',
    name: 'Telegram Time Demo',
    icon: '📲',
    accent: '#0088cc',
    preview: 'Har 1 min Telegram time push',
    category: 'demo',
    kind: 'telegram',
  },
]

export function getWorkflowPath(id) {
  const map = {
    website_audit: '/audit',
    auto_shop_sync: '/shops',
    render_lifetime_guard: '/guard',
    requirements_daily_sync: '/automations',
    website_audit_daily: '/automations',
  }
  return map[id] || `/automations`
}

export function getWorkflowById(id) {
  return WORKFLOW_REGISTRY.find((w) => w.id === id) ?? null
}

export function filterWorkflows(workflows, query) {
  const q = query.trim().toLowerCase()
  if (!q) return workflows
  return workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.preview.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q)
  )
}
