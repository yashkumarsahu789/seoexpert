// @inject-free-audit-utils
// n8n Code — daily rank-only check for one saved site (no full audit)
const site = $input.first().json;

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
try {
  SUPABASE_URL = $env.SUPABASE_URL || '';
  SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY || '';
} catch {
  /* sandbox */
}

if (!site.websiteUrl || !SUPABASE_URL || !SUPABASE_KEY) {
  return [{ json: { ...site, rankDaily: false, error: 'missing url or supabase env' } }];
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return String(url).replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  }
}

const domain = domainFromUrl(site.websiteUrl);
const websiteId = site.websiteId;

let keywords = [];
try {
  const prev = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/keyword_rankings?website_id=eq.${websiteId}&select=keyword&order=checked_at.desc&limit=20`,
    headers,
    json: true,
    timeout: 20000,
  });
  keywords = [...new Set((prev || []).map((r) => r.keyword).filter(Boolean))].slice(0, 8);
} catch {
  keywords = [];
}

if (!keywords.length) {
  const seed = domain.split('.')[0];
  const ac = await freeGoogleSuggest(this, seed);
  keywords = [seed, ...ac.slice(0, 6)].filter(Boolean).slice(0, 8);
}

const rankResults = [];
for (const keyword of keywords) {
  try {
    const serp = await freeSerpOrPaid(this, keyword, domain);
    rankResults.push({
      keyword,
      ourRank: serp.ourRank ?? null,
      ourUrl: serp.ourUrl ?? null,
      rankSource: serp.source || 'free_serp_scrape',
    });
  } catch {
    rankResults.push({ keyword, ourRank: null, ourUrl: null });
  }
  await freeDelay(900);
}

let auditRunId = null;
try {
  const runRes = await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/audit_runs`,
    headers,
    body: {
      website_id: websiteId,
      website_url: site.websiteUrl,
      domain,
      status: 'completed',
      mode: 'rank_only',
      summary: { rankResults, event: 'Daily Keywords Rank Check', source: 'rank-daily' },
      phase_keywords: {
        ranked: rankResults.filter((r) => r.ourRank != null).length,
        notRanked: rankResults.filter((r) => r.ourRank == null).length,
      },
      completed_at: new Date().toISOString(),
    },
    json: true,
    timeout: 20000,
  });
  auditRunId = (Array.isArray(runRes) ? runRes[0] : runRes)?.id || null;
} catch {
  auditRunId = null;
}

if (auditRunId && rankResults.length) {
  const rows = rankResults.map((r) => ({
    audit_run_id: auditRunId,
    website_id: websiteId,
    keyword: r.keyword,
    rank_position: r.ourRank,
    rank_url: r.ourUrl,
    checked_at: new Date().toISOString(),
    serp_features: { source: r.rankSource, daily: true },
  }));
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/keyword_rankings`,
    headers,
    body: rows,
    json: true,
  }).catch(() => {});
}

await this.helpers.httpRequest({
  method: 'PATCH',
  url: `${SUPABASE_URL}/rest/v1/websites?id=eq.${websiteId}`,
  headers,
  body: { status: 'active', last_rank_check_at: new Date().toISOString() },
  json: true,
}).catch(() => {});

await freeDelay(2000);

return [{
  json: {
    ...site,
    rankDaily: true,
    domain,
    auditRunId,
    keywordsChecked: rankResults.length,
    ranked: rankResults.filter((r) => r.ourRank != null).length,
    rankResults,
  },
}];
