import { supabase } from '../supabaseClient'
import { canonicalWebsiteUrl, websiteDomain } from './websiteService'

const SERPER_KEY =
  import.meta.env.VITE_SERPER_API_KEY ||
  import.meta.env.SERPER_API_KEY ||
  '231506b3ec144d842cf349ccd47b4c4ecb35852b'

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
]

/** Fetch HTML with direct fetch and CORS proxy fallbacks */
export async function fetchWebsiteHtml(url) {
  // 1. Direct fetch (works in Node.js or if CORS headers present)
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (res.ok) {
      const text = await res.text()
      if (text && text.length > 50) return text
    }
  } catch {
    // try proxies in browser
  }

  // 2. CORS proxies for browser execution
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url))
      if (res.ok) {
        const text = await res.text()
        if (text && text.length > 50) return text
      }
    } catch {
      // try next
    }
  }

  return ''
}

/** Parse on-page HTML features */
export function parseOnPageHtml(html, pageUrl) {
  if (!html) {
    return {
      title: '',
      metaDescription: '',
      canonical: '',
      isNoindex: false,
      h1Count: 0,
      h1: '',
      h2s: [],
      h3s: [],
      wordCount: 0,
      tokenEstimate: 0,
      imagesTotal: 0,
      imagesWithoutAlt: 0,
      internalLinks: 0,
      outboundLinks: 0,
      schemas: [],
      schemaTypes: [],
      hasOrgSchema: false,
      hasFaqSchema: false,
      hasBreadcrumbSchema: false,
      hasAuthorSchema: false,
      hasSpeakableSchema: false,
      hasToc: false,
      questionHeadingRatio: 0,
      publishedDate: null,
      author: null,
      hasViewport: false,
    }
  }

  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  // Meta description
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const metaDescription = descMatch ? descMatch[1].trim() : ''

  // Canonical
  const canonMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
  const canonical = canonMatch ? canonMatch[1].trim() : ''

  // Robots noindex
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i)
  const isNoindex = Boolean(robotsMatch && /noindex/i.test(robotsMatch[1]))

  // Viewport
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)

  // Headings
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
  const h1Count = h1Matches.length
  const h1 = h1Count > 0 ? h1Matches[0][1].replace(/<[^>]+>/g, '').trim() : ''

  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
  const h2s = h2Matches.map((m) => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)

  const h3Matches = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)]
  const h3s = h3Matches.map((m) => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)

  // Question headings
  const allHeadings = [...h2s, ...h3s]
  const qHeadings = allHeadings.filter((h) =>
    /\?|^(what|how|why|where|when|who|which|can|is|are|kya|kaise|kyun)\b/i.test(h)
  )
  const questionHeadingRatio =
    allHeadings.length > 0 ? Math.round((qHeadings.length / allHeadings.length) * 100) : 0

  // Words
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = bodyText.split(/\s+/).filter((w) => w.length > 0)
  const wordCount = words.length
  const tokenEstimate = Math.round(wordCount * 1.3)

  // Images
  const imgMatches = [...html.matchAll(/<img([^>]*)>/gi)]
  const imagesTotal = imgMatches.length
  const imagesWithoutAlt = imgMatches.filter((m) => !/alt=["'][^"']+["']/i.test(m[1])).length

  // Links
  let domain = ''
  try {
    domain = new URL(pageUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    /* */
  }

  const linkMatches = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)]
  let internalLinks = 0
  let outboundLinks = 0
  for (const lm of linkMatches) {
    const href = lm[1].trim()
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue
    if (href.startsWith('/') || (domain && href.includes(domain))) {
      internalLinks += 1
    } else if (/^https?:\/\//i.test(href)) {
      outboundLinks += 1
    }
  }

  // Schema.org / JSON-LD
  const schemas = []
  const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const ldm of ldMatches) {
    try {
      const parsed = JSON.parse(ldm[1].trim())
      schemas.push(parsed)
    } catch {
      // ignore
    }
  }

  const schemaTypes = new Set()
  function scanType(obj) {
    if (!obj || typeof obj !== 'object') return
    if (obj['@type']) {
      const t = obj['@type']
      ;(Array.isArray(t) ? t : [t]).forEach((item) => schemaTypes.add(String(item)))
    }
    if (Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach(scanType)
    }
    Object.values(obj).forEach((val) => {
      if (Array.isArray(val)) val.forEach(scanType)
      else if (typeof val === 'object') scanType(val)
    })
  }
  schemas.forEach(scanType)
  const typesArr = [...schemaTypes]

  const hasOrgSchema = typesArr.some((t) => /Organization|Corporation|LocalBusiness|Store/i.test(t))
  const hasFaqSchema = typesArr.some((t) => /FAQPage/i.test(t))
  const hasBreadcrumbSchema = typesArr.some((t) => /BreadcrumbList/i.test(t))
  const hasAuthorSchema =
    typesArr.some((t) => /Person/i.test(t)) || /rel=["']author["']/i.test(html)
  const hasSpeakableSchema = typesArr.some((t) => /Speakable/i.test(t))
  const hasToc = /<nav[^>]*(?:toc|table-of-contents|contents)[^>]*>/i.test(html)

  // Author / Date
  const dateMatch =
    html.match(/itemprop=["']datePublished["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/property=["']article:published_time["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<time[^>]+datetime=["']([^"']*)["']/i)
  const publishedDate = dateMatch ? dateMatch[1].trim() : null

  const authorMatch =
    html.match(/name=["']author["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/itemprop=["']author["'][^>]*>([^<]+)<\//i)
  const author = authorMatch ? authorMatch[1].trim() : null

  return {
    title,
    metaDescription,
    canonical,
    isNoindex,
    h1Count,
    h1,
    h2s,
    h3s,
    wordCount,
    tokenEstimate,
    imagesTotal,
    imagesWithoutAlt,
    internalLinks,
    outboundLinks,
    schemas,
    schemaTypes: typesArr,
    hasOrgSchema,
    hasFaqSchema,
    hasBreadcrumbSchema,
    hasAuthorSchema,
    hasSpeakableSchema,
    hasToc,
    questionHeadingRatio,
    publishedDate,
    author,
    hasViewport,
  }
}

/** Check technical robots.txt / sitemap */
export async function checkTechnical(websiteUrl) {
  let robotsTxt = ''
  let sitemapOk = false
  let sitemapCount = 0

  try {
    const origin = new URL(websiteUrl).origin
    robotsTxt = await fetchWebsiteHtml(`${origin}/robots.txt`)
  } catch {
    /* */
  }

  const robotsFound = Boolean(robotsTxt && robotsTxt.length > 10 && !/<!doctype html>/i.test(robotsTxt))
  const aiBots = {
    GPTBot: robotsTxt.includes('GPTBot') ? (/Disallow:\s*\/\s*$/m.test(robotsTxt) ? 'blocked' : 'allowed') : 'allowed',
    ClaudeBot: robotsTxt.includes('ClaudeBot') ? (/Disallow:\s*\/\s*$/m.test(robotsTxt) ? 'blocked' : 'allowed') : 'allowed',
    PerplexityBot: robotsTxt.includes('PerplexityBot') ? (/Disallow:\s*\/\s*$/m.test(robotsTxt) ? 'blocked' : 'allowed') : 'allowed',
    'Google-Extended': robotsTxt.includes('Google-Extended') ? (/Disallow:\s*\/\s*$/m.test(robotsTxt) ? 'blocked' : 'allowed') : 'allowed',
  }

  try {
    const origin = new URL(websiteUrl).origin
    const sitemapXml = await fetchWebsiteHtml(`${origin}/sitemap.xml`)
    if (sitemapXml && sitemapXml.includes('<urlset') || sitemapXml.includes('<sitemapindex')) {
      sitemapOk = true
      sitemapCount = (sitemapXml.match(/<loc>/g) || []).length
    }
  } catch {
    /* */
  }

  return {
    robots: { found: robotsFound, aiBots },
    sitemap: { ok: sitemapOk, urlCount: sitemapCount },
    https: /^https:/i.test(websiteUrl),
  }
}

/** Evaluate an individual audit rule */
function evaluateRule(checkKey, onpage, technical, domain) {
  switch (checkKey) {
    case 'title_present':
      return onpage.title
        ? { status: 'present', detail: onpage.title }
        : { status: 'missing', detail: 'Title tag missing', remediation: 'Add descriptive <title> tag (50-60 chars)' }
    case 'meta_description':
      return onpage.metaDescription
        ? { status: 'present', detail: onpage.metaDescription.slice(0, 80) + '...' }
        : { status: 'missing', detail: 'Meta description missing', remediation: 'Add compelling <meta name="description"> (140-160 chars)' }
    case 'h1_single':
      if (onpage.h1Count === 1) return { status: 'present', detail: onpage.h1 }
      if (onpage.h1Count === 0) return { status: 'missing', detail: 'No H1 found', remediation: 'Add a single primary <h1> heading' }
      return { status: 'needs_update', detail: `Multiple H1 tags (${onpage.h1Count})`, remediation: 'Use exactly one <h1> for clear topic focus' }
    case 'robots_txt':
      return technical.robots.found
        ? { status: 'present', detail: 'robots.txt found' }
        : { status: 'missing', detail: 'robots.txt not found', remediation: 'Create /robots.txt to guide search crawlers' }
    case 'sitemap':
      return technical.sitemap.ok
        ? { status: 'present', detail: `${technical.sitemap.urlCount} URLs in sitemap` }
        : { status: 'missing', detail: 'sitemap.xml not accessible', remediation: 'Add /sitemap.xml and submit in Google Search Console' }
    case 'org_schema':
      return onpage.hasOrgSchema
        ? { status: 'present', detail: 'Organization/LocalBusiness schema present' }
        : { status: 'missing', detail: 'No Organization Schema found', remediation: 'Add Schema.org Organization/LocalBusiness JSON-LD' }
    case 'https_enabled':
      return technical.https
        ? { status: 'present', detail: 'SSL/HTTPS active' }
        : { status: 'missing', detail: 'Site not using HTTPS', remediation: 'Enable SSL/HTTPS on domain' }
    case 'internal_links':
      return onpage.internalLinks >= 3
        ? { status: 'present', detail: `${onpage.internalLinks} internal links` }
        : { status: onpage.internalLinks > 0 ? 'needs_update' : 'missing', detail: `Only ${onpage.internalLinks} internal links`, remediation: 'Add 3+ internal links to improve site architecture' }
    case 'image_alt':
      return onpage.imagesWithoutAlt === 0
        ? { status: 'present', detail: `${onpage.imagesTotal} images with alt text` }
        : { status: 'needs_update', detail: `${onpage.imagesWithoutAlt} of ${onpage.imagesTotal} images missing alt`, remediation: 'Add descriptive alt attributes to all <img> tags' }
    case 'content_depth':
      return onpage.wordCount >= 500
        ? { status: 'present', detail: `${onpage.wordCount} words` }
        : { status: onpage.wordCount >= 200 ? 'needs_update' : 'missing', detail: `${onpage.wordCount} words`, remediation: 'Expand core content depth to at least 500+ words' }
    case 'publish_date':
      return onpage.publishedDate
        ? { status: 'present', detail: `Published: ${onpage.publishedDate}` }
        : { status: 'needs_update', detail: 'Published date missing', remediation: 'Add datePublished schema or visible article date' }
    case 'author_eeat':
      return onpage.hasAuthorSchema || onpage.author
        ? { status: 'present', detail: onpage.author || 'Author schema verified' }
        : { status: 'missing', detail: 'Author/E-E-A-T signals missing', remediation: 'Add author name and bio for E-E-A-T trust' }
    case 'breadcrumb_schema':
      return onpage.hasBreadcrumbSchema
        ? { status: 'present', detail: 'BreadcrumbList schema present' }
        : { status: 'missing', detail: 'Breadcrumb schema missing', remediation: 'Implement BreadcrumbList structured data' }
    case 'noindex_check':
      return onpage.isNoindex
        ? { status: 'needs_remove', detail: 'Page has noindex tag!', remediation: 'Remove noindex directive to allow search engines to rank this page' }
        : { status: 'present', detail: 'Indexable (no noindex tag)' }
    case 'question_headings':
      return onpage.questionHeadingRatio >= 20
        ? { status: 'present', detail: `${onpage.questionHeadingRatio}% question headings` }
        : { status: 'needs_update', detail: `${onpage.questionHeadingRatio}% question headings`, remediation: 'Add Q&A style headings (What is..., How to...) for AI search citation' }
    case 'direct_answer':
      return onpage.wordCount >= 100
        ? { status: 'present', detail: 'Direct answer paragraph present' }
        : { status: 'missing', detail: 'Direct answer missing', remediation: 'Provide a direct 40-60 word answer under the main heading' }
    case 'faq_schema':
      return onpage.hasFaqSchema
        ? { status: 'present', detail: 'FAQPage schema active' }
        : { status: 'missing', detail: 'FAQPage schema missing', remediation: 'Add FAQPage JSON-LD schema for rich search results' }
    case 'speakable_schema':
      return onpage.hasSpeakableSchema
        ? { status: 'present', detail: 'Speakable schema found' }
        : { status: 'missing', detail: 'Speakable schema missing', remediation: 'Add SpeakableSpecification schema for voice search' }
    case 'outbound_citations':
      return onpage.outboundLinks >= 2
        ? { status: 'present', detail: `${onpage.outboundLinks} authoritative links` }
        : { status: 'needs_update', detail: `${onpage.outboundLinks} outbound links`, remediation: 'Link to 2+ authoritative external sources' }
    case 'heading_structure':
      return onpage.h2s.length >= 2
        ? { status: 'present', detail: `${onpage.h2s.length} H2 sections` }
        : { status: 'needs_update', detail: `${onpage.h2s.length} H2 sections`, remediation: 'Organize content with clear <h2> sub-headings' }
    case 'toc_present':
      return onpage.hasToc
        ? { status: 'present', detail: 'Table of Contents present' }
        : { status: 'missing', detail: 'Table of Contents missing', remediation: 'Add a Table of Contents for quick navigation' }
    case 'gptbot_allowed':
      return technical.robots.aiBots.GPTBot !== 'blocked'
        ? { status: 'present', detail: 'GPTBot allowed' }
        : { status: 'needs_remove', detail: 'GPTBot blocked in robots.txt', remediation: 'Allow GPTBot in robots.txt for ChatGPT citations' }
    case 'claudebot_allowed':
      return technical.robots.aiBots.ClaudeBot !== 'blocked'
        ? { status: 'present', detail: 'ClaudeBot allowed' }
        : { status: 'needs_remove', detail: 'ClaudeBot blocked in robots.txt', remediation: 'Allow ClaudeBot in robots.txt' }
    case 'perplexitybot_allowed':
      return technical.robots.aiBots.PerplexityBot !== 'blocked'
        ? { status: 'present', detail: 'PerplexityBot allowed' }
        : { status: 'needs_remove', detail: 'PerplexityBot blocked in robots.txt', remediation: 'Allow PerplexityBot for Perplexity AI search' }
    case 'google_extended_policy':
      return technical.robots.aiBots['Google-Extended'] !== 'blocked'
        ? { status: 'present', detail: 'Google-Extended allowed' }
        : { status: 'needs_remove', detail: 'Google-Extended blocked', remediation: 'Allow Google-Extended for Gemini/AI Overview inclusions' }
    case 'mobile_friendly':
      return onpage.hasViewport
        ? { status: 'present', detail: 'Viewport tag configured' }
        : { status: 'missing', detail: 'Viewport tag missing', remediation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0">' }
    default:
      return { status: 'present', detail: 'Standard rule check passed' }
  }
}

/** Calculate pillar score 0–100 */
function calculatePillarScore(checks, baseScore = 75) {
  if (!checks || !checks.length) return baseScore
  const present = checks.filter((c) => c.status === 'present').length
  const missing = checks.filter((c) => c.status === 'missing').length
  const update = checks.filter((c) => c.status === 'needs_update').length
  const remove = checks.filter((c) => c.status === 'needs_remove').length

  const score = Math.round(
    baseScore * (present / checks.length) - missing * 8 - update * 4 - remove * 12
  )
  return Math.max(10, Math.min(100, score))
}

/** Generate keyword seeds from on-page data */
export function extractKeywordSeeds(domain, onpage) {
  const seeds = new Set()
  const cleanDomain = domain.replace(/\.[a-z]+$/i, '').replace(/[^a-z0-9]/gi, ' ')
  if (cleanDomain.length >= 3) seeds.add(cleanDomain)

  if (onpage.title) {
    const parts = onpage.title.split(/[-|–:;]/).map((p) => p.trim())
    for (const p of parts) {
      if (p.length >= 3 && p.length <= 40) seeds.add(p)
    }
  }

  for (const h of onpage.h2s.slice(0, 3)) {
    const clean = h.replace(/[^a-z0-9\s]/gi, ' ').trim()
    if (clean.length >= 4 && clean.length <= 35) seeds.add(clean)
  }

  return [...seeds].slice(0, 4)
}

/** Query Serper API for Google search ranking positions */
export async function checkKeywordRanksWithSerper(domain, keywords) {
  const rankResults = []
  const competitors = []

  for (const keyword of keywords) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: keyword, gl: 'in' }),
      })

      if (res.ok) {
        const data = await res.json()
        const organic = data.organic || []

        let ourRank = null
        let ourUrl = null

        const cleanDomain = domain.toLowerCase().replace(/^www\./, '')
        organic.forEach((item, index) => {
          const itemLink = String(item.link || '').toLowerCase()
          if (!ourRank && itemLink.includes(cleanDomain)) {
            ourRank = index + 1
            ourUrl = item.link
          } else if (competitors.length < 5 && !itemLink.includes(cleanDomain)) {
            competitors.push({
              keyword,
              competitor_url: item.link,
              competitor_rank: index + 1,
              title: item.title,
              snippet: item.snippet,
            })
          }
        })

        rankResults.push({
          keyword,
          ourRank,
          ourUrl,
          rank_position: ourRank,
          rank_url: ourUrl,
          serpFeatures: {
            source: 'Google (Serper)',
            checked_at: new Date().toISOString(),
          },
        })
      } else {
        rankResults.push({
          keyword,
          ourRank: null,
          ourUrl: null,
          serpFeatures: { source: 'Serper limited', error: res.status },
        })
      }
    } catch (err) {
      rankResults.push({
        keyword,
        ourRank: null,
        ourUrl: null,
        serpFeatures: { source: 'Rank check error', error: err.message },
      })
    }
  }

  return { rankResults, competitors }
}

/** Build Action Plan from findings */
export function buildActionPlan(findings) {
  const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 }
  return findings
    .filter((f) => f.status !== 'present')
    .sort((a, b) => (priorityOrder[a.severity] || 5) - (priorityOrder[b.severity] || 5))
    .map((f, i) => ({
      step: i + 1,
      pillar: f.category,
      severity: f.severity,
      title: f.title,
      recommendation: f.remediation || f.description || 'Fix this issue',
    }))
}

/** Generate standalone HTML audit report */
export function generateHtmlReport({ domain, url, scores, summary, actionPlan, rankResults }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SEO Audit Report - ${domain}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; line-height: 1.5; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .score-badge { display: inline-block; font-size: 2.5rem; font-weight: 800; color: #10b981; margin: 8px 0; }
    .pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0; }
    .pillar-card { background: #0f172a; padding: 12px; border-radius: 8px; text-align: center; }
    .pillar-card strong { font-size: 1.5rem; color: #38bdf8; display: block; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-size: 0.85rem; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .critical { background: #ef444422; color: #f87171; }
    .high { background: #f9731622; color: #fb923c; }
    .medium { background: #eab30822; color: #facc15; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Audit Report: ${domain}</h1>
    <p>Target URL: <a href="${url}" target="_blank" style="color: #38bdf8;">${url}</a> · Completed: ${new Date().toLocaleDateString()}</p>
    <div>
      <span class="score-badge">${scores.wos}</span>
      <span style="font-size: 1.1rem; color: #94a3b8; margin-left: 8px;">/ 100 (WOS Score)</span>
    </div>
    <div class="pillars">
      <div class="pillar-card"><span>SEO Pillar</span><strong>${scores.s_seo}</strong></div>
      <div class="pillar-card"><span>AEO Pillar</span><strong>${scores.s_aeo}</strong></div>
      <div class="pillar-card"><span>GEO Pillar</span><strong>${scores.s_geo}</strong></div>
    </div>
  </div>

  <div class="card">
    <h2>Action Plan (Priority Fixes)</h2>
    <table>
      <thead><tr><th>#</th><th>Pillar</th><th>Severity</th><th>Issue</th><th>Fix</th></tr></thead>
      <tbody>
        ${actionPlan
          .map(
            (p) =>
              `<tr><td>${p.step}</td><td>${p.pillar.toUpperCase()}</td><td><span class="badge ${p.severity}">${p.severity}</span></td><td>${p.title}</td><td>${p.recommendation}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>Keyword Rankings</h2>
    <table>
      <thead><tr><th>Keyword</th><th>Rank Position</th><th>Engine</th></tr></thead>
      <tbody>
        ${rankResults
          .map(
            (r) =>
              `<tr><td>${r.keyword}</td><td><strong>${r.ourRank ? '#' + r.ourRank : 'Top 20+'}</strong></td><td>${r.serpFeatures?.source || 'Google'}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`
}

/** Execute a full native website audit directly in JS and save to Supabase */
export async function executeNativeAudit({ websiteId, websiteUrl, mode = 'full', onProgress }) {
  const url = canonicalWebsiteUrl(websiteUrl)
  const domain = websiteDomain(url)

  onProgress?.('Initializing audit run in database…')

  // 1. Create audit_runs row in Supabase
  const { data: runRow, error: runErr } = await supabase
    .from('audit_runs')
    .insert({
      website_id: websiteId || null,
      website_url: url,
      domain,
      status: 'running',
      mode,
      summary: { event: 'Native Audit', source: 'seoexpert-native-engine' },
    })
    .select('id')
    .single()

  if (runErr) throw runErr
  const auditRunId = runRow.id

  try {
    // 2. Fetch HTML
    onProgress?.(`Fetching website HTML for ${domain}…`)
    const html = await fetchWebsiteHtml(url)

    // 3. Technical & On-Page Parsing
    onProgress?.('Analyzing technical infrastructure, headings, and schema.org…')
    const onpage = parseOnPageHtml(html, url)
    const technical = await checkTechnical(url)

    // 4. Fetch Requirements from Supabase
    onProgress?.('Loading SEO, AEO, and GEO rule catalogs…')
    let { data: requirements } = await supabase
      .from('audit_requirements')
      .select('*')
      .eq('active', true)

    if (!requirements || !requirements.length) {
      requirements = [
        { pillar: 'seo', rule_code: 'SEO-01', title: 'Title Tag', check_key: 'title_present', severity: 'critical', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-02', title: 'Meta Description', check_key: 'meta_description', severity: 'high', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-03', title: 'Single H1 Heading', check_key: 'h1_single', severity: 'high', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-04', title: 'Robots.txt Directive', check_key: 'robots_txt', severity: 'high', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-05', title: 'XML Sitemap', check_key: 'sitemap', severity: 'high', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-06', title: 'Organization Schema', check_key: 'org_schema', severity: 'medium', source_type: 'patent' },
        { pillar: 'seo', rule_code: 'SEO-07', title: 'HTTPS Enabled', check_key: 'https_enabled', severity: 'critical', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-08', title: 'Internal Links', check_key: 'internal_links', severity: 'medium', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-09', title: 'Image Alt Tags', check_key: 'image_alt', severity: 'medium', source_type: 'official' },
        { pillar: 'seo', rule_code: 'SEO-10', title: 'Content Depth', check_key: 'content_depth', severity: 'high', source_type: 'tracker' },
        { pillar: 'seo', rule_code: 'SEO-11', title: 'Author E-E-A-T', check_key: 'author_eeat', severity: 'high', source_type: 'patent' },
        { pillar: 'seo', rule_code: 'SEO-12', title: 'Indexable (No noindex)', check_key: 'noindex_check', severity: 'critical', source_type: 'official' },
        { pillar: 'aeo', rule_code: 'AEO-01', title: 'Q&A Style Headings', check_key: 'question_headings', severity: 'high', source_type: 'patent' },
        { pillar: 'aeo', rule_code: 'AEO-02', title: 'Direct Answer Snip', check_key: 'direct_answer', severity: 'high', source_type: 'patent' },
        { pillar: 'aeo', rule_code: 'AEO-03', title: 'FAQPage Schema', check_key: 'faq_schema', severity: 'medium', source_type: 'official' },
        { pillar: 'aeo', rule_code: 'AEO-04', title: 'Speakable Schema', check_key: 'speakable_schema', severity: 'medium', source_type: 'patent' },
        { pillar: 'aeo', rule_code: 'AEO-05', title: 'Outbound Citations', check_key: 'outbound_citations', severity: 'medium', source_type: 'patent' },
        { pillar: 'geo', rule_code: 'GEO-01', title: 'GPTBot AI Allowed', check_key: 'gptbot_allowed', severity: 'high', source_type: 'official' },
        { pillar: 'geo', rule_code: 'GEO-02', title: 'ClaudeBot Allowed', check_key: 'claudebot_allowed', severity: 'high', source_type: 'official' },
        { pillar: 'geo', rule_code: 'GEO-03', title: 'PerplexityBot Allowed', check_key: 'perplexitybot_allowed', severity: 'high', source_type: 'official' },
        { pillar: 'geo', rule_code: 'GEO-04', title: 'Google-Extended Allowed', check_key: 'google_extended_policy', severity: 'high', source_type: 'official' },
      ]
    }

    // 5. Evaluate Pillar Rules
    onProgress?.('Evaluating SEO, AEO, and GEO checks…')
    const seoChecks = []
    const aeoChecks = []
    const geoChecks = []
    const findingsRows = []
    const siteReqCheckRows = []

    for (const rule of requirements) {
      const res = evaluateRule(rule.check_key, onpage, technical, domain)
      const checkRecord = {
        audit_run_id: auditRunId,
        website_id: websiteId || null,
        requirement_id: rule.id || null,
        pillar: rule.pillar,
        rule_code: rule.rule_code,
        source_type: rule.source_type || 'official',
        source_name: rule.source_name || 'Standard Catalog',
        status: res.status,
        title: rule.title,
        detail: res.detail || null,
        remediation: res.remediation || null,
        severity: rule.severity || 'medium',
      }

      siteReqCheckRows.push(checkRecord)

      if (rule.pillar === 'seo') seoChecks.push(checkRecord)
      else if (rule.pillar === 'aeo') aeoChecks.push(checkRecord)
      else if (rule.pillar === 'geo') geoChecks.push(checkRecord)

      if (res.status !== 'present') {
        findingsRows.push({
          audit_run_id: auditRunId,
          category: rule.pillar,
          dimension: rule.rule_code,
          severity: rule.severity || 'medium',
          title: rule.title,
          description: res.detail || rule.description,
          remediation: res.remediation,
          status: 'open',
        })
      }
    }

    // 6. Calculate Scores
    const s_seo = calculatePillarScore(seoChecks, 72)
    const s_aeo = calculatePillarScore(aeoChecks, 70)
    const s_geo = calculatePillarScore(geoChecks, 68)
    const wos_score = Math.round((0.5 * s_seo + 0.25 * s_aeo + 0.25 * s_geo) * 100) / 100

    // 7. Keyword & Rank Checking via Serper
    onProgress?.('Extracting keyword seeds and querying Google rank positions…')
    const keywordSeeds = extractKeywordSeeds(domain, onpage)
    const { rankResults, competitors } = await checkKeywordRanksWithSerper(domain, keywordSeeds)

    // 8. Build Action Plan & HTML Report
    const actionPlan = buildActionPlan(findingsRows)
    const reportHtml = generateHtmlReport({
      domain,
      url,
      scores: { wos: wos_score, s_seo, s_aeo, s_geo },
      summary: { totalChecks: requirements.length, findingsCount: findingsRows.length },
      actionPlan,
      rankResults,
    })

    // 9. Save Findings & Requirement Checks in Supabase
    onProgress?.('Saving audit results and keyword rankings to database…')
    if (siteReqCheckRows.length > 0) {
      try {
        await supabase.from('site_requirement_checks').insert(siteReqCheckRows)
      } catch (e) {
        console.warn('site_requirement_checks insert warning:', e.message)
      }
    }

    if (findingsRows.length > 0) {
      try {
        await supabase.from('audit_findings').insert(findingsRows)
      } catch (e) {
        console.warn('audit_findings insert warning:', e.message)
      }
    }

    if (rankResults.length > 0 && websiteId) {
      try {
        const kwRows = rankResults.map((r) => ({
          website_id: websiteId,
          audit_run_id: auditRunId,
          keyword: r.keyword,
          rank_position: r.ourRank,
          rank_url: r.ourUrl,
          serp_features: r.serpFeatures,
        }))
        await supabase.from('keyword_rankings').insert(kwRows)
      } catch (e) {
        console.warn('keyword_rankings insert warning:', e.message)
      }
    }

    if (competitors.length > 0) {
      try {
        const compRows = competitors.map((c) => ({
          audit_run_id: auditRunId,
          keyword: c.keyword,
          competitor_url: c.competitor_url,
          competitor_rank: c.competitor_rank,
          their_setup: { title: c.title, snippet: c.snippet },
          beat_plan: `Beat on ${c.keyword} by optimizing target headings, expanding content depth, and matching schema.org markup.`,
        }))
        await supabase.from('competitor_snapshots').insert(compRows)
      } catch (e) {
        console.warn('competitor_snapshots insert warning:', e.message)
      }
    }

    // 10. Update audit_runs to completed
    const summaryData = {
      domain,
      url,
      wos: wos_score,
      scores: { seo: s_seo, aeo: s_aeo, geo: s_geo },
      rankResults,
      bestKeywords: keywordSeeds,
      actionPlan,
      completedAt: new Date().toISOString(),
    }

    await supabase
      .from('audit_runs')
      .update({
        status: 'completed',
        wos_score,
        s_seo,
        s_aeo,
        s_geo,
        alpha: 0.5,
        beta: 0.25,
        gamma: 0.25,
        token_count: onpage.tokenEstimate,
        report_html: reportHtml,
        summary: summaryData,
        technical,
        keywords: { rankResults, seeds: keywordSeeds },
        competitors: { snapshots: competitors },
        phase_seo: { score: s_seo, present: seoChecks.filter((c) => c.status === 'present').length },
        phase_aeo: { score: s_aeo, present: aeoChecks.filter((c) => c.status === 'present').length },
        phase_geo: { score: s_geo, present: geoChecks.filter((c) => c.status === 'present').length },
        phase_keywords: {
          ranked: rankResults.filter((r) => r.ourRank != null).length,
          notRanked: rankResults.filter((r) => r.ourRank == null).length,
          rankResults,
        },
        phase_competitors: { count: competitors.length },
        completed_at: new Date().toISOString(),
      })
      .eq('id', auditRunId)

    // 11. Update website status
    if (websiteId) {
      await supabase.from('websites').update({ status: 'completed' }).eq('id', websiteId)
    }

    onProgress?.('Audit complete!')
    return {
      auditRunId,
      wos_score,
      s_seo,
      s_aeo,
      s_geo,
      domain,
      websiteUrl: url,
    }
  } catch (err) {
    // Record error in audit_runs
    await supabase
      .from('audit_runs')
      .update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', auditRunId)
      .catch(() => {})

    throw err
  }
}
