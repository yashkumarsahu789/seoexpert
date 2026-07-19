import { classifyKeyword, slugify } from '../../lib/page-generator.mjs'
import { buildSeoContent } from './pageSeoContent.js'
import { resolveTheme } from './pageThemes.js'

const PUBLIC_BASE =
  (import.meta.env?.VITE_KEYWORD_PAGES_PUBLIC_BASE) || 'https://shop.LifeSolveNow.com/pages'

export function buildPageConfig(keyword, serpTopUrl = '', seo = null, extras = {}) {
  const kw = String(keyword || '').trim()
  const { intelligence, design } = extras
  let cls = classifyKeyword(kw, serpTopUrl)

  if (intelligence?.brief) {
    const b = intelligence.brief
    if (b.page_type === 'brand') {
      cls = { ...cls, pageType: 'brand' }
    } else if (b.page_type === 'tool') {
      cls = { ...cls, pageType: 'tool', toolType: b.tool_type || cls.toolType || 'landing' }
    }
  }

  let theme = resolveTheme(cls, serpTopUrl)
  if (design) {
    theme = {
      ...theme,
      id: `${theme.id}-ai`,
      light: design.light !== false,
      bg: design.bg,
      surface: design.surface,
      accent: design.accent,
      accentText: design.accent_text,
      text: design.text,
      muted: design.muted,
      pattern: design.pattern || theme.pattern,
      icon: design.icon || theme.icon,
    }
  }

  const slug = slugify(kw)
  const brandName = cls.name || cls.label || kw
  const targetUrl = cls.targetUrl || cls.url || serpTopUrl || ''

  const title =
    seo?.title ||
    (cls.pageType === 'brand'
      ? `Open ${brandName} | ${kw}`
      : `${cls.label || brandName} Online | ${kw}`)

  const description =
    seo?.description ||
    (cls.pageType === 'brand'
      ? `Fast access to ${brandName} for "${kw}". One tap to the official site.`
      : `Free ${cls.label || kw} — works in your browser, no signup.`)

  const seoContent = buildSeoContent({
    keyword: kw,
    pageType: cls.pageType,
    toolType: cls.toolType,
    label: cls.label || brandName,
    brandName,
    seo,
    intelligence,
  })

  return {
    slug,
    keyword: kw,
    pageType: cls.pageType,
    toolType: cls.toolType || null,
    label: cls.label || brandName,
    brandName,
    targetUrl,
    serpTopUrl: serpTopUrl || null,
    theme,
    meta: { ...cls },
    intelligence: intelligence || null,
    seo: { title, description, h1: seoContent.h1, h2: seoContent.h2 },
    seoContent,
    publicUrl: `${PUBLIC_BASE}/${slug}`,
    route: `/p/${slug}`,
  }
}
export function pagePreviewUrl(keyword, serpTopUrl = '') {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (serpTopUrl) params.set('serp', serpTopUrl)
  return `/preview?${params.toString()}`
}

export function pageLiveUrl(slug) {
  return `/p/${slug}`
}
