/** Webflow coupon-site automation — template duplicate + CMS inject via n8n */

export const WEBFLOW_ARCHITECTURE = [
  {
    step: '1',
    title: 'Master template',
    detail:
      'Webflow dashboard me ek perfect coupon landing page banao (e.g. gummysearchpromocodes). Yeh "Master Template" duplicate hone ke liye base rahega.',
  },
  {
    step: '2',
    title: 'AI content JSON',
    detail:
      'n8n AI node user requirement se brand name, subdomain slug, SEO title/description, coupon code aur affiliate URL nikal kar strict JSON return karega.',
  },
  {
    step: '3',
    title: 'Site duplicate',
    detail:
      'Webflow Admin API master template ko duplicate karega — naya project `your-brand.webflow.io` subdomain ke saath spawn hoga.',
  },
  {
    step: '4',
    title: 'Content inject + publish',
    detail:
      'Naye site ke CMS/pages me contentData fields push karo, phir auto-publish. Standard API mainly CMS ke liye hai — isliye duplication strategy use hoti hai.',
  },
]

export const WEBFLOW_N8N_STEPS = [
  { node: 'Webhook / Manual', role: 'User requirement input (brand + offer)' },
  { node: 'OpenAI / AI', role: 'System prompt → raw JSON payload only' },
  { node: 'Code', role: 'JSON parse + validate siteConfiguration + contentData' },
  { node: 'HTTP Request', role: 'Webflow — duplicate master template site' },
  { node: 'HTTP Request', role: 'Webflow — update CMS / page elements' },
  { node: 'HTTP Request', role: 'Webflow — publish site' },
  { node: 'Supabase Insert', role: 'Optional — log spawned site slug + status' },
]

export const WEBFLOW_ENV_VARS = [
  { key: 'WEBFLOW_API_TOKEN', required: true, note: 'Webflow → Site Settings → API access (n8n Render env)' },
  { key: 'WEBFLOW_MASTER_SITE_ID', required: true, note: 'Master coupon template site ID' },
  { key: 'WEBFLOW_COUPON_COLLECTION_ID', required: true, note: 'CMS collection ID jisme coupon fields hain' },
  { key: 'WEBFLOW_SITE_POOL', required: false, note: 'Optional comma-separated site IDs (pre-duplicated templates)' },
  { key: 'WEBFLOW_WORKSPACE_ID', required: false, note: 'Enterprise only — naya site create API' },
  { key: 'VITE_N8N_WEBFLOW_WEBHOOK_URL', required: true, note: 'React UI → n8n webhook' },
]

export const WEBFLOW_JSON_SCHEMA = {
  siteConfiguration: {
    newSiteName: 'CopyWriter Coupons',
    subdomainSlug: 'copywriter-promos',
    seoTitle: 'CopyWriter Coupon Code — 40% Off',
    seoDescription: 'Get the latest CopyWriter discount. Verified promo code and affiliate deal updated daily.',
  },
  contentData: {
    h1Heading: 'Save 40% on CopyWriter Today',
    subheading: 'Exclusive AI writing tool deal — limited-time coupon for new users.',
    couponCode: 'COPY40',
    discountDisplay: '40% OFF',
    affiliateUrl: 'https://example.com/affiliate/copywriter',
  },
}

export const WEBFLOW_SYSTEM_PROMPT = `You are a Core Automation Engine for Webflow Site Generation. Your job is to take raw user requirements, extract the brand essence, and output a strict JSON payload that an n8n HTTP Request node can directly pass to the Webflow Admin APIs for site duplication and customization.

[CONTEXT]
The goal is to spawn a brand new Webflow site with its own sub-domain (e.g., target-brand.webflow.io) based on a master coupon template.

[USER REQUIREMENT]
{requirement}

[TASK]
Analyze the requirement and output ONLY a raw JSON object. Do not include markdown formatting, backticks, or any conversational filler. The structure must map perfectly to variables needed for Webflow site configuration and content injection:

{
  "siteConfiguration": {
    "newSiteName": "[Clean Brand Name without spaces, e.g., CopyWriter Coupons]",
    "subdomainSlug": "[url-friendly-slug-for-domain, e.g., copywriter-promos]",
    "seoTitle": "[SEO optimized title, max 60 chars]",
    "seoDescription": "[SEO optimized description, max 160 chars]"
  },
  "contentData": {
    "h1Heading": "[Catchy headline tailored to the brand]",
    "subheading": "[Value proposition explaining the deal]",
    "couponCode": "[Extracted coupon code or fallback like 'COPY40']",
    "discountDisplay": "[e.g., 40% OFF or Save $30]",
    "affiliateUrl": "[Target destination URL or placeholder]"
  }
}

Strict Rule: Return nothing but the valid raw JSON object.`

export const WEBFLOW_EXAMPLE_REQUIREMENT =
  'Create a fast coupon site for an AI tool called CopyWriter offering 40% discount'

export const WEBFLOW_API_MAP = [
  { field: 'siteConfiguration.subdomainSlug', api: 'Site duplicate / create payload → subdomain.webflow.io' },
  { field: 'siteConfiguration.newSiteName', api: 'New Webflow project display name' },
  { field: 'siteConfiguration.seoTitle', api: 'Page <title> + OG title' },
  { field: 'siteConfiguration.seoDescription', api: 'Meta description + OG description' },
  { field: 'contentData.h1Heading', api: 'Hero H1 CMS field' },
  { field: 'contentData.couponCode', api: 'Coupon code element / CMS' },
  { field: 'contentData.affiliateUrl', api: 'CTA button href' },
]

export function buildWebflowPrompt(requirement) {
  return WEBFLOW_SYSTEM_PROMPT.replace('{requirement}', requirement.trim() || WEBFLOW_EXAMPLE_REQUIREMENT)
}

/** Client-side demo — real run n8n + Webflow API se hoga */
export function mockWebflowPayload(requirement) {
  const text = (requirement || WEBFLOW_EXAMPLE_REQUIREMENT).trim()
  const brandMatch =
    text.match(/called\s+['"]?([^'"]+)['"]?/i) ||
    text.match(/coupon site for\s+(.+?)(?:\s+with|\s+offering|$)/i) ||
    text.match(/for\s+(?:an?\s+)?(.+?)\s+(?:with|offering)/i) ||
    text.match(/for\s+(?:an?\s+)?(.+?)\s+offering/i)
  const brand = (brandMatch?.[1] || 'BrandPromos').replace(/\s+/g, ' ').trim()
  const slug = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const pctMatch = text.match(/(\d+)\s*%/i)
  const discount = pctMatch ? `${pctMatch[1]}% OFF` : 'Special Deal'
  const code = brand.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() + (pctMatch?.[1] || '40')

  return {
    siteConfiguration: {
      newSiteName: `${brand} Coupons`,
      subdomainSlug: `${slug}-promos`,
      seoTitle: `${brand} Coupon Code — ${discount}`.slice(0, 60),
      seoDescription: `Get the latest ${brand} discount code. Verified promo and affiliate deal — updated for search traffic.`.slice(0, 160),
    },
    contentData: {
      h1Heading: `Save ${discount} on ${brand}`,
      subheading: `Exclusive deal for ${brand} — fast coupon landing page on ${slug}-promos.webflow.io`,
      couponCode: code,
      discountDisplay: discount,
      affiliateUrl: 'https://example.com/go/' + slug,
    },
  }
}

export function getWebflowWebhookUrl() {
  return import.meta.env.VITE_N8N_WEBFLOW_WEBHOOK_URL?.trim() || ''
}
