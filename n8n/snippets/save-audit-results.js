// n8n Code — persist audit results + findings to Supabase
const ctx = $input.first().json;
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

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const auditRunId = ctx.auditRunId;
if (!auditRunId) throw new Error('auditRunId missing — audit-init must run first');

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
  summary: {
    ...(ctx.summary || {}),
    presentState: ctx.presentState?.summary || {},
    bestKeywords: (ctx.keywords?.bestKeywords || []).slice(0, 10),
    actionPlan: ctx.actionPlan || [],
    aiGapSummary: ctx.competitors?.aiGapAnalysis?.executive_summary || null,
    entitySignals: ctx.aeo_geo?.entitySignals || {},
    sheetsExport: ctx.sheetsExport || {},
  },
  technical: {
    pagespeed: ctx.technical?.pagespeed,
    robots: ctx.technical?.robots,
    sitemap: { urlCount: ctx.technical?.sitemap?.urlCount, ok: ctx.technical?.sitemap?.ok },
    llms: ctx.technical?.llms,
  },
  keywords: ctx.keywords || {},
  competitors: ctx.competitors || {},
  aeo_geo: {
    aiBotStatus: ctx.aeo_geo?.aiBotStatus,
    llms: ctx.aeo_geo?.llms,
    findingCount: ctx.aeo_geo?.findings?.length || 0,
  },
};

await this.helpers.httpRequest({
  method: 'PATCH',
  url: `${SUPABASE_URL}/rest/v1/audit_runs?id=eq.${auditRunId}`,
  headers,
  body: patchBody,
  json: true,
});

const findings = ctx.aeo_geo?.findings || [];
if (findings.length > 0) {
  const rows = findings.map((f) => ({
    audit_run_id: auditRunId,
    category: f.category,
    dimension: f.dimension,
    severity: f.severity,
    title: f.title,
    description: f.description || null,
    fix_code: f.fix_code,
    remediation: f.remediation,
    metadata: f.metadata || {},
  }));

  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/audit_findings`,
    headers,
    body: rows,
    json: true,
  });
}

if (ctx.websiteId) {
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/websites?id=eq.${ctx.websiteId}`,
    headers,
    body: { status: 'audited' },
    json: true,
  }).catch(() => {});
}

return [
  {
    json: {
      ok: true,
      auditRunId,
      wos: ctx.scores?.wos,
      findingsSaved: findings.length,
      domain: ctx.domain,
      websiteUrl: ctx.websiteUrl,
      criticalCount: ctx.scores?.criticalCount || 0,
    },
  },
];
