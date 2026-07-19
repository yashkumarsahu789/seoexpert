// @inject-free-audit-utils
// n8n Code — deep sitemap parse + free performance heuristic (no PageSpeed key required)
const ctx = $input.first().json;
const baseUrl = ctx.baseUrl || ctx.websiteUrl;
const domain = ctx.domain;

const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'anthropic-ai', 'ChatGPT-User'];

function stripTags(htmlStr) {
  return (htmlStr || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function safeFetch(url, opts = {}) {
  try {
    const res = await this.helpers.httpRequest({
      method: opts.method || 'GET',
      url,
      headers: opts.headers || { 'User-Agent': 'LifeSolveNow-AuditBot/1.0' },
      json: opts.json ?? false,
      timeout: opts.timeout || 20000,
      ignoreHttpStatusErrors: true,
    });
    return { ok: true, data: res, url };
  } catch (err) {
    return { ok: false, error: err.message, url };
  }
}

function extractLocs(xml) {
  if (!xml || typeof xml !== 'string') return [];
  return [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

async function collectSitemapUrls(startUrls, maxUrls = 1000) {
  const pageUrls = new Set();
  const visited = new Set();

  async function walk(sitemapUrl, depth) {
    if (depth > 3 || pageUrls.size >= maxUrls || visited.has(sitemapUrl)) return;
    visited.add(sitemapUrl);
    const res = await safeFetch.call(this, sitemapUrl);
    const xml = typeof res.data === 'string' ? res.data : '';
    if (!xml) return;

    const locs = extractLocs(xml);
    const isIndex = /<sitemapindex/i.test(xml);

    if (isIndex) {
      for (const child of locs.slice(0, 15)) {
        await walk.call(this, child, depth + 1);
        if (pageUrls.size >= maxUrls) break;
      }
    } else {
      for (const loc of locs) {
        pageUrls.add(loc);
        if (pageUrls.size >= maxUrls) break;
      }
    }
  }

  for (const url of startUrls) {
    await walk.call(this, url, 0);
    if (pageUrls.size >= maxUrls) break;
  }

  return [...pageUrls].slice(0, maxUrls);
}

const [htmlRes, robotsRes, sitemapRes, llmsRes, llmsFullRes] = await Promise.all([
  safeFetch.call(this, ctx.websiteUrl),
  safeFetch.call(this, `${baseUrl}/robots.txt`),
  safeFetch.call(this, `${baseUrl}/sitemap.xml`),
  safeFetch.call(this, `${baseUrl}/llms.txt`),
  safeFetch.call(this, `${baseUrl}/llms-full.txt`),
]);

const htmlFetchStart = Date.now();
const htmlTimed = await freeHttp(this, ctx.websiteUrl);
const htmlBodyTimed = typeof htmlTimed.data === 'string' ? htmlTimed.data : typeof htmlRes.data === 'string' ? htmlRes.data : '';

let pagespeed = null;
let pagespeedError = null;
let pagespeedSource = 'free_heuristic';

const psiKey = freeEnv('PAGESPEED_API_KEY') || freeEnv('GOOGLE_API_KEY');
if (psiKey) {
  try {
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(ctx.websiteUrl)}&strategy=MOBILE&category=PERFORMANCE&category=SEO&key=${psiKey}`;
    const pagespeedRaw = await this.helpers.httpRequest({ method: 'GET', url: psiUrl, json: true, timeout: 90000 });
    if (pagespeedRaw?.lighthouseResult) {
      pagespeedSource = 'google_pagespeed_api';
      const audits = pagespeedRaw.lighthouseResult.audits || {};
      const categories = pagespeedRaw.lighthouseResult.categories || {};
      pagespeed = {
        performance_score: Math.round((categories.performance?.score || 0) * 100),
        seo_score: Math.round((categories.seo?.score || 0) * 100),
        lcp_ms: audits['largest-contentful-paint']?.numericValue,
        cls: audits['cumulative-layout-shift']?.numericValue,
        tbt_ms: audits['total-blocking-time']?.numericValue,
        fcp_ms: audits['first-contentful-paint']?.numericValue,
        mobile_friendly: audits['viewport']?.score === 1,
        source: pagespeedSource,
      };
    }
  } catch (err) {
    pagespeedError = err.message;
  }
}

if (!pagespeed) {
  pagespeed = freeHeuristicPerformance(htmlBodyTimed, htmlTimed.ms || Date.now() - htmlFetchStart);
  pagespeedSource = pagespeed.source;
}

function parseRobots(text) {
  if (!text || typeof text !== 'string') {
    return { found: false, allowsAll: false, aiBots: {}, sitemapRefs: [] };
  }
  const lines = text.split(/\r?\n/);
  let currentAgents = [];
  const aiBots = {};
  const sitemapRefs = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split(':');
    const value = rest.join(':').trim();
    const k = key.toLowerCase();

    if (k === 'user-agent') currentAgents = [value.toLowerCase()];
    else if (k === 'disallow') {
      for (const agent of currentAgents) {
        for (const bot of AI_BOTS) {
          if (agent === bot.toLowerCase() || agent === '*') {
            aiBots[bot] = aiBots[bot] || { disallowed: [], allowed: [] };
            if (value) aiBots[bot].disallowed.push(value);
            else aiBots[bot].allowed.push('/');
          }
        }
      }
    } else if (k === 'allow') {
      for (const agent of currentAgents) {
        for (const bot of AI_BOTS) {
          if (agent === bot.toLowerCase()) {
            aiBots[bot] = aiBots[bot] || { disallowed: [], allowed: [] };
            aiBots[bot].allowed.push(value || '/');
          }
        }
      }
    } else if (k === 'sitemap') sitemapRefs.push(value);
  }

  const botStatus = {};
  for (const bot of AI_BOTS) {
    const entry = aiBots[bot];
    if (!entry) botStatus[bot] = 'allowed_default';
    else if (entry.disallowed.some((d) => d === '/' || d === '/*')) botStatus[bot] = 'blocked';
    else botStatus[bot] = 'partial_or_allowed';
  }

  return { found: true, allowsAll: Object.keys(aiBots).length === 0, aiBots: botStatus, sitemapRefs };
}

const htmlBody = htmlBodyTimed || (typeof htmlRes.data === 'string' ? htmlRes.data : '');
const robotsText = typeof robotsRes.data === 'string' ? robotsRes.data : '';
const robots = parseRobots(robotsText);

const sitemapSeeds = [
  `${baseUrl}/sitemap.xml`,
  ...(robots.sitemapRefs || []),
].filter(Boolean);
const allSitemapUrls = await collectSitemapUrls.call(this, [...new Set(sitemapSeeds)], 1000);

const plainWords = stripTags(htmlBody).split(/\s+/).filter(Boolean).length;
const jsShellSuspected =
  htmlBody.length > 800 &&
  plainWords < 120 &&
  /id=["'](root|app|__next)["']/i.test(htmlBody);

const llmsText = typeof llmsRes.data === 'string' ? llmsRes.data : '';
const llmsFullText = typeof llmsFullRes.data === 'string' ? llmsFullRes.data : '';

let cwv = pagespeed;
if (pagespeed && !pagespeed.source) {
  cwv = { ...pagespeed, source: pagespeedSource };
}

return [
  {
    json: {
      ...ctx,
      technical: {
        html: {
          ok: htmlRes.ok,
          length: htmlBody.length,
          body: htmlBody.slice(0, 500000),
          jsShellSuspected,
          staticWordCount: plainWords,
        },
        robots: { ok: robotsRes.ok, ...robots, raw: robotsText.slice(0, 10000) },
        sitemap: {
          ok: sitemapRes.ok || allSitemapUrls.length > 0,
          urlCount: allSitemapUrls.length,
          urls: allSitemapUrls.slice(0, 100),
          allUrls: allSitemapUrls,
          sitemapRefs: robots.sitemapRefs,
        },
        llms: {
          llms_txt: llmsText.length > 10,
          llms_full_txt: llmsFullText.length > 10,
          llms_txt_valid: llmsText.includes('#') || llmsText.toLowerCase().includes('http'),
          preview: llmsText.slice(0, 500),
        },
        pagespeed: cwv,
        pagespeedSource,
        pagespeedError,
        jsRenderingNote:
          'Performance via free HTML heuristic (Lighthouse-style). Optional PAGESPEED_API_KEY for Google official scores.',
      },
    },
  },
];
