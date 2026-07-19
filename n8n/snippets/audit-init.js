// n8n Code — create audit_run row in Supabase (status: running)
const input = $input.first().json;
let SUPABASE_URL = 'https://sbdlfyfkpatnxkrmslvq.supabase.co';
let SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGxmeWZrcGF0bnhrcm1zbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM2NjMsImV4cCI6MjA4OTU2OTY2M30.eLqakT_Yus8i17cDzJWRGdgvQMSDzvuqHnvjb3AeVPE';
try {
  SUPABASE_URL = $env.SUPABASE_URL || SUPABASE_URL;
  SUPABASE_ANON_KEY =
    $env.SUPABASE_ANON_KEY || $env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
} catch {
  /* n8n sandbox without $env */
}

const row = {
  website_id: input.websiteId || null,
  website_url: input.websiteUrl,
  domain: input.domain,
  status: 'running',
  mode: input.mode || 'full',
  summary: { event: input.event, source: input.source },
};

const response = await this.helpers.httpRequest({
  method: 'POST',
  url: `${SUPABASE_URL}/rest/v1/audit_runs`,
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: row,
  json: true,
});

const auditRun = Array.isArray(response) ? response[0] : response;

if (input.websiteId) {
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/websites?id=eq.${input.websiteId}`,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: { status: 'auditing' },
    json: true,
  }).catch(() => {});
}

return [
  {
    json: {
      ...input,
      auditRunId: auditRun.id,
      auditStartedAt: auditRun.started_at,
    },
  },
];
