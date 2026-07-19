// @inject-free-audit-utils
// n8n Code — raw competitor data: SERP + page scrape + metrics + domain age (no AI)
const ctx = $input.first().json;
const domain = ctx.domain.toLowerCase();
const ourPageUrl = ctx.websiteUrl || ctx.website_url || `https://${domain}`;

const keywords = (ctx.keywords?.rankResults || [])
  .slice(0, 3)
  .map((r) => r.keyword)
  .filter(Boolean);

if (!keywords.length && ctx.keywords?.seedQuery) keywords.push(ctx.keywords.seedQuery);
if (!keywords.length && ctx.keywords?.bestKeywords?.[0]) keywords.push(ctx.keywords.bestKeywords[0].keyword);

const snapshots = [];
const gaps = [];
const serpErrors = [];
let compSource = 'free_serp_scrape';

const serpApiConfigured = Boolean(freeEnv('SERPER_API_KEY') || freeEnv('SERP_API_KEY'));

for (const keyword of keywords.slice(0, 3)) {
  let organic = [];
  let ourRank = null;
  let ourUrl = ourPageUrl;

  let serp = { ok: false, source: 'unknown', organic_results: [], blocked: true };
  try {
    serp = await freeSerpOrPaid(this, keyword, domain);
    compSource = serp.source || compSource;
    organic = serp.organic_results || [];
    ourRank = serp.ourRank ?? null;
    if (serp.ourUrl) ourUrl = serp.ourUrl;
  } catch (err) {
    serpErrors.push({ keyword, source: 'error', message: err.message });
    organic = [];
  }

  if (!organic.length) {
    serpErrors.push({
      keyword,
      source: serp.source || 'all_engines_failed',
      blocked: serp.blocked !== false,
      googleBlocked: serp.googleBlocked === true,
    });
    await freeDelay(1000);
    continue;
  }

  const rankInfo = (ctx.keywords?.rankResults || []).find((r) => r.keyword === keyword);
  if (ourRank == null) ourRank = rankInfo?.ourRank ?? null;

  const topComp = organic.find((c) => {
    const url = (c.url || c.link || '').toLowerCase();
    return url && !freeMatchDomain(url, domain);
  });

  if (!topComp) {
    serpErrors.push({ keyword, source: serp.source, message: 'no_external_competitor_in_results' });
    await freeDelay(1000);
    continue;
  }

  const compUrl = topComp.url || topComp.link;
  let ourSetup = { scrapeFailed: true, url: ourUrl };
  let theirSetup = { scrapeFailed: true, url: compUrl };
  let ourGaps = [];

  try {
    const [ourRes, compRes] = await Promise.all([
      freeHttp(this, ourUrl),
      freeHttp(this, compUrl),
    ]);

    const ourHtml = ourRes.ok && typeof ourRes.data === 'string' ? ourRes.data : '';
    const compHtml = compRes.ok && typeof compRes.data === 'string' ? compRes.data : '';

    const ourContent = freeExtractPageContent(ourHtml);
    const compContent = freeExtractPageContent(compHtml);

    const ourKw = freeKeywordMetrics(ourContent.cleanText, keyword, ourContent.pageTitle, ourContent.h1);
    const compKw = freeKeywordMetrics(compContent.cleanText, keyword, compContent.pageTitle, compContent.h1);

    const [ourAge, compAge] = await Promise.all([
      freeDomainAge(this, domain),
      freeDomainAge(this, freeDomainFromUrl(compUrl)),
    ]);

    ourSetup = {
      url: ourUrl,
      pageTitle: ourContent.pageTitle,
      wordCount: ourContent.wordCount,
      h2Count: ourContent.h2Count,
      h3Count: ourContent.h3Count,
      hasFaq: ourContent.hasFaq,
      hasTable: ourContent.hasTable,
      hasSchema: ourContent.hasSchema,
      hasVideo: ourContent.hasVideo,
      keywordMetrics: ourKw,
      domainAge: ourAge,
      headings: { h1: ourContent.h1.slice(0, 5), h2: ourContent.h2.slice(0, 8), h3: ourContent.h3.slice(0, 6) },
      altTexts: ourContent.altTexts.slice(0, 12),
      altCount: ourContent.altTexts.length,
      fetchMs: ourRes.ms,
    };

    theirSetup = {
      url: compUrl,
      pageTitle: compContent.pageTitle,
      wordCount: compContent.wordCount,
      h2Count: compContent.h2Count,
      h3Count: compContent.h3Count,
      hasFaq: compContent.hasFaq,
      hasTable: compContent.hasTable,
      hasSchema: compContent.hasSchema,
      hasVideo: compContent.hasVideo,
      keywordMetrics: compKw,
      domainAge: compAge,
      headings: { h1: compContent.h1.slice(0, 5), h2: compContent.h2.slice(0, 8), h3: compContent.h3.slice(0, 6) },
      altTexts: compContent.altTexts.slice(0, 12),
      altCount: compContent.altTexts.length,
      fetchMs: compRes.ms,
    };

    if (compContent.wordCount > ourContent.wordCount + 400) {
      ourGaps.push({ metric: 'word_count', ours: ourContent.wordCount, theirs: compContent.wordCount });
    }
    if (compContent.h2Count > ourContent.h2Count + 1) {
      ourGaps.push({ metric: 'h2_count', ours: ourContent.h2Count, theirs: compContent.h2Count });
    }
    if (compContent.hasFaq && !ourContent.hasFaq) ourGaps.push({ metric: 'faq_schema', ours: false, theirs: true });
    if (compContent.hasTable && !ourContent.hasTable) ourGaps.push({ metric: 'table', ours: false, theirs: true });
    if (compContent.hasSchema && !ourContent.hasSchema) ourGaps.push({ metric: 'schema', ours: false, theirs: true });
    if (compContent.hasVideo && !ourContent.hasVideo) ourGaps.push({ metric: 'video', ours: false, theirs: true });
    if (compKw.inTitle && !ourKw.inTitle) ourGaps.push({ metric: 'keyword_in_title', ours: false, theirs: true });
    if (compKw.inH1 && !ourKw.inH1) ourGaps.push({ metric: 'keyword_in_h1', ours: false, theirs: true });
    if ((compKw.density || 0) > (ourKw.density || 0) + 0.3) {
      ourGaps.push({ metric: 'keyword_density', ours: ourKw.density, theirs: compKw.density });
    }

    const comparison = {
      keyword,
      ourRank,
      competitorRank: topComp.rank,
      ourUrl,
      competitorUrl: compUrl,
      ourWordCount: ourContent.wordCount,
      compWordCount: compContent.wordCount,
      ourH2: ourContent.h2Count,
      compH2: compContent.h2Count,
      ourH3: ourContent.h3Count,
      compH3: compContent.h3Count,
      ourKwDensity: ourKw.density,
      compKwDensity: compKw.density,
      ourDomainAge: ourAge.ageLabel || 'Unknown',
      compDomainAge: compAge.ageLabel || 'Unknown',
      ourKwInTitle: ourKw.inTitle,
      compKwInTitle: compKw.inTitle,
      ourKwInH1: ourKw.inH1,
      compKwInH1: compKw.inH1,
      ourHasFaq: ourContent.hasFaq,
      compHasFaq: compContent.hasFaq,
      ourHasTable: ourContent.hasTable,
      compHasTable: compContent.hasTable,
      ourHasSchema: ourContent.hasSchema,
      compHasSchema: compContent.hasSchema,
      ourHasVideo: ourContent.hasVideo,
      compHasVideo: compContent.hasVideo,
      ourAltCount: ourContent.altTexts.length,
      compAltCount: compContent.altTexts.length,
    };

    snapshots.push({
      keyword,
      competitor_url: compUrl,
      competitor_rank: topComp.rank,
      our_rank: ourRank,
      our_setup: ourSetup,
      their_setup: theirSetup,
      our_gaps: ourGaps,
      comparison,
      beat_plan: null,
    });

    gaps.push({
      keyword,
      competitorUrl: compUrl,
      competitorRank: topComp.rank,
      metricGaps: ourGaps,
      priority: ourRank == null || ourRank > topComp.rank ? 'high' : 'medium',
    });
  } catch {
    snapshots.push({
      keyword,
      competitor_url: compUrl,
      competitor_rank: topComp.rank,
      our_rank: ourRank,
      our_setup: ourSetup,
      their_setup: theirSetup,
      our_gaps: [{ metric: 'scrape_failed' }],
    });
  }

  await freeDelay(1200);
}

return [{
  json: {
    ...ctx,
    competitors: {
      serpConfigured: serpApiConfigured,
      compSource,
      serpErrors,
      engine: serpApiConfigured ? 'serp_api' : 'raw_scrape_only',
      analyzedKeywords: keywords.slice(0, 3),
      snapshots,
      gaps,
    },
    phase_competitors: {
      keywordsAnalyzed: keywords.length,
      competitorsScraped: snapshots.length,
      metricGaps: gaps.reduce((n, g) => n + (g.metricGaps?.length || 0), 0),
      domainAgeChecked: snapshots.filter((s) => s.their_setup?.domainAge?.ok).length,
      compSource,
      serpErrors,
      serpApiConfigured,
    },
  },
}];
