// @inject-free-audit-utils
// n8n Code — daily shop indexing: sitemap URLs → Google index check → sitemap ping
let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let SITEMAP_URL = 'https://shop.LifeSolveNow.com/sitemap.xml';
try {
  SUPABASE_URL = $env.SUPABASE_URL || '';
  SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY || '';
  SITEMAP_URL = $env.VITE_SHOP_SITEMAP_URL || $env.SHOP_SITEMAP_URL || SITEMAP_URL;
} catch {
  /* sandbox */
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function sbGet(path) {
  return this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/${path}`,
    headers,
    json: true,
    timeout: 30000,
  });
}

async function sbPatch(table, filter, body) {
  return this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/${table}?${filter}`,
    headers,
    body,
    json: true,
    timeout: 20000,
  }).catch(() => null);
}

function parseSitemapLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml || '')) !== null) {
    const loc = m[1].trim();
    if (loc && !loc.endsWith('sitemap.xml')) locs.push(loc);
  }
  return [...new Set(locs)];
}

async function checkGoogleIndexed(self, pageUrl) {
  const q = encodeURIComponent(`site:${pageUrl}`);
  const res = await freeHttp(self, `https://www.google.com/search?q=${q}&hl=en&num=5`, { timeout: 25000 });
  const html = typeof res.data === 'string' ? res.data : '';
  const normalized = pageUrl.replace(/\/$/, '').toLowerCase();
  const indexed =
    res.ok &&
    !/unusual traffic|captcha/i.test(html) &&
    (html.toLowerCase().includes(normalized) || html.includes(encodeURIComponent(normalized)));
  return { indexed, blocked: /unusual traffic|captcha/i.test(html) };
}

const results = { checked: 0, indexed: 0, notIndexed: 0, pinged: false, errors: [] };

if (!SUPABASE_URL || !SUPABASE_KEY) {
  return [{ json: { ok: false, error: 'Supabase env missing', ...results } }];
}

let queueRows = [];
try {
  queueRows = await sbGet.call(this, 'indexing_queue?select=id,shop_id,url,index_status&limit=500');
} catch (err) {
  results.errors.push(`queue: ${err.message}`);
}

let shops = [];
try {
  shops = await sbGet.call(this, 'shops?select=id,shop_url,slug,primary_keywords&limit=500');
} catch {
  shops = [];
}

const urlMap = new Map();
for (const row of queueRows || []) {
  if (row.url) urlMap.set(row.url, { queueId: row.id, shopId: row.shop_id, index_status: row.index_status });
}
for (const shop of shops || []) {
  if (shop.shop_url && !urlMap.has(shop.shop_url)) {
    urlMap.set(shop.shop_url, { queueId: null, shopId: shop.id, index_status: 'pending' });
  }
}

try {
  const sm = await freeHttp(this, SITEMAP_URL, { timeout: 30000 });
  const xml = typeof sm.data === 'string' ? sm.data : '';
  for (const loc of parseSitemapLocs(xml).slice(0, 200)) {
    if (!urlMap.has(loc)) urlMap.set(loc, { queueId: null, shopId: null, index_status: 'pending' });
  }
} catch (err) {
  results.errors.push(`sitemap: ${err.message}`);
}

const entries = [...urlMap.entries()].slice(0, 80);
let needsPing = false;

for (const [url, meta] of entries) {
  results.checked += 1;
  try {
    const { indexed, blocked } = await checkGoogleIndexed(this, url);
    if (blocked) {
      results.errors.push(`blocked at ${url}`);
      await freeDelay(5000);
      continue;
    }
    if (indexed) {
      results.indexed += 1;
      if (meta.queueId) {
        await sbPatch.call(this, 'indexing_queue', `id=eq.${meta.queueId}`, {
          index_status: 'indexed',
          is_indexed: true,
          last_index_check_at: new Date().toISOString(),
        });
      }
    } else {
      results.notIndexed += 1;
      needsPing = true;
      if (meta.queueId) {
        await sbPatch.call(this, 'indexing_queue', `id=eq.${meta.queueId}`, {
          index_status: 'pending',
          is_indexed: false,
          last_index_check_at: new Date().toISOString(),
          next_retry_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    results.errors.push(`${url}: ${err.message}`);
  }
  await freeDelay(1500);
}

if (needsPing || results.notIndexed > 0) {
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    await freeHttp(this, pingUrl, { timeout: 20000 });
    results.pinged = true;
    const now = new Date().toISOString();
    for (const [, meta] of entries) {
      if (meta.queueId) {
        await sbPatch.call(this, 'indexing_queue', `id=eq.${meta.queueId}`, {
          index_status: 'submitted',
          index_method: 'sitemap_ping',
          last_sitemap_ping_at: now,
        });
      }
    }
  } catch (err) {
    results.errors.push(`ping: ${err.message}`);
  }
}

return [{ json: { ok: true, sitemapUrl: SITEMAP_URL, ...results } }];
