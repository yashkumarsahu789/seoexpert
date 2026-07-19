// n8n Code — crawl sample pages (quick=10, full=50; sitemap catalog up to 1000)
const ctx = $input.first().json;
const maxPages = ctx.mode === 'quick' ? 10 : 50;
const catalog = ctx.technical?.sitemap?.allUrls || ctx.technical?.sitemap?.urls || [];
const seedUrls = catalog.length ? catalog : [ctx.websiteUrl];

const urls = [...new Set([ctx.websiteUrl, ...seedUrls])].slice(0, maxPages);
const pages = [];
let jsHeavyPages = 0;

for (const url of urls) {
  try {
    const html = await this.helpers.httpRequest({
      method: 'GET',
      url,
      headers: { 'User-Agent': 'LifeSolveNow-AuditBot/1.0' },
      timeout: 15000,
      ignoreHttpStatusErrors: true,
    });
    const body = typeof html === 'string' ? html : '';
    const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || null;
    const h1 = (body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || null;
    const words = body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    const jsHeavy = body.length > 800 && words < 120;
    if (jsHeavy) jsHeavyPages += 1;
    pages.push({ url, status: 200, title, h1, wordCount: words, ok: body.length > 100, jsHeavy });
  } catch (err) {
    pages.push({ url, status: 0, ok: false, error: err.message });
  }
}

const thinPages = pages.filter((p) => p.ok && p.wordCount < 300);
const missingTitle = pages.filter((p) => p.ok && !p.title);

return [
  {
    json: {
      ...ctx,
      crawl: {
        catalogTotal: catalog.length,
        sampled: pages.length,
        maxPages,
        pages,
        thinPages: thinPages.map((p) => p.url),
        missingTitle: missingTitle.map((p) => p.url),
        jsHeavyPages,
      },
    },
  },
];
