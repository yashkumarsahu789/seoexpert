const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function httpGet(url, { timeout = 25000, accept = 'text/html,application/json,*/*' } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': UA,
        Accept: accept,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const text = await res.text()
    let json = null
    if (accept.includes('json') || res.headers.get('content-type')?.includes('json')) {
      try {
        json = JSON.parse(text)
      } catch {
        /* noop */
      }
    }
    return { ok: res.ok, status: res.status, text, json }
  } finally {
    clearTimeout(timer)
  }
}

export function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function googleSuggest(query) {
  if (!query?.trim()) return []
  const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=en&q=${encodeURIComponent(query.trim())}`
  const res = await httpGet(url, { accept: 'application/json' })
  if (!res.json || !Array.isArray(res.json[1])) return []
  return res.json[1].filter((s) => typeof s === 'string' && s.trim())
}

function decodeBingRedirect(href) {
  if (!href) return href
  const m = String(href).match(/[?&]u=a1([A-Za-z0-9+/=_-]+)/i)
  if (!m) return String(href).replace(/&amp;/g, '&')
  try {
    const decoded = Buffer.from(m[1], 'base64').toString('utf8')
    if (decoded.startsWith('http')) return decoded
  } catch {
    /* noop */
  }
  return String(href).replace(/&amp;/g, '&')
}

function parseBingHtml(html) {
  const organic = []
  const seen = new Set()
  if (!html) return organic

  for (const block of html.matchAll(/class="b_algo"[\s\S]*?(?=class="b_algo"|$)/gi)) {
    const chunk = block[0]
    const citeM = chunk.match(/class="b_attribution"[\s\S]*?<cite[^>]*>([\s\S]*?)<\/cite>/i)
    let link = ''
    if (citeM) {
      link = citeM[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s*›\s*/g, '/')
        .trim()
      if (link && !/^https?:\/\//i.test(link)) link = `https://${link.replace(/^\/\//, '')}`
    }
    if (!link) {
      const hrefM = chunk.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"/i)
      if (hrefM) link = decodeBingRedirect(hrefM[1].replace(/&amp;/g, '&'))
    }
    if (!link?.startsWith('http')) continue
    const norm = link.split(/[?#]/)[0]
    if (/bing\.|microsoft\.|msn\./i.test(norm)) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    organic.push({ link: norm, url: norm })
    if (organic.length >= 10) break
  }
  return organic
}

export async function serpTopUrl(keyword, { serpApiKey = '', serperApiKey = '' } = {}) {
  const q = String(keyword || '').trim()
  if (!q) return ''

  if (serperApiKey) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q, gl: 'in', hl: 'en', num: 10 }),
      })
      const data = await res.json()
      const top = data?.organic?.[0]?.link
      if (top) return top
    } catch {
      /* fall through */
    }
  }

  if (serpApiKey) {
    try {
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&gl=in&hl=en&api_key=${encodeURIComponent(serpApiKey)}`
      const res = await httpGet(url, { accept: 'application/json' })
      const top = res.json?.organic_results?.[0]?.link || res.json?.organic_results?.[0]?.url
      if (top) return top
    } catch {
      /* fall through */
    }
  }

  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=10&setlang=en`
  const bing = await httpGet(bingUrl)
  const organic = parseBingHtml(bing.text)
  return organic[0]?.link || organic[0]?.url || ''
}

export async function checkKeywordRankPosition(keyword, targetDomain, { serpApiKey = '', serperApiKey = '' } = {}) {
  const q = String(keyword || '').trim()
  const domain = String(targetDomain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  if (!q || !domain) return { rankPosition: null, rankUrl: null, source: 'invalid_input' }

  if (serperApiKey) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q, gl: 'in', hl: 'en', num: 20 }),
      })
      const data = await res.json()
      const organic = data?.organic || []
      let rankPosition = null
      let rankUrl = null
      for (let i = 0; i < organic.length; i++) {
        const link = (organic[i].link || '').toLowerCase()
        if (link.includes(domain)) {
          rankPosition = organic[i].position || i + 1
          rankUrl = organic[i].link
          break
        }
      }
      return { rankPosition, rankUrl, source: 'serper_api', organicResults: organic }
    } catch {
      /* fall through */
    }
  }

  if (serpApiKey) {
    try {
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&gl=in&hl=en&api_key=${encodeURIComponent(serpApiKey)}`
      const res = await httpGet(url, { accept: 'application/json' })
      const organic = res.json?.organic_results || []
      let rankPosition = null
      let rankUrl = null
      for (let i = 0; i < organic.length; i++) {
        const link = (organic[i].link || organic[i].url || '').toLowerCase()
        if (link.includes(domain)) {
          rankPosition = i + 1
          rankUrl = organic[i].link || organic[i].url
          break
        }
      }
      return { rankPosition, rankUrl, source: 'serpapi', organicResults: organic }
    } catch {
      /* fall through */
    }
  }

  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20&setlang=en`
  const bing = await httpGet(bingUrl)
  const organic = parseBingHtml(bing.text)
  let rankPosition = null
  let rankUrl = null
  for (let i = 0; i < organic.length; i++) {
    const link = (organic[i].link || '').toLowerCase()
    if (link.includes(domain)) {
      rankPosition = i + 1
      rankUrl = organic[i].link
      break
    }
  }
  return { rankPosition, rankUrl, source: 'bing_free', organicResults: organic }
}

export async function collectKeywordCandidates(seeds, { max = 30 } = {}) {
  const found = new Set(seeds)
  for (const seed of seeds.slice(0, 6)) {
    const suggestions = await googleSuggest(seed)
    suggestions.slice(0, 4).forEach((s) => found.add(s))
    await delay(300)
  }
  return [...found].slice(0, max)
}
