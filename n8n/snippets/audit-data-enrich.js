// @inject-free-audit-utils
// n8n Code — keyword enrich: Google Autocomplete only (raw data, no AI)
const ctx = $input.first().json;

const enriched = [];
const enrichSource = 'google_autocomplete_free';
const enrichErrors = [];

const seed = ctx.keywords?.seedQuery || ctx.domain;
const freeKw = await freeKeywordExpand(this, seed, 12);
for (const item of freeKw) {
  enriched.push(item);
}

ctx.keywords = ctx.keywords || {};
ctx.keywords.updateRequired = ctx.keywords.updateRequired || [];
ctx.keywords.opportunities = ctx.keywords.opportunities || [];

for (const item of freeKw) {
  const present =
    (ctx.onpage?.markdownSample || '').toLowerCase().includes(String(item.keyword).toLowerCase().slice(0, 12));
  const bucket = {
    keyword: item.keyword,
    type: 'autocomplete',
    source: 'google_autocomplete_free',
    searchVolume: item.search_volume,
    presentOnSite: present,
    action: present ? 'update_required' : 'new_opportunity',
  };
  const exists = ctx.keywords.opportunities.some((o) => o.keyword === item.keyword) ||
    ctx.keywords.updateRequired.some((o) => o.keyword === item.keyword);
  if (!exists) {
    if (present) ctx.keywords.updateRequired.push(bucket);
    else ctx.keywords.opportunities.push(bucket);
  }
}

const volumeMap = {};
for (const e of enriched) {
  if (e.keyword) volumeMap[String(e.keyword).toLowerCase()] = e.search_volume ?? 0;
}

function attachVolume(kw) {
  const vol = volumeMap[String(kw.keyword || kw).toLowerCase()] ?? kw.searchVolume ?? null;
  return { ...kw, searchVolume: vol };
}

const allKw = [
  ...(ctx.keywords?.opportunities || []).map(attachVolume),
  ...(ctx.keywords?.updateRequired || []).map(attachVolume),
];
const bestKeywords = [...allKw]
  .filter((k) => k.action !== 'update_required')
  .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
  .slice(0, 15);
const keywordsToUpdate = [...(ctx.keywords?.updateRequired || [])]
  .map(attachVolume)
  .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0));

return [
  {
    json: {
      ...ctx,
      keywords: {
        ...(ctx.keywords || {}),
        opportunities: (ctx.keywords?.opportunities || []).map(attachVolume).slice(0, 30),
        updateRequired: keywordsToUpdate.slice(0, 15),
        bestKeywords,
        enrichSource,
        dataforseo: { configured: false, enriched, note: 'Google Autocomplete (free, raw)' },
        ai: { configured: false },
        enrichErrors,
      },
    },
  },
];
