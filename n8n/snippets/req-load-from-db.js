// n8n Code — load latest audit_requirements from Supabase (all pillars)
const ctx = $input.first().json;

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
};

let requirements = [];
try {
  requirements = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/audit_requirements?active=eq.true&select=*&order=pillar.asc,severity.asc`,
    headers,
    json: true,
    timeout: 20000,
  });
} catch (err) {
  requirements = [];
}

const byPillar = {
  seo: requirements.filter((r) => r.pillar === 'seo'),
  aeo: requirements.filter((r) => r.pillar === 'aeo'),
  geo: requirements.filter((r) => r.pillar === 'geo'),
};

const bySource = {
  official: requirements.filter((r) => r.source_type === 'official'),
  patent: requirements.filter((r) => r.source_type === 'patent'),
  tracker: requirements.filter((r) => r.source_type === 'tracker'),
};

return [{
  json: {
    ...ctx,
    requirements,
    requirementsByPillar: byPillar,
    requirementsBySource: bySource,
    requirementsLoadedAt: new Date().toISOString(),
    requirementsCount: requirements.length,
  },
}];
