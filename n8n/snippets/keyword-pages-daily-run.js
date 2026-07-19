// @inject-free-audit-utils
// @inject-page-generator
// @inject-seo-trends
// n8n Code — daily: 1 page → AI SEO (optional) → GitHub → sitemap → indexing ping
const input = $input.first().json;
const body = input.body || input;
const dryRun = body.dryRun === true;
const forceRun = body.forceRun === true;
let DAILY_MAX = 1;
try {
  DAILY_MAX = Math.max(1, Math.min(Number($env.KEYWORD_PAGES_DAILY_MAX || 1), 1));
} catch {
  DAILY_MAX = 1;
}
// Production: max 1 site per run (24h cron). Dry-run / forceRun allows body.maxPages for testing only.
const requestedMax = Number(body.maxPages);
const maxPages =
  dryRun || forceRun
    ? Math.min(Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : 1), 3)
    : Math.min(Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : DAILY_MAX), DAILY_MAX);

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let GITHUB_REPO = '';
let PAGES_BASE_PATH = 'tools/public/pages';
let PUBLIC_BASE = 'https://shop.LifeSolveNow.com/pages';
let USE_AI_SEO = true;
try {
  SUPABASE_URL = $env.SUPABASE_URL || '';
  SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY || '';
  GITHUB_REPO = $env.GITHUB_REPO || $env.VITE_GITHUB_REPO || '';
  PAGES_BASE_PATH = $env.KEYWORD_PAGES_PATH || 'tools/public/pages';
  PUBLIC_BASE = ($env.KEYWORD_PAGES_PUBLIC_BASE || PUBLIC_BASE).replace(/\/$/, '');
  USE_AI_SEO = String($env.KEYWORD_PAGES_USE_AI_SEO || 'true').toLowerCase() !== 'false';
} catch {
  /* sandbox */
}

const SEED_KEYWORDS = ${SEED_KEYWORDS_JSON};

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

if (!SUPABASE_URL || !SUPABASE_KEY) {
  return [{ json: { ok: false, error: 'Supabase env missing on Render n8n' } }];
}

async function fetchExistingSlugs() {
  try {
    const rows = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/keyword_pages?select=slug,keyword,created_at&order=created_at.desc&limit=500`,
      headers,
      json: true,
      timeout: 20000,
    });
    return { slugs: new Set((rows || []).map((r) => r.slug)), rows: rows || [] };
  } catch {
    return { slugs: new Set(), rows: [] };
  }
}

async function createdInLast24h(rows) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return (rows || []).filter((r) => {
    const t = r.created_at ? new Date(r.created_at).getTime() : 0;
    return t >= cutoff;
  });
}

async function collectKeywords() {
  const found = new Set(SEED_KEYWORDS);
  for (const seed of SEED_KEYWORDS.slice(0, 6)) {
    const suggestions = await freeGoogleSuggest(this, seed);
    suggestions.slice(0, 4).forEach((s) => found.add(s));
  }
  try {
    const rankRows = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/shop_rank_snapshots?select=keyword&order=checked_at.desc&limit=50`,
      headers,
      json: true,
      timeout: 20000,
    });
    (rankRows || []).forEach((r) => {
      if (r.keyword && r.keyword.length > 2) found.add(String(r.keyword).trim());
    });
  } catch {
    /* optional */
  }
  return [...found].slice(0, 30);
}

async function serpTopUrl(keyword) {
  const serp = await freeSerpOrPaid(this, keyword, 'shop.lifesolvenow.com');
  const top = serp?.organic?.[0]?.link || serp?.organic?.[0]?.url || '';
  return top;
}

async function githubCommit(path, content, message) {
  if (!GITHUB_REPO) return { ok: false, error: 'GITHUB_REPO env missing' };
  const edgeUrl = `${SUPABASE_URL}/functions/v1/ai-center-github`;
  try {
    const res = await this.helpers.httpRequest({
      method: 'POST',
      url: edgeUrl,
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: {
        repo: GITHUB_REPO,
        path,
        content,
        message,
      },
      json: true,
      timeout: 60000,
    });
    return res;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function savePageRecord(row) {
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/keyword_pages`,
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: row,
      json: true,
      timeout: 20000,
    });
  } catch {
    /* table may not exist yet */
  }
}

function buildAiSeoPrompt(keyword, brandName, targetUrl) {
  return `[keyword_page_seo]
Apply 2026 SEO best practices (helpful content, E-E-A-T, 155-char meta, FAQ schema hints, AEO snippets).

Reply ONLY valid JSON:
{"title":"...","description":"...","h1":"...","bullets":["...","...","..."]}

Trends:
${seoTrendsBlock()}

Keyword: ${keyword}
Brand: ${brandName}
Redirect: ${targetUrl}`;
}

function mergeSeoJson(html, seo) {
  if (!seo?.title) return html;
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${seo.title.replace(/</g, '')}</title>`);
  if (seo.description) {
    out = out.replace(
      /<meta name="description" content="[^"]*"/,
      `<meta name="description" content="${String(seo.description).replace(/"/g, '&quot;')}"`
    );
  }
  if (seo.h1) {
    out = out.replace(/<h1>[^<]*<\/h1>/, `<h1>${seo.h1.replace(/</g, '')}</h1>`);
  }
  return out;
}

async function pollBulkTask(taskId, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const row = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/bulk_tasks?id=eq.${taskId}&select=status,ai_response`,
      headers,
      json: true,
      timeout: 15000,
    });
    const t = row?.[0];
    if (t?.status === 'completed') return t.ai_response;
    if (t?.status === 'failed') return null;
    await freeDelay(2500);
  }
  return null;
}

async function runAiSeo(keyword, cls) {
  if (!USE_AI_SEO) return null;
  const brandName = cls.name || keyword;
  const targetUrl = cls.targetUrl || cls.url || '';
  const prompt = buildAiSeoPrompt(keyword, brandName, targetUrl);
  try {
    const inserted = await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/bulk_tasks`,
      headers: { ...headers, Prefer: 'return=representation' },
      body: [{ input_text: prompt, model_key: 'llama' }],
      json: true,
      timeout: 20000,
    });
    const taskId = inserted?.[0]?.id;
    if (!taskId) return null;
    const raw = await pollBulkTask.call(this, taskId);
    if (!raw) return null;
    const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

async function runIndexingPing(newUrls) {
  const sitemapUrl = `${PUBLIC_BASE}/sitemap.xml`;
  const ping = { google: false, bing: false, indexNow: false };
  try {
    await freeHttp(this, `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { timeout: 20000 });
    ping.google = true;
  } catch {
    /* optional */
  }
  try {
    await freeHttp(this, `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, { timeout: 20000 });
    ping.bing = true;
  } catch {
    /* optional */
  }
  const indexKey = $env.INDEXNOW_KEY || '';
  if (indexKey && newUrls?.length) {
    try {
      const host = new URL(newUrls[0]).hostname;
      await this.helpers.httpRequest({
        method: 'POST',
        url: 'https://api.indexnow.org/indexnow',
        headers: { 'Content-Type': 'application/json' },
        body: {
          host,
          key: indexKey,
          keyLocation: `https://${host}/pages/indexnow-key.txt`,
          urlList: newUrls.slice(0, 10),
        },
        json: true,
        timeout: 20000,
      });
      ping.indexNow = true;
    } catch {
      /* optional */
    }
  }
  return ping;
}

const { slugs: existingSlugs, rows: existingRows } = await fetchExistingSlugs.call(this);

if (!dryRun && !forceRun) {
  const recent = await createdInLast24h(existingRows);
  if (recent.length >= DAILY_MAX) {
    return [{
      json: {
        ok: true,
        skipped: true,
        reason: 'daily_limit',
        message: `Last 24h me ${recent.length} page already — abhi sirf 1/day allowed`,
        lastPage: recent[0] ? { keyword: recent[0].keyword, slug: recent[0].slug, at: recent[0].created_at } : null,
        maxPagesPerDay: DAILY_MAX,
        pagesCreated: 0,
        results: [],
      },
    }];
  }
}

const keywords = await collectKeywords.call(this);
const results = [];
let created = 0;

for (const keyword of keywords) {
  if (created >= maxPages) break;
  const slug = slugify(keyword);
  if (existingSlugs.has(slug)) {
    results.push({ keyword, slug, skipped: true, reason: 'already exists' });
    continue;
  }

  const topUrl = await serpTopUrl.call(this, keyword);
  const cls = classifyKeyword(keyword, topUrl);
  const page = generatePage(keyword, cls, topUrl);
  const filePath = `${PAGES_BASE_PATH}/${page.slug}.html`;
  const publicUrl = `${PUBLIC_BASE}/${page.slug}.html`;
  const brandName = cls.name || keyword;

  let html = page.html;
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
  html = injectSeoIntoHtml(html, {
    title: titleMatch?.[1] || keyword,
    description: descMatch?.[1] || '',
    canonicalUrl: publicUrl,
    keyword,
    pageType: page.pageType,
    brandName,
  });

  let usedAi = false;
  let seoTitle = titleMatch?.[1] || null;
  let seoDescription = descMatch?.[1] || null;

  if (page.pageType === 'brand' && USE_AI_SEO && !dryRun) {
    const seo = await runAiSeo.call(this, keyword, cls);
    if (seo) {
      html = mergeSeoJson(html, seo);
      usedAi = true;
      seoTitle = seo.title || seoTitle;
      seoDescription = seo.description || seoDescription;
      html = injectSeoIntoHtml(html, {
        title: seoTitle,
        description: seoDescription,
        canonicalUrl: publicUrl,
        keyword,
        pageType: page.pageType,
        brandName,
      });
    }
  }

  const record = {
    keyword,
    slug: page.slug,
    page_type: page.pageType,
    serp_top_url: topUrl || null,
    target_url: cls.targetUrl || cls.url || null,
    github_path: filePath,
    public_url: publicUrl,
    seo_title: seoTitle,
    seo_description: seoDescription,
    status: dryRun ? 'dry_run' : 'pending',
    index_status: 'pending',
    used_ai: usedAi,
  };

  if (dryRun) {
    results.push({ ...record, ok: true, dryRun: true, htmlBytes: html.length, seoLayer: 'code+schema' });
    existingSlugs.add(slug);
    created++;
    continue;
  }

  const commit = await githubCommit.call(
    this,
    filePath,
    html,
    `keyword-pages: add ${page.slug} (${page.pageType}${usedAi ? '+ai-seo' : ''})`
  );

  if (commit.ok === false && commit.error) {
    results.push({ ...record, ok: false, error: commit.error });
    continue;
  }

  record.status = 'committed';
  record.github_commit = commit.commit || null;
  record.last_index_ping_at = new Date().toISOString();
  await savePageRecord.call(this, record);
  existingSlugs.add(slug);
  created++;
  results.push({ ...record, ok: true, commit: commit.commit || null, htmlBytes: html.length });
}

const newPublicUrls = results.filter((r) => r.ok && !r.skipped && r.public_url).map((r) => r.public_url);

// Sitemap + robots + indexing ping
let indexing = null;
if (!dryRun) {
  const allSlugs = [...existingSlugs];
  const allUrls = allSlugs.map((s) => `${PUBLIC_BASE}/${s}.html`);
  if (allUrls.length) {
    const sitemapXml = buildPagesSitemapXml(allUrls, PUBLIC_BASE);
    const robotsTxt = buildRobotsTxt(`${PUBLIC_BASE}/sitemap.xml`);
    await githubCommit.call(this, `${PAGES_BASE_PATH}/sitemap.xml`, sitemapXml, 'keyword-pages: sitemap.xml');
    await githubCommit.call(this, `${PAGES_BASE_PATH}/robots.txt`, robotsTxt, 'keyword-pages: robots.txt');
  }
  if (newPublicUrls.length) {
    indexing = await runIndexingPing.call(this, newPublicUrls);
  } else if (allUrls.length) {
    indexing = await runIndexingPing.call(this, allUrls.slice(0, 1));
  }
}

// Update registry JSON
if (!dryRun && created > 0) {
  const registry = {
    updated_at: new Date().toISOString(),
    pages: results.filter((r) => r.ok && !r.skipped).map((r) => ({
      slug: r.slug,
      keyword: r.keyword,
      page_type: r.page_type,
      path: `/pages/${r.slug}.html`,
    })),
  };
  await githubCommit.call(
    this,
    `${PAGES_BASE_PATH}/index.json`,
    JSON.stringify(registry, null, 2),
    'keyword-pages: update index.json'
  );
}

return [{
  json: {
    ok: true,
    dryRun,
    forceRun,
    maxPages,
    maxPagesPerDay: DAILY_MAX,
    keywordsScanned: keywords.length,
    pagesCreated: created,
    githubRepo: GITHUB_REPO || null,
    publicBase: PUBLIC_BASE,
    useAiSeo: USE_AI_SEO,
    indexing,
    results,
  },
}];
