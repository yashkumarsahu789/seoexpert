// n8n Code Node — build sitemap.xml from Supabase indexing_queue rows
// Input: array of { url } from previous Supabase node

const urls = $input.all().map((item) => item.json.url).filter(Boolean);
const unique = [...new Set(urls)];
const today = new Date().toISOString().slice(0, 10);

const urlEntries = unique
  .map(
    (loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${loc.endsWith('sitemap.xml') ? '0.5' : '0.8'}</priority>
  </url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

return {
  json: {
    filename: 'sitemap.xml',
    content: xml,
    url_count: unique.length,
    ping_url: 'https://www.google.com/ping?sitemap=https://shop.LifeSolveNow.com/sitemap.xml',
  },
  binary: {
    data: {
      data: Buffer.from(xml).toString('base64'),
      mimeType: 'application/xml',
      fileName: 'sitemap.xml',
    },
  },
};
