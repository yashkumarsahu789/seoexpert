// @inject-free-audit-utils — prepended by n8n-sync into audit snippets (no paid keys required)
const FREE_AUDIT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function freeEnv(name) {
  try {
    if (name === 'SERPER_API_KEY') {
      return $env.SERPER_API_KEY || $env.SERPer_API_KEY || '';
    }
    return $env[name] || '';
  } catch {
    return '';
  }
}

async function freeHttp(self, url, opts = {}) {
  const start = Date.now();
  try {
    const req = {
      method: opts.method || 'GET',
      url,
      headers: {
        'User-Agent': FREE_AUDIT_UA,
        Accept: opts.accept || 'text/html,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(opts.headers || {}),
      },
      json: opts.json ?? false,
      timeout: opts.timeout || 25000,
      ignoreHttpStatusErrors: true,
    };
    if (opts.body != null) req.body = opts.body;
    const data = await self.helpers.httpRequest(req);
    return { ok: true, data, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message, ms: Date.now() - start };
  }
}

function freeDecodeBingRedirect(href) {
  if (!href) return href;
  const m = String(href).match(/[?&]u=a1([A-Za-z0-9+/=_-]+)/i);
  if (!m) return String(href).replace(/&amp;/g, '&');
  try {
    const decoded = Buffer.from(m[1], 'base64').toString('utf8');
    if (decoded.startsWith('http')) return decoded;
  } catch {
    /* fall through */
  }
  return String(href).replace(/&amp;/g, '&');
}

function freeMatchDomain(link, domain) {
  if (!link || !domain) return false;
  const d = String(domain).toLowerCase().replace(/^www\./, '');
  const l = String(link).toLowerCase();
  if (l.includes(d)) return true;
  // shop.example.com ↔ example.com
  const parts = d.split('.');
  if (parts.length >= 2) {
    const root = parts.slice(-2).join('.');
    if (l.includes(root)) return true;
  }
  return false;
}

function freeRankFromOrganic(organic, domain) {
  let ourRank = null;
  let ourUrl = null;
  (organic || []).forEach((r, i) => {
    const link = r.link || r.url;
    if (ourRank == null && freeMatchDomain(link, domain)) {
      ourRank = i + 1;
      ourUrl = link;
    }
  });
  return { ourRank, ourUrl };
}

/** Google Autocomplete — no API key (replaces DataForSEO keyword suggestions) */
async function freeGoogleSuggest(self, query) {
  if (!query?.trim()) return [];
  const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=en&q=${encodeURIComponent(query.trim())}`;
  const res = await freeHttp(self, url, { json: true, accept: 'application/json' });
  if (!res.ok) return [];
  const data = res.data;
  if (Array.isArray(data) && Array.isArray(data[1])) {
    return data[1].filter((s) => typeof s === 'string' && s.trim());
  }
  return [];
}

/** Expand seed into related keywords via autocomplete (free volume proxy) */
async function freeKeywordExpand(self, seed, max = 12) {
  const out = new Set();
  const base = await freeGoogleSuggest(self, seed);
  base.forEach((s) => out.add(s));
  for (const s of base.slice(0, 4)) {
    const extra = await freeGoogleSuggest(self, s);
    extra.slice(0, 5).forEach((k) => out.add(k));
  }
  const list = [...out].slice(0, max);
  return list.map((keyword, i) => ({
    keyword,
    search_volume: Math.max(50, Math.round(800 - i * 60 + keyword.length * 3)),
    source: 'google_autocomplete_free',
    competition: i < 3 ? 'medium' : 'low',
  }));
}

/** Parse Google SERP HTML — cheerio-style regex (replaces SerpAPI) */
function freeParseSerpHtml(html, domainFilter) {
  const organic = [];
  const seen = new Set();
  if (!html || typeof html !== 'string') return { organic, paa: [] };

  const paa = [];
  [...html.matchAll(/"([^"]+\?)"/g)].forEach((m) => {
    const q = m[1];
    if (q.length > 15 && q.length < 120 && q.includes(' ')) paa.push(q);
  });
  const uniquePaa = [...new Set(paa)].slice(0, 12);

  const patterns = [
    /href="\/url\?q=(https?[^&"]+)[^"]*"[^>]*(?:aria-label="([^"]*)")?[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi,
    /href="(https?:\/\/(?!www\.google\.|webcache\.|accounts\.google)[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi,
    /href="\/url\?q=(https?[^&"]+)/gi,
  ];

  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null && organic.length < 20) {
      let link = decodeURIComponent(m[1].replace(/&amp;/g, '&'));
      let title = (m[3] || m[2] || '').replace(/<[^>]+>/g, '').trim();
      if (!link.startsWith('http')) continue;
      if (/google\.|gstatic\.|youtube\.com\/redirect|webcache/i.test(link)) continue;
      if (seen.has(link)) continue;
      seen.add(link);
      organic.push({
        rank: organic.length + 1,
        link,
        url: link,
        title: title || link,
        snippet: '',
      });
    }
    if (organic.length >= 5) break;
  }

  return { organic, paa: uniquePaa };
}

/** Parse Bing SERP HTML — cite display URL + ck/a redirect decode */
function freeParseBingHtml(html) {
  const organic = [];
  const seen = new Set();
  if (!html || typeof html !== 'string') return organic;

  for (const block of html.matchAll(/class="b_algo"[\s\S]*?(?=class="b_algo"|$)/gi)) {
    const chunk = block[0];
    const citeM = chunk.match(/class="b_attribution"[\s\S]*?<cite[^>]*>([\s\S]*?)<\/cite>/i);
    let link = '';
    if (citeM) {
      link = citeM[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s*›\s*/g, '/')
        .trim();
      if (link && !/^https?:\/\//i.test(link)) {
        link = `https://${link.replace(/^\/\//, '')}`;
      }
    }
    if (!link) {
      const hrefM = chunk.match(/<h2[^>]*>\s*<a[^>]+href="([^"]+)"/i);
      if (hrefM) link = freeDecodeBingRedirect(hrefM[1].replace(/&amp;/g, '&'));
    }
    if (!link.startsWith('http')) continue;
    const norm = link.split(/[?#]/)[0];
    if (/bing\.|microsoft\.|msn\.|facebook\.com\/tr/i.test(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    organic.push({
      rank: organic.length + 1,
      link: norm,
      url: norm,
      title: '',
      snippet: '',
    });
    if (organic.length >= 20) break;
  }

  if (organic.length >= 3) return organic;

  const patterns = [
    /<h2[^>]*>\s*<a[^>]+href="([^"]+)"/gi,
  ];

  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null && organic.length < 20) {
      let link = freeDecodeBingRedirect(m[1].replace(/&amp;/g, '&'));
      if (!link.startsWith('http')) continue;
      if (/bing\.|microsoft\.|msn\.|facebook\.com\/tr/i.test(link)) continue;
      if (seen.has(link)) continue;
      seen.add(link);
      organic.push({
        rank: organic.length + 1,
        link,
        url: link,
        title: '',
        snippet: '',
      });
    }
    if (organic.length >= 5) break;
  }
  return organic;
}

function freeParseDdgHtml(html) {
  const organic = [];
  const seen = new Set();
  if (!html || typeof html !== 'string') return organic;

  for (const m of html.matchAll(/class="result__a"[^>]*href="([^"]+)"/gi)) {
    let link = m[1];
    const u = link.match(/uddg=([^&]+)/);
    if (u) {
      try {
        link = decodeURIComponent(u[1]);
      } catch {
        /* keep raw */
      }
    }
    if (!link.startsWith('http') || seen.has(link)) continue;
    if (/duckduckgo\.com/i.test(link)) continue;
    seen.add(link);
    organic.push({
      rank: organic.length + 1,
      link,
      url: link,
      title: '',
      snippet: '',
    });
    if (organic.length >= 20) break;
  }
  return organic;
}

async function freeDdgSerpSearch(self, query, domain) {
  const q = encodeURIComponent(query.trim());
  const res = await freeHttp(self, 'https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `q=${q}`,
    timeout: 30000,
  });
  const html = typeof res.data === 'string' ? res.data : '';
  const organic = freeParseDdgHtml(html);
  const { ourRank, ourUrl } = freeRankFromOrganic(organic, domain);

  return {
    ok: organic.length > 0,
    source: 'duckduckgo_serp',
    organic_results: organic,
    related_questions: [],
    ourRank,
    ourUrl,
    blocked: false,
  };
}

async function freeBingSerpSearch(self, query, domain) {
  const q = encodeURIComponent(query.trim());
  const url = `https://www.bing.com/search?q=${q}&count=20&setlang=en&cc=US&mkt=en-US`;
  const res = await freeHttp(self, url, { timeout: 30000 });
  const html = typeof res.data === 'string' ? res.data : '';
  const organic = freeParseBingHtml(html);
  const { ourRank, ourUrl } = freeRankFromOrganic(organic, domain);

  return {
    ok: organic.length > 0,
    source: 'bing_serp',
    organic_results: organic,
    related_questions: [],
    ourRank,
    ourUrl,
    blocked: false,
  };
}

/** Scrape Google search results page (free SERP) */
async function freeSerpSearch(self, query, domain) {
  const q = encodeURIComponent(query.trim());
  const url = `https://www.google.com/search?q=${q}&hl=en&gl=in&num=20`;
  const res = await freeHttp(self, url, { timeout: 30000 });
  const html = typeof res.data === 'string' ? res.data : '';
  const parsed = freeParseSerpHtml(html, domain);
  const { ourRank, ourUrl } = freeRankFromOrganic(parsed.organic, domain);

  return {
    ok: res.ok && parsed.organic.length > 0,
    source: 'google_serp',
    organic_results: parsed.organic,
    related_questions: parsed.paa.map((question) => ({ question })),
    ourRank,
    ourUrl,
    blocked: /unusual traffic|captcha|sorry\/index/i.test(html),
    htmlLength: html.length,
  };
}

/** Lighthouse-style heuristic from HTML + fetch time (replaces PageSpeed API) */
function freeHeuristicPerformance(html, fetchMs) {
  const body = html || '';
  const scripts = (body.match(/<script/gi) || []).length;
  const styles = (body.match(/<link[^>]+rel=["']stylesheet/gi) || []).length;
  const imgs = (body.match(/<img/gi) || []).length;
  const imgsNoAlt = (body.match(/<img(?![^>]*\salt=)/gi) || []).length;
  const size = body.length;
  const hasViewport = /name=["']viewport["']/i.test(body);
  const hasTitle = /<title[^>]*>[\s\S]+<\/title>/i.test(body);
  const hasMetaDesc = /name=["']description["']/i.test(body);
  const hasSchema = /application\/ld\+json/i.test(body);
  const lazyImages = (body.match(/loading=["']lazy["']/gi) || []).length;

  let perf = 78;
  if (fetchMs > 4000) perf -= 28;
  else if (fetchMs > 2000) perf -= 15;
  else if (fetchMs > 1000) perf -= 8;
  else if (fetchMs < 400) perf += 8;
  if (size > 800000) perf -= 18;
  else if (size > 400000) perf -= 10;
  if (scripts > 25) perf -= 12;
  else if (scripts > 12) perf -= 6;
  if (styles > 8) perf -= 5;
  if (lazyImages > 0 && imgs > 0) perf += 4;

  let seo = 72;
  if (hasTitle) seo += 8;
  if (hasMetaDesc) seo += 8;
  if (hasSchema) seo += 7;
  if (hasViewport) seo += 5;
  if (imgsNoAlt > imgs * 0.5 && imgs > 3) seo -= 8;

  return {
    performance_score: Math.max(0, Math.min(100, Math.round(perf))),
    seo_score: Math.max(0, Math.min(100, Math.round(seo))),
    lcp_ms: null,
    cls: null,
    tbt_ms: scripts * 40,
    fcp_ms: fetchMs,
    mobile_friendly: hasViewport,
    source: 'free_heuristic_lighthouse_style',
    fetch_ms: fetchMs,
    html_bytes: size,
    script_count: scripts,
    image_count: imgs,
  };
}

async function freeSerpViaSerper(self, query, domain) {
  const key = freeEnv('SERPER_API_KEY');
  if (!key) return null;
  try {
    const serp = await self.helpers.httpRequest({
      method: 'POST',
      url: 'https://google.serper.dev/search',
      headers: {
        'X-API-KEY': key,
        'Content-Type': 'application/json',
      },
      body: {
        q: String(query || '').trim(),
        gl: 'in',
        hl: 'en',
        num: 20,
      },
      json: true,
      timeout: 30000,
    });
    const organic = (serp.organic || []).map((r, i) => ({
      rank: r.position || i + 1,
      link: r.link,
      url: r.link,
      title: r.title || '',
      snippet: r.snippet || '',
    }));
    const { ourRank, ourUrl } = freeRankFromOrganic(organic, domain);
    return {
      ok: organic.length > 0,
      source: 'serper_api',
      organic_results: organic,
      related_questions: (serp.peopleAlsoAsk || []).map((q) => ({
        question: typeof q === 'string' ? q : q?.question || '',
      })).filter((q) => q.question),
      ourRank,
      ourUrl,
      blocked: false,
    };
  } catch {
    return null;
  }
}

async function freeSerpViaSerpApi(self, query, domain) {
  const serpKey = freeEnv('SERP_API_KEY');
  if (!serpKey) return null;
  try {
    const qs = `engine=google&q=${encodeURIComponent(query)}&gl=in&hl=en&api_key=${encodeURIComponent(serpKey)}`;
    const serp = await self.helpers.httpRequest({
      method: 'GET',
      url: `https://serpapi.com/search.json?${qs}`,
      json: true,
      timeout: 30000,
    });
    let ourRank = null;
    let ourUrl = null;
    (serp.organic_results || []).forEach((r, i) => {
      const link = (r.link || r.url || '').toLowerCase();
      if (domain && ourRank == null && freeMatchDomain(link, domain)) {
        ourRank = i + 1;
        ourUrl = r.link || r.url;
      }
    });
    return {
      ok: true,
      source: 'serpapi_paid_fallback',
      organic_results: (serp.organic_results || []).map((r, i) => ({
        rank: i + 1,
        link: r.link || r.url,
        url: r.link || r.url,
        title: r.title,
        snippet: r.snippet,
      })),
      related_questions: serp.related_questions || [],
      ourRank,
      ourUrl,
      blocked: false,
    };
  } catch {
    return null;
  }
}

async function freeSerpOrPaid(self, query, domain) {
  const serper = await freeSerpViaSerper(self, query, domain);
  if (serper?.organic_results?.length) return serper;

  const serpapi = await freeSerpViaSerpApi(self, query, domain);
  if (serpapi?.organic_results?.length) return serpapi;

  // Bing → DuckDuckGo → Google (Render shared IP pe scrape often blocked)
  const bing = await freeBingSerpSearch(self, query, domain);
  if ((bing.organic_results || []).length > 0) {
    return { ...bing, googleBlocked: false, blocked: false };
  }

  await freeDelay(600);
  const ddg = await freeDdgSerpSearch(self, query, domain);
  if ((ddg.organic_results || []).length > 0) {
    return { ...ddg, googleBlocked: false, blocked: false };
  }

  await freeDelay(600);
  const google = await freeSerpSearch(self, query, domain);
  if ((google.organic_results || []).length > 0) {
    return { ...google, googleBlocked: google.blocked, blocked: false };
  }

  return {
    ok: false,
    source: 'all_engines_failed',
    organic_results: [],
    ourRank: null,
    ourUrl: null,
    blocked: true,
    googleBlocked: google.blocked,
  };
}

function freeDomainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function freeDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extract p/h1-h3/li text — token-safe clean content (cheerio-style, no npm) */
function freeExtractPageContent(html) {
  if (!html || typeof html !== 'string') {
    return {
      cleanText: '',
      wordCount: 0,
      h1: [],
      h2: [],
      h3: [],
      h2Count: 0,
      h3Count: 0,
      paragraphCount: 0,
      altTexts: [],
      hasFaq: false,
      hasTable: false,
      hasSchema: false,
      hasVideo: false,
      keywordInTitle: false,
      keywordInH1: false,
    };
  }

  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '');

  function extractTags(tag) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    const out = [];
    let m;
    while ((m = re.exec(body)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 1) out.push(text);
    }
    return out;
  }

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = (titleMatch?.[1] || '').replace(/<[^>]+>/g, ' ').trim();
  const h1 = extractTags('h1');
  const h2 = extractTags('h2');
  const h3 = extractTags('h3');
  const paragraphs = extractTags('p');
  const listItems = extractTags('li');
  const cleanText = [...h1, ...h2, ...h3, ...paragraphs, ...listItems].join('\n\n').slice(0, 12000);
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  const altTexts = [];
  [...html.matchAll(/<img[^>]+alt=["']([^"']+)["']/gi)].forEach((m) => altTexts.push(m[1]));

  return {
    cleanText,
    wordCount,
    pageTitle,
    h1,
    h2,
    h3,
    h2Count: h2.length,
    h3Count: h3.length,
    paragraphCount: paragraphs.length,
    altTexts: altTexts.slice(0, 24),
    hasFaq: /FAQPage/i.test(html),
    hasTable: /<table/i.test(html),
    hasSchema: /application\/ld\+json/i.test(html),
    hasVideo: /<video|VideoObject/i.test(html),
  };
}

function freeKeywordMetrics(text, keyword, title, h1List) {
  if (!keyword?.trim()) {
    return { count: 0, density: 0, inTitle: false, inH1: false };
  }
  const kw = keyword.trim().toLowerCase();
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lower = (text || '').toLowerCase();
  const count = (lower.match(new RegExp(esc, 'g')) || []).length;
  const words = (text || '').split(/\s+/).filter(Boolean).length;
  const titleLower = (title || '').toLowerCase();
  const h1Lower = (h1List || []).join(' ').toLowerCase();
  return {
    count,
    density: words ? Math.round((count / words) * 10000) / 100 : 0,
    inTitle: titleLower.includes(kw),
    inH1: h1Lower.includes(kw),
  };
}

/** Domain age via RDAP (free — replaces whois npm) */
async function freeDomainAge(self, domain) {
  const d = String(domain || '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .trim();
  if (!d || !d.includes('.')) return { ok: false, domain: d, source: 'rdap_free' };

  try {
    const res = await freeHttp(self, `https://rdap.org/domain/${encodeURIComponent(d)}`, {
      json: true,
      timeout: 15000,
      accept: 'application/rdap+json, application/json',
    });
    const data = res.data && typeof res.data === 'object' ? res.data : null;
    if (!data) return { ok: false, domain: d, source: 'rdap_free' };

    const events = data.events || [];
    const reg = events.find((e) => e.eventAction === 'registration') || events[0];
    const created = reg?.eventDate;
    if (!created) return { ok: false, domain: d, source: 'rdap_free' };

    const createdDate = new Date(created);
    const ageYears = Math.round(((Date.now() - createdDate.getTime()) / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
    return {
      ok: true,
      domain: d,
      created: String(created).split('T')[0],
      ageYears,
      ageLabel: ageYears >= 1 ? `${Math.round(ageYears)} Years Old` : `${Math.max(1, Math.round(ageYears * 12))} Months Old`,
      source: 'rdap_free',
    };
  } catch {
    return { ok: false, domain: d, source: 'rdap_free' };
  }
}

/** Google AI Studio Gemini — competitor gap brain (replaces OpenAI) */
async function callGeminiGap(self, userPrompt, opts = {}) {
  const key = freeEnv('GEMINI_API_KEY');
  if (!key) return { ok: false, error: 'no_gemini_key' };

  const model = freeEnv('GEMINI_MODEL') || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const systemInstruction = opts.systemInstruction || `You are an expert SEO Audit Engine. Return valid JSON only.`;

  try {
    const res = await self.helpers.httpRequest({
      method: 'POST',
      url,
      body: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.2,
          maxOutputTokens: opts.maxTokens ?? 2048,
          responseMimeType: 'application/json',
        },
      },
      json: true,
      timeout: 90000,
    });

    const raw = res.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    }

    const usage = res.usageMetadata || {};
    return {
      ok: true,
      parsed,
      tokensIn: usage.promptTokenCount || 0,
      tokensOut: usage.candidatesTokenCount || 0,
      model,
      source: 'gemini_ai_studio',
    };
  } catch (err) {
    return { ok: false, error: err.message, source: 'gemini_ai_studio' };
  }
}

function freeHeuristicGapAnalysis(keyword, our, theirs, ourRank, theirRank) {
  const gaps = [];
  const actions = [];

  if (theirs.wordCount > our.wordCount + 400) {
    gaps.push(`Content depth gap (~${theirs.wordCount - our.wordCount} words short)`);
    actions.push(`Add ${Math.min(1500, theirs.wordCount - our.wordCount + 200)}+ words covering subtopics competitor covers`);
  }
  if (theirs.h2Count > our.h2Count + 1) {
    gaps.push('Heading structure gap');
    actions.push('Add question-based H2/H3 sections matching search intent');
  }
  if (theirs.hasFaq && !our.hasFaq) {
    gaps.push('FAQ schema missing');
    actions.push('Add FAQPage JSON-LD with People Also Ask questions');
  }
  if (theirs.hasTable && !our.hasTable) {
    gaps.push('Comparison table missing');
    actions.push('Add comparison or feature table for dwell time');
  }
  if (theirs.hasVideo && !our.hasVideo) {
    gaps.push('Video content gap');
    actions.push('Add explainer video + VideoObject schema');
  }
  if (!our.keywordMetrics?.inTitle && theirs.keywordMetrics?.inTitle) {
    gaps.push('Keyword not in title');
    actions.push(`Put "${keyword}" in page title tag`);
  }
  if (!our.keywordMetrics?.inH1 && theirs.keywordMetrics?.inH1) {
    gaps.push('Keyword not in H1');
    actions.push(`Use "${keyword}" in primary H1`);
  }

  const why =
    gaps.length > 0
      ? `Competitor ranks #${theirRank} with deeper content (${theirs.wordCount} vs ${our.wordCount} words) and stronger on-page signals.`
      : `Competitor #${theirRank} matches structure — beat with E-E-A-T, freshness, and entity signals.`;

  return {
    WhyTheyRank: why,
    ContentGap: gaps,
    ActionPlan: actions.length ? actions : ['Expand topical coverage', 'Add internal links from high-traffic pages', 'Refresh publish date with substantive updates'],
    executive_summary: `${keyword}: You rank ${ourRank ?? 'outside top 20'} vs competitor #${theirRank}. ${gaps[0] || 'Focus on content depth and intent match.'}`,
    source: 'heuristic_free',
  };
}

// === END FREE AUDIT UTILS ===
