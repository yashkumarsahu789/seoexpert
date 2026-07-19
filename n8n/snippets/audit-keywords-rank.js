// @inject-free-audit-utils
// n8n Code — keywords rank via free Google SERP scrape (no SerpAPI key required)
const ctx = $input.first().json;
const domain = ctx.domain;

const seedQuery = ctx.keywords?.seedQuery || `${ctx.onpage?.h1 || domain} ${domain.split('.')[0]}`;
const onPageText = [ctx.onpage?.title, ctx.onpage?.h1, ...(ctx.onpage?.h2s || []), ctx.onpage?.markdownSample?.slice(0, 2000)]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const suggestions = [];
const updateRequired = [];
const rankResults = [];
let rankSource = 'free_serp_scrape';

const kwSet = new Set([
  ...(ctx.keywords?.opportunities || []).map((k) => k.keyword),
  ...(ctx.keywords?.paaQuestions || []),
  ...(ctx.keywords?.suggestions || []),
  seedQuery,
  `${domain.split('.')[0]} reviews`,
  `best ${domain.split('.')[0]}`,
]);

const ac = await freeGoogleSuggest(this, seedQuery);
ac.forEach((s) => kwSet.add(s));

const keywordsToCheck = [...kwSet].filter(Boolean).slice(0, 8);

for (const keyword of keywordsToCheck) {
  const present = onPageText.includes(String(keyword).toLowerCase().slice(0, 15));
  const bucket = {
    keyword,
    presentOnSite: present,
    action: present ? 'update_required' : 'new_opportunity',
    source: 'pipeline',
  };
  if (present) updateRequired.push(bucket);
  else suggestions.push(bucket);

  try {
    const serp = await freeSerpOrPaid(this, keyword, domain);
    rankSource = serp.source || rankSource;
    const organic = serp.organic_results || [];
    const ourRank = serp.ourRank ?? null;
    const ourUrl = serp.ourUrl ?? null;

    rankResults.push({
      keyword,
      ourRank,
      ourUrl,
      topResult: organic[0]?.link || null,
      serpFeatures: {
        source: serp.source || 'unknown',
        blocked: serp.blocked === true,
        googleBlocked: serp.googleBlocked === true,
        resultCount: (serp.organic_results || []).length,
      },
    });
  } catch {
    rankResults.push({
      keyword,
      ourRank: null,
      ourUrl: null,
      serpFeatures: { source: 'error', blocked: true },
    });
  }

  await freeDelay(1500);
}

const bestKeywords = [...suggestions]
  .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
  .slice(0, 15);

return [{
  json: {
    ...ctx,
    keywords: {
      ...(ctx.keywords || {}),
      seedQuery,
      suggestions: suggestions.slice(0, 20),
      updateRequired: updateRequired.slice(0, 15),
      bestKeywords,
      rankResults,
      rankSource,
      serpConfigured: true,
    },
    phase_keywords: {
      suggested: suggestions.length,
      toUpdate: updateRequired.length,
      ranked: rankResults.filter((r) => r.ourRank != null).length,
      notRanked: rankResults.filter((r) => r.ourRank == null).length,
    },
  },
}];
