// @inject-free-audit-utils
// n8n Code — on-demand rank check for one shop (webhook) or all shops (daily)
const input = $input.first().json;
const body = input.body || input;
const shopId = body.shopId || body.shop_id || null;
const checkAll = body.checkAll === true || !shopId;

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
try {
  SUPABASE_URL = $env.SUPABASE_URL || '';
  SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY || '';
} catch {
  /* sandbox */
}

const SYSTEM_SLUGS = new Set([
  'download', 'login', 'signup', 'plans', 'search', 'legal', 'admin', 'blog', 'install', 'add-shop',
]);

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

if (!SUPABASE_URL || !SUPABASE_KEY) {
  return [{ json: { ok: false, error: 'Supabase env missing' } }];
}

function cleanName(name, slug) {
  const raw = String(name || slug || '').trim();
  return raw.split('|')[0].split('–')[0].trim().slice(0, 48) || String(slug || '').replace(/-/g, ' ');
}

function isUsefulKeyword(keyword) {
  const k = String(keyword || '').trim();
  if (k.length < 3 || k.length > 55) return false;
  if (/[|]/.test(k)) return false;
  if (/https?:\/\//i.test(k)) return false;
  return true;
}

function buildAllKeywords(shop, clusterKeywords = [], suggestions = []) {
  const slugKey = String(shop.slug || '').toLowerCase().split('/').pop() || '';
  if (SYSTEM_SLUGS.has(slugKey)) return [];

  let city = shop.city && shop.city !== 'India' ? shop.city : null;
  let area = shop.area || null;
  let name = cleanName(shop.name, shop.slug);
  let slugWords = String(shop.slug || '').replace(/-/g, ' ').trim();
  try {
    const parts = new URL(shop.shop_url || '').pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
    if (parts.length >= 2) {
      city = city || parts[0].replace(/-/g, ' ');
      slugWords = parts[parts.length - 1].replace(/-/g, ' ');
      name = cleanName(shop.name, parts[parts.length - 1]);
      area = area || (parts.length > 2 ? parts.slice(1, -1).join(' ').replace(/-/g, ' ') : null);
    }
  } catch {
    /* noop */
  }

  const types = shop.product_types || [];
  const type = types[0] && types[0] !== 'general' ? types[0] : null;

  const keywords = [];
  if (name.length >= 3) keywords.push(name);
  if (city && name) keywords.push(`${name} ${city}`);
  if (area && name) keywords.push(`${name} ${area}`);
  if (area && city && name) keywords.push(`${name} ${area} ${city}`);
  if (city && slugWords) keywords.push(`${slugWords} ${city}`);
  if (type && city) {
    keywords.push(`${type} shop ${area || city}`);
    keywords.push(`best ${type} ${city}`);
    keywords.push(`${type} near me ${city}`);
  }
  if (name && city) keywords.push(`${name} near me`);

  for (const kw of shop.primary_keywords || []) {
    keywords.push(String(kw).split('|')[0].trim());
  }
  for (const kw of clusterKeywords) keywords.push(String(kw).split('|')[0].trim());
  for (const kw of suggestions) keywords.push(String(kw).trim());

  return [...new Set(keywords.map((k) => k.replace(/\s+/g, ' ').trim()).filter(isUsefulKeyword))];
}

async function fetchShops(targetId) {
  const filter = targetId
    ? `id=eq.${encodeURIComponent(targetId)}`
    : 'automation_status=eq.active';
  return this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/shops?select=id,name,shop_url,slug,city,area,primary_keywords,product_types&${filter}&limit=100`,
    headers,
    json: true,
    timeout: 30000,
  });
}

async function fetchClusterKeywords(shop) {
  if (!shop.city) return [];
  try {
    const areaFilter = shop.area
      ? `&area=eq.${encodeURIComponent(shop.area)}`
      : '';
    const rows = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/location_keyword_clusters?select=keywords&city=eq.${encodeURIComponent(shop.city)}${areaFilter}&limit=5`,
      headers,
      json: true,
      timeout: 15000,
    });
    return (rows || []).flatMap((r) => r.keywords || []);
  } catch {
    return [];
  }
}

const allResults = [];
const rankRows = [];

let shops = [];
try {
  shops = await fetchShops.call(this, checkAll ? null : shopId);
} catch (err) {
  return [{ json: { ok: false, error: err.message } }];
}

if (!shops?.length) {
  return [{ json: { ok: false, error: shopId ? 'Shop not found' : 'No active shops' } }];
}

for (const shop of shops) {
  const domain = freeDomainFromUrl(shop.shop_url || '');
  if (!domain) continue;

  const clusterKw = await fetchClusterKeywords.call(this, shop);
  const seed = cleanName(shop.name, shop.slug);
  let suggestions = [];
  try {
    suggestions = await freeGoogleSuggest(this, seed);
  } catch {
    suggestions = [];
  }

  const keywords = buildAllKeywords(shop, clusterKw, suggestions.slice(0, 8));
  const toCheck = checkAll ? keywords.slice(0, 5) : keywords;
  if (!toCheck.length) continue;

  const shopRows = [];

  for (const keyword of toCheck) {
    try {
      const serp = await freeSerpOrPaid(this, keyword, domain);
      const rank = serp.ourRank ?? null;
      const checkedAt = new Date().toISOString();
      const row = {
        keyword,
        rank,
        rank_position: rank,
        checkedAt,
        engine: serp.source || null,
        shop_url: serp.ourUrl || shop.shop_url,
      };
      shopRows.push(row);
      allResults.push({ shopId: shop.id, ...row });
      rankRows.push({
        shop_id: shop.id,
        keyword,
        rank_position: rank,
        shop_url: shop.shop_url,
        checked_at: checkedAt,
        metadata: { source: serp.source || 'free_serp', topUrl: serp.ourUrl },
      });
    } catch {
      shopRows.push({ keyword, rank: null, rank_position: null, checkedAt: null, engine: null });
    }
    await freeDelay(1100);
  }

  if (checkAll) {
    /* daily batch — continue */
  }
}

if (rankRows.length) {
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/shop_rank_snapshots`,
    headers,
    body: rankRows,
    json: true,
  }).catch(() => {});
}

const targetShop = shopId ? shops.find((s) => s.id === shopId) || shops[0] : null;
const rowsForShop = shopId
  ? allResults.filter((r) => r.shopId === shopId).map(({ shopId: _id, ...rest }) => rest)
  : allResults.slice(0, 50);

return [{
  json: {
    ok: true,
    shopId: targetShop?.id || shopId,
    keywordsChecked: rowsForShop.length,
    ranked: rowsForShop.filter((r) => r.rank != null).length,
    rows: rowsForShop,
  },
}];
