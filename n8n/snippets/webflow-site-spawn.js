// n8n Code — requirement → AI JSON → Webflow CMS inject → publish
const input = $input.first().json;
const body = input.body || input;
const requirement = String(body.requirement || body.text || '').trim();
const dryRun = body.dryRun === true;

let WEBFLOW_TOKEN = '';
let MASTER_SITE_ID = '';
let WORKSPACE_ID = '';
let COLLECTION_ID = '';
let SITE_POOL = [];
let SUPABASE_URL = '';
let SUPABASE_KEY = '';
let USE_AI = true;

try {
  WEBFLOW_TOKEN = $env.WEBFLOW_API_TOKEN || $env.WEBFLOW_API_KEY || '';
  MASTER_SITE_ID = $env.WEBFLOW_MASTER_SITE_ID || '';
  WORKSPACE_ID = $env.WEBFLOW_WORKSPACE_ID || '';
  COLLECTION_ID = $env.WEBFLOW_COUPON_COLLECTION_ID || '';
  SITE_POOL = String($env.WEBFLOW_SITE_POOL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  SUPABASE_URL = $env.SUPABASE_URL || '';
  SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY || '';
  USE_AI = String($env.WEBFLOW_USE_AI || 'true').toLowerCase() !== 'false';
} catch {
  /* sandbox */
}

const wfHeaders = {
  Authorization: `Bearer ${WEBFLOW_TOKEN}`,
  'Content-Type': 'application/json',
  accept: 'application/json',
};

const sbHeaders = SUPABASE_KEY
  ? {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    }
  : null;

const steps = [];

function buildPayloadFromRequirement(text) {
  const brandMatch =
    text.match(/called\s+['"]?([^'"]+)['"]?/i) ||
    text.match(/coupon site for\s+(.+?)(?:\s+with|\s+offering|$)/i) ||
    text.match(/for\s+(?:an?\s+)?(.+?)\s+(?:with|offering)/i) ||
    text.match(/for\s+(?:an?\s+)?(.+?)\s+offering/i);
  const brand = (brandMatch?.[1] || 'BrandPromos').replace(/\s+/g, ' ').trim();
  const slug = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const pctMatch = text.match(/(\d+)\s*%/i);
  const discount = pctMatch ? `${pctMatch[1]}% OFF` : 'Special Deal';
  const code = brand.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() + (pctMatch?.[1] || '40');

  return {
    siteConfiguration: {
      newSiteName: `${brand} Coupons`,
      subdomainSlug: `${slug}-promos`,
      seoTitle: `${brand} Coupon Code — ${discount}`.slice(0, 60),
      seoDescription: `Get the latest ${brand} discount code. Verified promo and affiliate deal.`.slice(0, 160),
    },
    contentData: {
      h1Heading: `Save ${discount} on ${brand}`,
      subheading: `Exclusive deal for ${brand} — coupon landing page`,
      couponCode: code,
      discountDisplay: discount,
      affiliateUrl: `https://example.com/go/${slug}`,
    },
  };
}

function buildAiPrompt(req) {
  return `You are a Webflow site automation engine. Output ONLY raw JSON (no markdown).

Requirement: ${req}

{
  "siteConfiguration": {
    "newSiteName": "Brand Coupons",
    "subdomainSlug": "brand-promos",
    "seoTitle": "max 60 chars",
    "seoDescription": "max 160 chars"
  },
  "contentData": {
    "h1Heading": "...",
    "subheading": "...",
    "couponCode": "...",
    "discountDisplay": "...",
    "affiliateUrl": "..."
  }
}`;
}

async function aiPayload(req) {
  if (!USE_AI || !SUPABASE_URL || !SUPABASE_KEY) {
    steps.push('AI: rule-based fallback');
    return buildPayloadFromRequirement(req);
  }

  try {
    const inserted = await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/bulk_tasks`,
      headers: sbHeaders,
      body: [{ input_text: buildAiPrompt(req), model_key: 'webflow-spawn' }],
      json: true,
      timeout: 20000,
    });
    const taskId = (Array.isArray(inserted) ? inserted[0] : inserted)?.id;
    if (!taskId) throw new Error('bulk_tasks insert failed');

    steps.push(`AI: bulk_task #${taskId} queued`);

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const row = await this.helpers.httpRequest({
        method: 'GET',
        url: `${SUPABASE_URL}/rest/v1/bulk_tasks?id=eq.${taskId}&select=id,status,ai_response`,
        headers: sbHeaders,
        json: true,
        timeout: 15000,
      });
      const task = row?.[0];
      if (!task) continue;
      if (task.status === 'completed' && task.ai_response) {
        const cleaned = String(task.ai_response).replace(/^```json\s*|\s*```$/g, '').trim();
        steps.push('AI: bulk_task completed');
        return JSON.parse(cleaned);
      }
      if (task.status === 'failed') break;
    }
    steps.push('AI: timeout — fallback rules');
  } catch (err) {
    steps.push(`AI: ${err.message} — fallback`);
  }
  return buildPayloadFromRequirement(req);
}

async function logSite(row) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const saved = await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/webflow_sites`,
      headers: sbHeaders,
      body: row,
      json: true,
      timeout: 20000,
    });
    return Array.isArray(saved) ? saved[0] : saved;
  } catch {
    return null;
  }
}

async function pickTargetSiteId() {
  if (SITE_POOL.length) return SITE_POOL[0];
  return MASTER_SITE_ID;
}

async function getSiteMeta(siteId) {
  const site = await this.helpers.httpRequest({
    method: 'GET',
    url: `https://api.webflow.com/v2/sites/${siteId}`,
    headers: wfHeaders,
    json: true,
    timeout: 20000,
  });
  return site;
}

async function createEnterpriseSite(payload) {
  if (!WORKSPACE_ID) return null;
  try {
    const created = await this.helpers.httpRequest({
      method: 'POST',
      url: `https://api.webflow.com/v2/workspaces/${WORKSPACE_ID}/sites`,
      headers: wfHeaders,
      body: {
        name: payload.siteConfiguration.newSiteName,
        template_name: $env.WEBFLOW_TEMPLATE_NAME || undefined,
      },
      json: true,
      timeout: 30000,
    });
    steps.push('Webflow: enterprise site created');
    return created;
  } catch (err) {
    steps.push(`Webflow enterprise create skipped: ${err.message}`);
    return null;
  }
}

async function upsertCmsItem(siteId, payload) {
  if (!COLLECTION_ID) {
    steps.push('CMS: skipped — WEBFLOW_COUPON_COLLECTION_ID missing');
    return null;
  }

  const slug = payload.siteConfiguration.subdomainSlug;
  const fieldData = {
    name: payload.siteConfiguration.newSiteName,
    slug,
    'h1-heading': payload.contentData.h1Heading,
    subheading: payload.contentData.subheading,
    'coupon-code': payload.contentData.couponCode,
    'discount-display': payload.contentData.discountDisplay,
    'affiliate-url': payload.contentData.affiliateUrl,
    'seo-title': payload.siteConfiguration.seoTitle,
    'seo-description': payload.siteConfiguration.seoDescription,
  };

  const item = await this.helpers.httpRequest({
    method: 'POST',
    url: `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items`,
    headers: wfHeaders,
    body: { fieldData, isArchived: false, isDraft: false },
    json: true,
    timeout: 30000,
  });
  steps.push(`CMS: item created (${item?.id || 'ok'})`);
  return item;
}

async function publishSite(siteId) {
  await this.helpers.httpRequest({
    method: 'POST',
    url: `https://api.webflow.com/v2/sites/${siteId}/publish`,
    headers: wfHeaders,
    body: { publishToWebflowSubdomain: true },
    json: true,
    timeout: 30000,
  });
  steps.push('Webflow: published');
}

if (!requirement) {
  return [{ json: { ok: false, error: 'requirement missing — batao kya banana hai' } }];
}

const payload = await aiPayload(requirement);

if (dryRun) {
  return [{
    json: {
      ok: true,
      dryRun: true,
      payload,
      previewUrl: `https://${payload.siteConfiguration.subdomainSlug}.webflow.io`,
      steps,
      message: 'Dry run — Webflow API call nahi hua',
    },
  }];
}

if (!WEBFLOW_TOKEN) {
  return [{ json: { ok: false, error: 'WEBFLOW_API_TOKEN missing on n8n Render env', payload, steps } }];
}

let siteId = await pickTargetSiteId();
let siteMeta = null;
let cmsItem = null;

const enterpriseSite = await createEnterpriseSite(payload);
if (enterpriseSite?.id) {
  siteId = enterpriseSite.id;
  siteMeta = enterpriseSite;
}

if (!siteId) {
  return [{
    json: {
      ok: false,
      error: 'WEBFLOW_MASTER_SITE_ID ya WEBFLOW_SITE_POOL set karo',
      payload,
      steps,
    },
  }];
}

if (!siteMeta) {
  siteMeta = await getSiteMeta(siteId);
  steps.push(`Webflow: using site ${siteMeta?.shortName || siteId}`);
}

try {
  cmsItem = await upsertCmsItem(siteId, payload);
  await publishSite(siteId);
} catch (err) {
  await logSite({
    requirement,
    site_name: payload.siteConfiguration.newSiteName,
    subdomain_slug: payload.siteConfiguration.subdomainSlug,
    webflow_site_id: siteId,
    status: 'failed',
    payload,
    error_message: err.message,
  });
  return [{ json: { ok: false, error: err.message, payload, steps } }];
}

const shortName = siteMeta?.shortName || payload.siteConfiguration.subdomainSlug;
const siteUrl = `https://${shortName}.webflow.io`;

const saved = await logSite({
  requirement,
  site_name: payload.siteConfiguration.newSiteName,
  subdomain_slug: payload.siteConfiguration.subdomainSlug,
  site_url: siteUrl,
  webflow_site_id: siteId,
  cms_item_id: cmsItem?.id || null,
  status: 'published',
  payload,
});

return [{
  json: {
    ok: true,
    message: 'Webflow site ready',
    siteUrl,
    previewUrl: siteUrl,
    subdomain: shortName,
    siteId,
    cmsItemId: cmsItem?.id || null,
    payload,
    steps,
    recordId: saved?.id || null,
  },
}];
