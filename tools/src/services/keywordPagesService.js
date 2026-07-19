/**
 * Keyword Pages — React pages + Firebase Firestore (local fallback)
 */
import { TASK_TYPES } from '../data/aiCenter'
import { KEYWORD_PAGES_AI_RULES, parseKeywordSeoResponse } from '../data/aiAutomation'
import { buildPageConfig, pageLiveUrl, pagePreviewUrl } from '../lib/pageConfig'
import { isFirebaseConfigured } from '../firebaseClient'
import { getLocalPage, listLocalPages, upsertLocalPage } from '../lib/localStore'
import { getFirestorePage, listFirestorePages, upsertFirestorePage } from './firestoreService'
import { runPageIntelligence } from './pageIntelligenceService'

export { KEYWORD_PAGES_AI_RULES, buildPageConfig, pageLiveUrl, pagePreviewUrl }

export function githubPathForSlug(slug) {
  return `tools/public/pages/${slug}.html`
}

/** Live preview config (React) — static HTML nahi */
export function buildPageLocally(keyword, serpTopUrl = '') {
  return buildPageConfig(keyword, serpTopUrl)
}

async function savePageConfig(config) {
  const row = {
    slug: config.slug,
    keyword: config.keyword,
    page_type: config.pageType,
    tool_type: config.toolType,
    serp_top_url: config.serpTopUrl,
    theme_id: config.theme?.id,
    config,
    public_url: config.publicUrl,
    path: config.route,
  }
  if (isFirebaseConfigured) return upsertFirestorePage(row)
  return upsertLocalPage(row)
}

export async function getPageBySlug(slug) {
  if (isFirebaseConfigured) return getFirestorePage(slug)
  return getLocalPage(slug)
}

export async function listSavedPages() {
  if (isFirebaseConfigured) return listFirestorePages()
  return listLocalPages()
}

export function openPagePreview(configOrSlug) {
  const url =
    typeof configOrSlug === 'string'
      ? pageLiveUrl(configOrSlug)
      : pagePreviewUrl(configOrSlug.keyword, configOrSlug.serpTopUrl || '')
  window.open(url, '_blank', 'noopener')
}

export async function generateAndSaveLocally(keyword, serpTopUrl = '', { useAi = true } = {}) {
  const kw = String(keyword || '').trim()
  if (!kw) throw new Error('keyword khali hai')

  let config
  let intelligence = null
  let tasks = []
  let usedAi = false

  if (useAi) {
    const result = await runPageIntelligence(kw, serpTopUrl)
    config = result.config
    intelligence = result.intelligence
    tasks = result.tasks
    usedAi = true
  } else {
    config = buildPageConfig(kw, serpTopUrl)
  }

  const saved = await savePageConfig(config)
  return { page: config, saved, tasks, intelligence, usedAi }
}

export function taskTypeLabel(id) {
  return TASK_TYPES[id]?.label || id
}

export { parseKeywordSeoResponse, isFirebaseConfigured }
