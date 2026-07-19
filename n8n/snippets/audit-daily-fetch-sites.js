// n8n Code — daily scheduler: fetch all saved websites from Supabase
let SUPABASE_URL = 'https://sbdlfyfkpatnxkrmslvq.supabase.co';
let SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGxmeWZrcGF0bnhrcm1zbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM2NjMsImV4cCI6MjA4OTU2OTY2M30.eLqakT_Yus8i17cDzJWRGdgvQMSDzvuqHnvjb3AeVPE';
try {
  SUPABASE_URL = $env.SUPABASE_URL || SUPABASE_URL;
  SUPABASE_ANON_KEY =
    $env.SUPABASE_ANON_KEY || $env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
} catch {
  /* sandbox */
}

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const sites = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/websites?select=id,url,site_name,status&order=created_at.asc&limit=50`,
  headers,
  json: true,
  timeout: 20000,
});

const list = Array.isArray(sites) ? sites : [];
if (list.length === 0) {
  return [{ json: { dailyRun: true, siteCount: 0, message: 'No websites saved — add a site in the app first' } }];
}

return list.map((site) => ({
  json: {
    dailyRun: true,
    websiteId: site.id,
    websiteUrl: site.url,
    siteName: site.site_name,
    mode: 'rank_only',
    source: 'daily-rank-schedule',
    event: 'Daily Keywords + Rank Check',
    timestamp: new Date().toISOString(),
  },
}));
