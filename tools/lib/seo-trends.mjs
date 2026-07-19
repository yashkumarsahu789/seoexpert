/** SEO trends 2025–2026 — code layer (no AI). AI prompt me bhi ye rules pass hote hain. */

export const SEO_TRENDS_2026 = [
  'Helpful content — keyword stuffing nahi, clear user intent match',
  'E-E-A-T: author/site trust signals, transparent redirect disclosure',
  'Core Web Vitals: static HTML, minimal JS, fast LCP',
  'Mobile-first: viewport + readable font sizes',
  'Structured data: WebPage + FAQPage jahan fit ho',
  'Internal links: LifeSolveNow hub + related pages',
  'Canonical URL har page par unique',
  'Title 50–60 chars, meta description 150–160 chars',
  'AEO/GEO: concise FAQ bullets for AI search snippets',
]

export function seoTrendsBlock() {
  return SEO_TRENDS_2026.map((t) => `- ${t}`).join('\n')
}

export function buildWebPageJsonLd({ title, description, url, keyword, pageType }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    inLanguage: 'en',
    about: keyword,
    isPartOf: {
      '@type': 'WebSite',
      name: 'LifeSolveNow Keyword Pages',
      url: url.replace(/\/pages\/[^/]+$/, '/'),
    },
    ...(pageType === 'tool'
      ? { '@type': 'WebApplication', applicationCategory: 'UtilityApplication' }
      : {}),
  }
}

export function buildFaqJsonLd(faqs) {
  if (!faqs?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.slice(0, 5).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function defaultFaqs(keyword, pageType, brandName) {
  if (pageType === 'tool') {
    return [
      { q: `Is this ${keyword} tool free?`, a: 'Yes — runs in your browser, no signup.' },
      { q: 'Is my data saved?', a: 'Tool pages use local storage only where noted; nothing sent to servers.' },
    ]
  }
  return [
    { q: `How do I access ${brandName || keyword}?`, a: 'Use the Open button — you go to the official site via LifeSolveNow redirect.' },
    { q: 'Is this the official website?', a: 'This is a LifeSolveNow access page with a link to the official site.' },
  ]
}

export function injectSeoIntoHtml(html, { title, description, canonicalUrl, keyword, pageType, brandName }) {
  const faqs = defaultFaqs(keyword, pageType, brandName)
  const schemas = [buildWebPageJsonLd({ title, description, url: canonicalUrl, keyword, pageType })]
  const faqSchema = buildFaqJsonLd(faqs)
  if (faqSchema) schemas.push(faqSchema)

  const schemaScript = `<script type="application/ld+json">${JSON.stringify(schemas.length === 1 ? schemas[0] : schemas)}</script>`
  const ogTags = `
  <meta property="og:title" content="${escAttr(title)}" />
  <meta property="og:description" content="${escAttr(description)}" />
  <meta property="og:url" content="${escAttr(canonicalUrl)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />`

  let out = html
  if (out.includes('</head>')) {
    out = out.replace('</head>', `${ogTags}\n  ${schemaScript}\n</head>`)
  }
  if (canonicalUrl && out.includes('rel="canonical"')) {
    out = out.replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${escAttr(canonicalUrl)}"`)
  }
  return out
}

function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

export function buildPagesSitemapXml(pageUrls, baseUrl) {
  const today = new Date().toISOString().slice(0, 10)
  const entries = pageUrls
    .map((loc) => {
      const full = loc.startsWith('http') ? loc : `${baseUrl.replace(/\/$/, '')}/${loc.replace(/^\//, '')}`
      return `  <url>
    <loc>${full}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`
}

export function buildRobotsTxt(sitemapFullUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${sitemapFullUrl}
`
}

/** IndexNow — free open protocol (Bing, Yandex, etc.) */
export function indexNowPayload(host, urlList, key) {
  return {
    host,
    key,
    keyLocation: `https://${host}/indexnow-key.txt`,
    urlList: urlList.slice(0, 100),
  }
}
