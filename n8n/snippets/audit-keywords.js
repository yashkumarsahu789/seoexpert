// @inject-free-audit-utils
// n8n Code — keywords: Google Autocomplete (free) + optional SerpAPI fallback
const ctx = $input.first().json;
const domain = ctx.domain;

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

const seeds = new Set();
[tokenize(ctx.onpage?.title), tokenize(ctx.onpage?.h1), ...(ctx.onpage?.h2s || []).flatMap(tokenize)]
  .slice(0, 30)
  .forEach((w) => seeds.add(w));

const titleWords = (ctx.onpage?.title || ctx.domain).split(/\s+/).slice(0, 5).join(' ');
const seedQuery = `${titleWords} ${domain.split('.')[0]}`.trim();

const paaQuestions = [];
const suggestions = [];
const serpErrors = [];
let dataSource = 'google_autocomplete_free';

const freeSuggest = await freeGoogleSuggest(this, seedQuery);
freeSuggest.forEach((s) => suggestions.push(s));

for (const s of freeSuggest.slice(0, 3)) {
  const extra = await freeGoogleSuggest(this, s);
  extra.slice(0, 4).forEach((k) => suggestions.push(k));
}

try {
  const serp = await freeSerpOrPaid(this, seedQuery, domain);
  if (serp.ok) {
    dataSource = serp.source;
    (serp.related_questions || []).forEach((q) => {
      if (q.question) paaQuestions.push(q.question);
    });
  } else if (serp.blocked) {
    serpErrors.push('google_serp: rate limit / captcha — retry later');
  }
} catch (err) {
  serpErrors.push(`serp: ${err.message}`);
}

const onPageText = [
  ctx.onpage?.title,
  ctx.onpage?.h1,
  ...(ctx.onpage?.h2s || []),
  ctx.onpage?.markdownSample?.slice(0, 2000),
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const opportunities = [];
const updateRequired = [];

for (const q of [...new Set(paaQuestions)].slice(0, 15)) {
  const qLower = q.toLowerCase();
  const present = onPageText.includes(qLower.slice(0, 20));
  const bucket = {
    keyword: q,
    type: 'question',
    source: 'paa_free',
    presentOnSite: present,
    action: present ? 'update_required' : 'new_opportunity',
  };
  if (present) updateRequired.push(bucket);
  else opportunities.push(bucket);
}

for (const s of [...new Set(suggestions)].slice(0, 15)) {
  const present = onPageText.includes(s.toLowerCase().slice(0, 15));
  const bucket = {
    keyword: s,
    type: 'suggestion',
    source: 'autocomplete_free',
    presentOnSite: present,
    action: present ? 'update_required' : 'new_opportunity',
  };
  if (present) updateRequired.push(bucket);
  else opportunities.push(bucket);
}

if (!opportunities.length && !updateRequired.length) {
  [`${domain} reviews`, `what is ${ctx.onpage?.h1 || domain}`, `best ${domain.split('.')[0]}`].forEach((k) => {
    opportunities.push({ keyword: k, type: 'heuristic', source: 'fallback', presentOnSite: false, action: 'new_opportunity' });
  });
}

return [
  {
    json: {
      ...ctx,
      keywords: {
        seedQuery,
        dataSource,
        serpConfigured: true,
        serpErrors,
        paaQuestions: [...new Set(paaQuestions)].slice(0, 20),
        suggestions: [...new Set(suggestions)].slice(0, 20),
        opportunities: opportunities.slice(0, 20),
        updateRequired: updateRequired.slice(0, 10),
      },
    },
  },
];
