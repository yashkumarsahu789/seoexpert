// n8n Code — v3 save: audit_runs + requirement checks + ranks + competitors
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
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const auditRunId = ctx.auditRunId;
if (!auditRunId) throw new Error('auditRunId missing');

let websiteId = ctx.websiteId || null;
if (!websiteId && ctx.domain) {
  try {
    const sites = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/websites?select=id,url&limit=50`,
      headers,
      json: true,
    });
    const dom = String(ctx.domain).toLowerCase();
    const match = (sites || []).find((s) => String(s.url || '').toLowerCase().includes(dom));
    if (match?.id) websiteId = match.id;
  } catch {
    /* optional link */
  }
}

const allReqChecks = [
  ...(ctx.seoChecks || []),
  ...(ctx.aeoChecks || []),
  ...(ctx.geoChecks || []),
];

const patchBody = {
  status: 'completed',
  completed_at: new Date().toISOString(),
  wos_score: ctx.scores?.wos,
  s_seo: ctx.scores?.s_seo,
  s_aeo: ctx.scores?.s_aeo,
  s_geo: ctx.scores?.s_geo,
  alpha: ctx.scores?.alpha,
  beta: ctx.scores?.beta,
  gamma: ctx.scores?.gamma,
  token_count: ctx.scores?.token_count,
  report_html: ctx.reportHtml,
  phase_seo: ctx.phase_seo || {},
  phase_aeo: ctx.phase_aeo || {},
  phase_geo: ctx.phase_geo || {},
  phase_keywords: ctx.phase_keywords || {},
  phase_competitors: ctx.phase_competitors || {},
  summary: {
    ...(ctx.summary || {}),
    requirementsCount: ctx.requirementsCount,
    requirementsBySource: {
      official: (ctx.requirements || []).filter((r) => r.source_type === 'official').length,
      patent: (ctx.requirements || []).filter((r) => r.source_type === 'patent').length,
      tracker: (ctx.requirements || []).filter((r) => r.source_type === 'tracker').length,
    },
    actionPlan: ctx.actionPlan || [],
    bestKeywords: ctx.keywords?.bestKeywords || [],
    rankResults: ctx.keywords?.rankResults || [],
    competitorSnapshots: ctx.competitors?.snapshots || [],
  },
  technical: ctx.technical || {},
  keywords: ctx.keywords || {},
  competitors: ctx.competitors || {},
  aeo_geo: ctx.aeo_geo || {},
};

if (websiteId) {
  patchBody.website_id = websiteId;
}

await this.helpers.httpRequest({
  method: 'PATCH',
  url: `${SUPABASE_URL}/rest/v1/audit_runs?id=eq.${auditRunId}`,
  headers,
  body: patchBody,
  json: true,
});

// site_requirement_checks
if (allReqChecks.length) {
  const rows = allReqChecks.map((c) => ({
    audit_run_id: auditRunId,
    website_id: ctx.websiteId || null,
    requirement_id: c.requirement_id || null,
    pillar: c.pillar,
    rule_code: c.rule_code,
    source_type: c.source_type,
    source_name: c.source_name,
    status: c.status,
    title: c.title,
    detail: c.detail,
    remediation: c.remediation,
    severity: c.severity,
    metadata: { check_key: c.check_key, source_url: c.source_url || c.metadata?.source_url },
  }));
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/site_requirement_checks`,
    headers,
    body: rows,
    json: true,
  }).catch(() => {});
}

// keyword rankings
if ((ctx.keywords?.rankResults || []).length) {
  const rankRows = ctx.keywords.rankResults.map((r) => ({
    website_id: websiteId || ctx.websiteId || null,
    keyword: r.keyword,
    rank_position: r.ourRank,
    rank_url: r.ourUrl,
    serp_features: r.serpFeatures || {},
    audit_run_id: auditRunId,
    checked_at: new Date().toISOString(),
  }));
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/keyword_rankings`,
    headers,
    body: rankRows,
    json: true,
  }).catch(() => {});
}

// competitor snapshots (005 columns always; 006 extras optional)
if ((ctx.competitors?.snapshots || []).length) {
  const baseRows = ctx.competitors.snapshots.map((s) => ({
    audit_run_id: auditRunId,
    keyword: s.keyword,
    competitor_url: s.competitor_url,
    competitor_rank: s.competitor_rank,
    our_rank: s.our_rank,
    their_setup: { ...(s.their_setup || {}), _our_setup: s.our_setup, _comparison: s.comparison },
    our_gaps: s.our_gaps || [],
    beat_plan: s.beat_plan,
  }));
  const fullRows = ctx.competitors.snapshots.map((s) => ({
    audit_run_id: auditRunId,
    keyword: s.keyword,
    competitor_url: s.competitor_url,
    competitor_rank: s.competitor_rank,
    our_rank: s.our_rank,
    their_setup: s.their_setup || {},
    our_setup: s.our_setup || {},
    our_gaps: s.our_gaps || [],
    beat_plan: s.beat_plan,
    ai_analysis: s.ai_analysis || {},
    comparison: s.comparison || {},
  }));
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/competitor_snapshots`,
      headers,
      body: fullRows,
      json: true,
    });
  } catch {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/competitor_snapshots`,
      headers,
      body: baseRows,
      json: true,
    }).catch(() => {});
  }
}

// legacy audit_findings from requirement checks + aeo_geo
const findingRows = [
  ...allReqChecks.filter((c) => c.status !== 'present').map((c) => ({
    audit_run_id: auditRunId,
    category: c.pillar,
    dimension: c.check_key,
    severity: c.severity,
    title: c.title,
    description: c.detail,
    fix_code: c.rule_code,
    remediation: c.remediation,
    status: 'open',
    metadata: { source_type: c.source_type, source_name: c.source_name, check_status: c.status },
  })),
  ...(ctx.aeo_geo?.findings || []).map((f) => ({
    audit_run_id: auditRunId,
    category: f.category,
    dimension: f.dimension,
    severity: f.severity,
    title: f.title,
    description: f.title,
    fix_code: f.fix_code,
    remediation: f.remediation,
    status: 'open',
    metadata: f.metadata || {},
  })),
];

if (findingRows.length) {
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/audit_findings`,
    headers,
    body: findingRows.slice(0, 80),
    json: true,
  }).catch(() => {});
}

if (websiteId || ctx.websiteId) {
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/websites?id=eq.${websiteId || ctx.websiteId}`,
    headers,
    body: { status: 'audited' },
    json: true,
  }).catch(() => {});
}

return [{ json: { ...ctx, saved: true, checksSaved: allReqChecks.length } }];
