// n8n Code Node — Google Merchant product feed (RSS 2.0 + g: namespace)
// Input: shop_products joined with shops

const items = $input.all().map((i) => i.json);
const CDN = 'https://cd.LifeSolveNow.com';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const channelItems = items
  .map((p) => {
    const image = p.image_cdn_url || p.image_url || `${CDN}/${p.slug || 'default'}/${p.id}.jpg`;
    const title = `${p.name} — ${p.area || p.city} | ${p.shop_name}`;
    const desc = p.description || `${p.name} available at ${p.shop_name}, ${p.area || ''} ${p.city}`;
    return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(desc)}</g:description>
      <g:link>${escapeXml(p.shop_url || `https://shop.LifeSolveNow.com/${p.slug}`)}</g:link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${p.price || 0} INR</g:price>
      <g:brand>${escapeXml(p.shop_name)}</g:brand>
      <g:product_type>${escapeXml(p.category || 'General')}</g:product_type>
    </item>`;
  })
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>LifeSolveNow Merchant Feed</title>
    <link>https://shop.LifeSolveNow.com</link>
    <description>Local shop products — India</description>
${channelItems}
  </channel>
</rss>`;

return {
  json: {
    filename: 'merchant-feed.xml',
    product_count: items.length,
    content: xml,
  },
};
