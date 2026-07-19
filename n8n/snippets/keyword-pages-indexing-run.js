// @inject-free-audit-utils
// n8n Code — daily: sitemap.xml + robots.txt → GitHub → Google/Bing/IndexNow ping
const input = $input.first().json;
const body = input.body || input;

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let GITHUB_REPO = '';
let PAGES_BASE_PATH = 'tools/public/pages';
let PUBLIC_BASE = 'https://shop.LifeSolveNow.com/pages';
let INDEXNOW_KEY = '';
let SITEMAP_PATH = 'tools/public/pages/sitemap.xml';

try {
  SUPABASE_URL = $env.SUPABASE_URL || '';
  SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY || '';
  GITHUB_REPO = $env.GITHUB_REPO || $env.VITE_GITHUB_REPO || '';
  PAGES_BASE_PATH = $env.KEYWORD_PAGES_PATH || PAGES_BASE_PATH;
  PUBLIC_BASE = ($env.KEYWORD_PAGES_PUBLIC_BASE || PUBLIC_BASE).replace(/\/$/, '');
  INDEXNOW_KEY = $env.INDEXNOW_KEY || '';
  SITEMAP_PATH = `${PAGES_BASE_PATH}/sitemap.xml`;
} catch {
  /* sandbox */
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function parseSitemapLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml || '')) !== null) locs.push(m[1].trim());
  return [...new Set(locs)];
}

function buildSitemapXml(urls) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = urls
    .map(
      (loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function buildRobotsTxt(sitemapUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
}

async function githubCommit(path, content, message) {
  if (!GITHUB_REPO) return { ok: false, error: 'GITHUB_REPO missing' };
  try {
    return await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/functions/v1/ai-center-github`,
      headers: { Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: { repo: GITHUB_REPO, path, content, message },
      json: true,
      timeout: 60000,
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkGoogleIndexed(self, pageUrl) {
  const q = encodeURIComponent(`site:${pageUrl}`);
  const res = await freeHttp(self, `https://www.google.com/search?q=${q}&hl=en&num=5`, { timeout: 25000 });
  const html = typeof res.data === 'string' ? res.data : '';
  const norm = pageUrl.replace(/\/$/, '').toLowerCase();
  const indexed =
    res.ok &&
    !/unusual traffic|captcha/i.test(html) &&
    html.toLowerCase().includes(norm);
  return { indexed, blocked: /unusual traffic|captcha/i.test(html) };
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  return [{ json: { ok: false, error: 'Supabase env missing' } }];
}

const result = {
  ok: true,
  publicBase: PUBLIC_BASE,
  urls: [],
  pinged: { google: false, bing: false, indexNow: false },
  indexed: 0,
  notIndexed: 0,
  errors: [],
};

let rows = [];
try {
  rows = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/keyword_pages?select=slug,keyword,public_url,status&status=eq.committed&order=created_at.desc&limit=500`,
    headers,
    json: true,
    timeout: 20000,
  });
} catch (err) {
  result.errors.push(`keyword_pages: ${err.message}`);
}

const urls = (rows || [])
  .map((r) => r.public_url || `${PUBLIC_BASE}/${r.slug}.html`)
  .filter(Boolean);

if (!urls.length) {
  urls.push(`${PUBLIC_BASE}/`);
}

result.urls = urls;
const sitemapFullUrl = `${PUBLIC_BASE.replace(/\/pages\/?$/, '')}/pages/sitemap.xml`.replace(
  /([^:]\/)\/+/g,
  '$1'
);
if (!sitemapFullUrl.includes('sitemap.xml')) {
  const base = PUBLIC_BASE.endsWith('/pages') ? PUBLIC_BASE : `${PUBLIC_BASE}`;
  result.sitemapUrl = `${base}/sitemap.xml`;
} else {
  result.sitemapUrl = sitemapFullUrl.includes('sitemap') ? sitemapFullUrl : `${PUBLIC_BASE}/sitemap.xml`;
}
result.sitemapUrl = `${PUBLIC_BASE}/sitemap.xml`;

const sitemapXml = buildSitemapXml(urls);
const robotsTxt = buildRobotsTxt(result.sitemapUrl);

if (GITHUB_REPO && body.skipGithub !== true) {
  await githubCommit.call(this, SITEMAP_PATH, sitemapXml, 'keyword-pages: update sitemap.xml');
  await githubCommit.call(this, `${PAGES_BASE_PATH}/robots.txt`, robotsTxt, 'keyword-pages: update robots.txt');
  if (INDEXNOW_KEY) {
    await githubCommit.call(
      this,
      `${PAGES_BASE_PATH}/indexnow-key.txt`,
      INDEXNOW_KEY,
      'keyword-pages: indexnow key file'
    );
  }
}

// Google sitemap ping (legacy but still used)
try {
  const gPing = `https://www.google.com/ping?sitemap=${encodeURIComponent(result.sitemapUrl)}`;
  await freeHttp(this, gPing, { timeout: 20000 });
  result.pinged.google = true;
} catch (err) {
  result.errors.push(`google ping: ${err.message}`);
}

// Bing sitemap ping
try {
  const bPing = `https://www.bing.com/ping?sitemap=${encodeURIComponent(result.sitemapUrl)}`;
  await freeHttp(this, bPing, { timeout: 20000 });
  result.pinged.bing = true;
} catch (err) {
  result.errors.push(`bing ping: ${err.message}`);
}

// IndexNow — open protocol (Bing, Yandex, Seznam, Naver)
if (INDEXNOW_KEY && urls.length) {
  try {
    let host;
    try {
      host = new URL(urls[0]).hostname;
    } catch {
      host = 'shop.LifeSolveNow.com';
    }
    await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.indexnow.org/indexnow',
      headers: { 'Content-Type': 'application/json' },
      body: {
        host,
        key: INDEXNOW_KEY,
        keyLocation: `https://${host}/pages/indexnow-key.txt`,
        urlList: urls.slice(0, 100),
      },
      json: true,
      timeout: 25000,
    });
    result.pinged.indexNow = true;
  } catch (err) {
    result.errors.push(`indexnow: ${err.message}`);
  }
}

const checkLimit = Math.min(Number(body.checkLimit || 3), 5);
const now = new Date().toISOString();

for (const url of urls.slice(0, checkLimit)) {
  try {
    const { indexed, blocked } = await checkGoogleIndexed(this, url);
    if (blocked) {
      result.errors.push(`google check blocked at ${url}`);
      break;
    }
    const slug = url.split('/').pop()?.replace('.html', '');
    if (indexed) result.indexed += 1;
    else result.notIndexed += 1;
    if (slug) {
      await this.helpers.httpRequest({
        method: 'PATCH',
        url: `${SUPABASE_URL}/rest/v1/keyword_pages?slug=eq.${encodeURIComponent(slug)}`,
        headers: { ...headers, Prefer: 'return=minimal' },
        body: {
          index_status: indexed ? 'indexed' : 'pending',
          last_index_check_at: now,
          last_index_ping_at: now,
          public_url: url,
        },
        json: true,
        timeout: 15000,
      }).catch(() => null);
    }
    await freeDelay(2000);
  } catch (err) {
    result.errors.push(`check ${url}: ${err.message}`);
  }
}

// Upsert indexing_queue for new pages (reuse shop indexing table)
for (const url of urls.slice(0, 20)) {
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/indexing_queue`,
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: {
        url,
        index_status: 'submitted',
        index_method: 'sitemap_ping',
        last_sitemap_ping_at: now,
        next_retry_at: now,
      },
      json: true,
      timeout: 15000,
    }).catch(() => null);
  } catch {
    /* queue optional */
  }
}

return [{ json: result }];
