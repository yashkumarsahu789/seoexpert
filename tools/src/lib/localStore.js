const TASKS_KEY = 'tools_ai_center_tasks'
const USAGE_KEY = 'tools_ai_agent_usage'
const PAGES_KEY = 'tools_keyword_pages'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function listLocalTasks() {
  return readJson(TASKS_KEY, [])
}

export function saveLocalTasks(tasks) {
  writeJson(TASKS_KEY, tasks)
}

export function nextLocalId(items) {
  const max = items.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0)
  return max + 1
}

export function getUsageToday() {
  const today = new Date().toISOString().slice(0, 10)
  const all = readJson(USAGE_KEY, {})
  return all[today] || {}
}

export function incrementUsage(agentId, calls = 1) {
  const today = new Date().toISOString().slice(0, 10)
  const all = readJson(USAGE_KEY, {})
  if (!all[today]) all[today] = {}
  all[today][agentId] = (all[today][agentId] || 0) + calls
  writeJson(USAGE_KEY, all)
}

export function listLocalPages() {
  return readJson(PAGES_KEY, [])
}

export function getLocalPage(slug) {
  return listLocalPages().find((p) => p.slug === slug) || null
}

export function upsertLocalPage(page) {
  const list = listLocalPages()
  const idx = list.findIndex((p) => p.slug === page.slug)
  if (idx >= 0) list[idx] = { ...list[idx], ...page, updated_at: new Date().toISOString() }
  else list.unshift({ ...page, created_at: new Date().toISOString() })
  writeJson(PAGES_KEY, list)
  return page
}

export function clearLocalTasks() {
  localStorage.removeItem(TASKS_KEY)
}
