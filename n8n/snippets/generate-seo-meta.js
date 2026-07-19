// n8n Code Node — rule-based SEO meta (no AI key required)
// Input: shop row from shops_eligible_for_boost

const shop = $json;
const area = shop.area || shop.city;
const types = (shop.product_types || []).join(', ');
const keywords = (shop.primary_keywords || []).slice(0, 5).join(', ');

const title = `${shop.name} — ${types} in ${area}, ${shop.city} | LifeSolveNow`;
const description = `Visit ${shop.name} for ${types} in ${area}, ${shop.city}. ${keywords}. Best local shop on LifeSolveNow.`;

const schema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: shop.name,
  url: shop.shop_url,
  address: {
    '@type': 'PostalAddress',
    addressLocality: shop.city,
    addressRegion: shop.state || shop.city,
    postalCode: shop.pincode || '',
  },
  areaServed: area,
  keywords: shop.primary_keywords || [],
};

return {
  json: {
    shop_id: shop.id,
    meta_title: title.slice(0, 60),
    meta_description: description.slice(0, 160),
    og_title: title.slice(0, 60),
    og_description: description.slice(0, 160),
    json_ld: schema,
    boost_cooldown_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_boost_at: new Date().toISOString(),
    needs_boost: false,
  },
};
