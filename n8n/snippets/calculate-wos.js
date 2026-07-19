// n8n Code — WOS scoring with configurable weights + token budget T = Σ(I+O)
const ctx = $input.first().json;

const alpha = Number(ctx.wosAlpha) || 0.5;
const beta = Number(ctx.wosBeta) || 0.25;
const gamma = Number(ctx.wosGamma) || 0.25;
const weightSum = alpha + beta + gamma;
const na = weightSum > 0 ? alpha / weightSum : 0.5;
const nb = weightSum > 0 ? beta / weightSum : 0.25;
const ng = weightSum > 0 ? gamma / weightSum : 0.25;

const findings = ctx.aeo_geo?.findings || [];

function pillarScore(checks, base = 75) {
  if (!checks?.length) return base;
  const present = checks.filter((c) => c.status === 'present').length;
  const missing = checks.filter((c) => c.status === 'missing').length;
  const update = checks.filter((c) => c.status === 'needs_update').length;
  const remove = checks.filter((c) => c.status === 'needs_remove').length;
  return Math.max(0, Math.min(100, Math.round(base * (present / checks.length) - missing * 8 - update * 4 - remove * 12)));
}

let sSeo = pillarScore(ctx.seoChecks, ctx.technical?.pagespeed?.seo_score ?? 72);
let sAeo = pillarScore(ctx.aeoChecks, 70);
let sGeo = pillarScore(ctx.geoChecks, 68);
if (ctx._entitySignals?.linkedin) sGeo += 3;

const wos = Math.round((na * sSeo + nb * sAeo + ng * sGeo) * 100) / 100;

const pages = ctx.crawl?.sampled || 1;
const markdownTokens = ctx.onpage?.tokenEstimate || 0;
const aiIn = ctx.aiUsage?.tokensIn || ctx.keywords?.ai?.tokensIn || 0;
const aiOut = ctx.aiUsage?.tokensOut || ctx.keywords?.ai?.tokensOut || 0;
const heuristicTokens = pages * 500 + (ctx.keywords?.opportunities?.length || 0) * 200;
const tokenCount = markdownTokens + heuristicTokens + aiIn + aiOut;

const criticalCount =
  (ctx.seoChecks || []).filter((c) => c.status === 'needs_remove' && c.severity === 'critical').length +
  (ctx.geoChecks || []).filter((c) => c.status !== 'present' && c.severity === 'critical').length +
  findings.filter((f) => f.severity === 'critical').length;
const highCount =
  [...(ctx.seoChecks || []), ...(ctx.aeoChecks || []), ...(ctx.geoChecks || [])].filter((c) => c.status !== 'present' && c.severity === 'high').length;

return [
  {
    json: {
      ...ctx,
      scores: {
        wos,
        s_seo: sSeo,
        s_aeo: sAeo,
        s_geo: sGeo,
        alpha: na,
        beta: nb,
        gamma: ng,
        token_count: tokenCount,
        token_breakdown: { markdownTokens, heuristicTokens, aiIn, aiOut },
        criticalCount,
        highCount,
      },
      summary: {
        domain: ctx.domain,
        url: ctx.websiteUrl,
        mode: ctx.mode,
        wos,
        scores: { seo: sSeo, aeo: sAeo, geo: sGeo },
        findingsTotal: findings.length,
        actionPlanItems: ctx.actionPlan?.length || 0,
        criticalCount,
        highCount,
        keywordOpportunities: ctx.keywords?.opportunities?.length || 0,
        competitorGaps: ctx.competitors?.gaps?.length || 0,
        sitemapUrls: ctx.technical?.sitemap?.urlCount || 0,
        pagesSampled: ctx.crawl?.sampled || 0,
        aiConfigured: Boolean(ctx.keywords?.ai?.configured),
        dataforseoConfigured: Boolean(ctx.keywords?.dataforseo?.configured),
        completedAt: new Date().toISOString(),
      },
    },
  },
];
