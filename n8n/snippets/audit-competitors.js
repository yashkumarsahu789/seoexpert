// n8n Code — Step 3: competitor discovery via SERP + gap heuristics
const ctx = $input.first().json;
const domain = ctx.domain.toLowerCase();

let serpKey = '';
try {
  serpKey = $env.SERP_API_KEY || '';
} catch {
  serpKey = '';
}

const keywordList = (ctx.keywords?.opportunities || [])
  .slice(0, 5)
  .map((k) => k.keyword)
  .filter(Boolean);

function toQueryString(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

if (keywordList.length === 0 && ctx.keywords?.seedQuery) {
  keywordList.push(ctx.keywords.seedQuery);
}

const competitors = [];
const gaps = [];

async function fetchSerp(q) {
  if (!serpKey) return { organic: [] };
  const qs = toQueryString({ engine: 'google', q, gl: 'in', hl: 'en', api_key: serpKey });
  return this.helpers.httpRequest({
    method: 'GET',
    url: `https://serpapi.com/search.json?${qs}`,
    json: true,
    timeout: 25000,
  });
}

for (const keyword of keywordList.slice(0, 5)) {
  let organic = [];
  try {
    const serp = await fetchSerp.call(this, keyword);
    organic = serp.organic_results || [];
  } catch {
    organic = [];
  }

  const topUrls = organic
    .slice(0, 5)
    .map((r, i) => ({
      rank: i + 1,
      url: r.link || r.url,
      title: r.title,
      snippet: r.snippet,
    }))
    .filter((r) => r.url && !r.url.toLowerCase().includes(domain));

  for (const comp of topUrls.slice(0, 3)) {
    try {
      const html = await this.helpers.httpRequest({
        method: 'GET',
        url: comp.url,
        headers: { 'User-Agent': 'LifeSolveNow-AuditBot/1.0' },
        timeout: 15000,
        ignoreHttpStatusErrors: true,
      });
      const body = typeof html === 'string' ? html : '';
      const wordCount = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      const hasFaq = /FAQPage/i.test(body) || body.includes('application/ld+json');
      const hasTable = /<table/i.test(body);
      const h2Count = (body.match(/<h2/gi) || []).length;
      const ourWords = ctx.onpage?.wordCount || 0;

      const weaknesses = [];
      if (wordCount > ourWords + 500) weaknesses.push('content_depth');
      if (hasFaq && !ctx.onpage?.hasFaqSchema) weaknesses.push('faq_schema_gap');
      if (hasTable) weaknesses.push('structured_data_lists');
      if (h2Count > (ctx.onpage?.h2s?.length || 0) + 3) weaknesses.push('heading_structure');

      gaps.push({
        keyword,
        competitorUrl: comp.url,
        competitorRank: comp.rank,
        weaknesses,
        competitorWordCount: wordCount,
        ourWordCount: ourWords,
        remediation:
          weaknesses.includes('content_depth')
            ? 'Add 3-5 authoritative stats and sub-topic sections'
            : weaknesses.includes('faq_schema_gap')
              ? 'Add FAQPage JSON-LD with question-based H2/H3'
              : 'Improve structured lists and direct answers',
      });

      competitors.push({ keyword, ...comp, wordCount, hasFaq, hasTable, h2Count });
    } catch {
      competitors.push({ keyword, ...comp, scrapeFailed: true });
    }
  }
}

return [
  {
    json: {
      ...ctx,
      competitors: {
        serpConfigured: Boolean(serpKey),
        analyzedKeywords: keywordList.slice(0, 5),
        results: competitors.slice(0, 15),
        gaps: gaps.slice(0, 10),
      },
    },
  },
];
