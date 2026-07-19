// n8n Code — daily sync: official + patent + tracker sources → Supabase audit_requirements
const BASELINE = ${BASELINE_JSON};

function getEnv(name) {
  try { return $env[name] || ''; } catch { return ''; }
}

let SUPABASE_URL = 'https://sbdlfyfkpatnxkrmslvq.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGxmeWZrcGF0bnhrcm1zbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM2NjMsImV4cCI6MjA4OTU2OTY2M30.eLqakT_Yus8i17cDzJWRGdgvQMSDzvuqHnvjb3AeVPE';
try {
  SUPABASE_URL = getEnv('SUPABASE_URL') || SUPABASE_URL;
  SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || SUPABASE_ANON_KEY;
} catch { /* */ }

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

async function fetchRss(url) {
  try {
    const xml = await this.helpers.httpRequest({ method: 'GET', url, timeout: 20000 });
    const titles = [...String(xml).matchAll(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi)]
      .map((m) => m[1].trim())
      .filter((t) => t && !t.includes('RSS') && t.length > 10);
    return titles.slice(0, 8);
  } catch {
    return [];
  }
}

const FEEDS = [
  { source_type: 'official', source_name: 'Google Search Central Blog', source_url: 'https://developers.google.com/search/blog/rss', pillar: 'seo' },
  { source_type: 'tracker', source_name: 'Search Engine Journal', source_url: 'https://www.searchenginejournal.com/feed/', pillar: 'seo' },
  { source_type: 'tracker', source_name: 'Schema.org releases', source_url: 'https://schema.org/docs/releases.html', pillar: 'seo' },
];

const dynamicRules = [];
const syncLogs = [];

for (const feed of FEEDS) {
  const titles = await fetchRss.call(this, feed.source_url);
  syncLogs.push({ source_type: feed.source_type, source_name: feed.source_name, items_fetched: titles.length });
  titles.forEach((title, i) => {
    dynamicRules.push({
      pillar: feed.pillar,
      source_type: feed.source_type,
      source_name: feed.source_name,
      source_url: feed.source_url,
      rule_code: `LIVE-${feed.source_type.toUpperCase().slice(0, 3)}-${Date.now().toString(36).slice(-4)}-${i}`,
      title: title.slice(0, 120),
      description: `Live feed update from ${feed.source_name} — review for new requirement`,
      check_key: 'manual_review',
      severity: 'low',
      action_if_missing: 'add',
      action_if_present_weak: 'update',
      action_if_harmful: 'remove',
      metadata: { feed: true, fetched_at: new Date().toISOString() },
      active: true,
      last_synced_at: new Date().toISOString(),
    });
  });
}

const allRules = [...BASELINE.map((r) => ({
  ...r,
  action_if_missing: r.action_if_missing || 'add',
  action_if_present_weak: r.action_if_present_weak || 'update',
  action_if_harmful: r.action_if_harmful || 'remove',
  active: true,
  last_synced_at: new Date().toISOString(),
})), ...dynamicRules.slice(0, 15)];

let upserted = 0;
for (const batch of [allRules.slice(0, 25), allRules.slice(25, 50), allRules.slice(50)]) {
  if (!batch.length) continue;
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/audit_requirements?on_conflict=pillar,rule_code`,
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: batch,
    json: true,
  });
  upserted += batch.length;
}

for (const log of syncLogs) {
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/requirement_sync_log`,
    headers,
    body: { ...log, items_upserted: upserted, status: 'ok', synced_at: new Date().toISOString() },
    json: true,
  }).catch(() => {});
}

return [{ json: { ok: true, baseline: BASELINE.length, dynamic: dynamicRules.length, upserted, syncLogs } }];
