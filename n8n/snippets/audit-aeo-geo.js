// @inject-free-audit-utils
// n8n Code — Step 4: AEO + GEO deep audit + entity consistency hints
const ctx = $input.first().json;
const findings = [];

function add(category, dimension, severity, title, remediation, fixCode, metadata = {}) {
  findings.push({ category, dimension, severity, title, remediation, fix_code: fixCode, metadata });
}

function getEnv(name) {
  try {
    return $env[name] || '';
  } catch {
    return '';
  }
}

const onpage = ctx.onpage || {};
const technical = ctx.technical || {};
const robots = technical.robots || {};
const llms = technical.llms || {};

// AEO
if ((onpage.questionHeadingRatio || 0) < 30 && (onpage.h2s?.length || 0) > 0) {
  add('aeo', 'question_headings', 'high', 'Headings are not question-based enough for AI Overviews', 'Rewrite key H2/H3 titles as direct user questions', 'AEO-001', { ratio: onpage.questionHeadingRatio });
}

const firstParagraph = (onpage.markdownSample || '').slice(0, 400);
const firstParaWords = firstParagraph.split(/\s+/).filter(Boolean).length;
if (firstParaWords > 80 || (firstParaWords > 0 && firstParaWords < 25)) {
  add('aeo', 'direct_answer', 'medium', 'Opening answer block is not 40-60 words', 'Add a concise definition paragraph immediately after the main H1', 'AEO-002', { wordCount: firstParaWords });
}

if (!onpage.hasFaqSchema) {
  add('aeo', 'faq_schema', 'high', 'FAQPage schema missing', 'Add FAQPage JSON-LD aligned with PAA questions', 'AEO-003');
}

if (!onpage.author && !onpage.hasAuthorSchema) {
  add('aeo', 'eeat_author', 'medium', 'Author / E-E-A-T signals missing', 'Add author byline, author page link, and Person schema', 'AEO-004');
}

if (!onpage.publishedDate) {
  add('aeo', 'eeat_date', 'low', 'Publish date not detected', 'Add visible publish/update date + datePublished in schema', 'AEO-005');
}

if ((onpage.outboundLinks || 0) < 2) {
  add('aeo', 'eeat_sources', 'low', 'Few outbound citations to authoritative sources', 'Link to 3-5 authoritative references supporting main claims', 'AEO-006');
}

// SEO basics
if (!onpage.metaDescription) add('seo', 'meta_description', 'high', 'Meta description missing', 'Add unique meta description (150-160 chars)', 'SEO-001');
if ((onpage.h1Count || 0) !== 1) add('seo', 'h1_count', 'medium', `Expected 1 H1, found ${onpage.h1Count || 0}`, 'Ensure exactly one descriptive H1 per page', 'SEO-002');
if (!onpage.hasOrgSchema) add('seo', 'org_schema', 'medium', 'Organization / LocalBusiness schema missing', 'Add Organization JSON-LD with name, url, logo', 'SEO-006');

// JS rendering
if (technical.html?.jsShellSuspected || (ctx.crawl?.jsHeavyPages || 0) > 0) {
  add('technical', 'js_rendering', 'high', 'Site appears JS-heavy (SPA shell detected)', 'Ensure critical content exists in static HTML or add headless crawl; AI crawlers may miss dynamic text', 'TECH-001', { jsHeavyPages: ctx.crawl?.jsHeavyPages || 0 });
}

// GEO
const blockedBots = Object.entries(robots.aiBots || {}).filter(([, v]) => v === 'blocked');
if (blockedBots.length > 0) {
  add('geo', 'ai_bot_blocked', 'critical', `AI crawlers blocked in robots.txt: ${blockedBots.map(([b]) => b).join(', ')}`, 'Allow GPTBot, ClaudeBot, PerplexityBot, Google-Extended in robots.txt', 'GEO-001', { blocked: blockedBots.map(([b]) => b) });
}

if (!llms.llms_txt) {
  add('geo', 'llms_txt', 'medium', 'llms.txt not found at site root', 'Publish UTF-8 llms.txt and llms-full.txt with brand summary and key URLs', 'GEO-002');
} else if (!llms.llms_txt_valid) {
  add('geo', 'llms_txt', 'low', 'llms.txt present but may be invalid', 'Include markdown headings and key URLs in llms.txt', 'GEO-002b');
}

if (!technical.sitemap?.ok || (technical.sitemap?.urlCount || 0) === 0) {
  add('geo', 'sitemap', 'critical', 'sitemap.xml missing or empty', 'Generate and submit sitemap.xml; reference in robots.txt', 'GEO-003');
}

if (!technical.robots?.found) add('seo', 'robots_txt', 'high', 'robots.txt not found', 'Add robots.txt with sitemap reference and AI bot rules', 'SEO-003');

if (technical.pagespeed?.performance_score != null && technical.pagespeed.performance_score < 50) {
  add('seo', 'core_web_vitals', 'high', `Mobile performance score low (${technical.pagespeed.performance_score})`, 'Optimize LCP, reduce TBT, fix render-blocking resources', 'SEO-004', { score: technical.pagespeed.performance_score });
}

if ((ctx.crawl?.thinPages?.length || 0) > 0) {
  add('seo', 'thin_content', 'medium', `${ctx.crawl.thinPages.length} sampled pages have thin content (<300 words)`, 'Expand thin pages with topic clusters and direct answers', 'SEO-005', { urls: ctx.crawl.thinPages.slice(0, 5) });
}

// Entity consistency via free Google SERP scrape
let entitySignals = { linkedin: false, crunchbase: false, wikipedia: false, configured: false, source: 'free_serp' };
const brandName = ctx.domain.split('.')[0];

if (brandName.length > 2) {
  try {
    const serp = await freeSerpOrPaid(this, `${brandName} company`, ctx.domain);
    entitySignals.configured = serp.ok;
    entitySignals.source = serp.source || 'free_serp';
    const organic = serp.organic_results || [];
    const blob = JSON.stringify(organic).toLowerCase();
    entitySignals.linkedin = blob.includes('linkedin.com');
    entitySignals.crunchbase = blob.includes('crunchbase.com');
    entitySignals.wikipedia = blob.includes('wikipedia.org');

    if (!entitySignals.linkedin && !entitySignals.crunchbase) {
      add('geo', 'entity_consistency', 'medium', 'Brand weak on LinkedIn / Crunchbase in SERP', 'Align Google Business Profile, LinkedIn Company, and Crunchbase with same name, description, URL', 'GEO-004', entitySignals);
    }
  } catch {
    entitySignals.configured = false;
  }
}

const aeoScore = Math.max(0, 100 - findings.filter((f) => f.category === 'aeo' && f.severity === 'critical').length * 25 - findings.filter((f) => f.category === 'aeo' && f.severity === 'high').length * 15 - findings.filter((f) => f.category === 'aeo' && f.severity === 'medium').length * 8);
const geoScore = Math.max(0, 100 - findings.filter((f) => f.category === 'geo' && f.severity === 'critical').length * 30 - findings.filter((f) => f.category === 'geo' && f.severity === 'high').length * 15 - findings.filter((f) => f.category === 'geo' && f.severity === 'medium').length * 10);

return [{ json: { ...ctx, aeo_geo: { findings, aeoScorePreview: aeoScore, geoScorePreview: geoScore, llms, aiBotStatus: robots.aiBots || {}, entitySignals } } }];
