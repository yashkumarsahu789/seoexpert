// n8n Code — Step 0: normalize webhook payload + extract clean domain
// Note: n8n sandbox has no global URL constructor — use regex parsing
const trigger = $input.first().json;
let body = trigger.body ?? trigger;

if (typeof body === 'string') {
  try {
    body = JSON.parse(body);
  } catch {
    body = trigger;
  }
}

const rawUrl =
  body.websiteUrl ||
  body.url ||
  body.website_url ||
  trigger.websiteUrl ||
  trigger.url ||
  '';

if (!rawUrl || typeof rawUrl !== 'string') {
  throw new Error('websiteUrl required in webhook payload');
}

function normalizeUrl(input) {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const match = withProtocol.match(/^(https?):\/\/([^/?#]+)(\/[^?#]*)?/i);
  if (!match) throw new Error(`Invalid URL: ${input}`);

  const protocol = match[1].toLowerCase();
  const host = match[2];
  const domain = host.replace(/^www\./i, '').toLowerCase();
  const baseUrl = `${protocol}://${host}`.replace(/\/$/, '');
  const pathClean = (match[3] || '').replace(/\/$/, '');
  const origin = `${protocol}://${host}`;
  const url = pathClean ? `${origin}${pathClean}` : origin;

  return { url, domain, baseUrl, origin };
}

function toQueryString(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

const normalized = normalizeUrl(rawUrl);
const websiteId = body.websiteId || body.website_id || null;
const mode = body.mode === 'quick' ? 'quick' : 'full';
const wosAlpha = Number(body.wosAlpha ?? body.alpha ?? 0.5);
const wosBeta = Number(body.wosBeta ?? body.beta ?? 0.25);
const wosGamma = Number(body.wosGamma ?? body.gamma ?? 0.25);

return [
  {
    json: {
      websiteId,
      websiteUrl: normalized.url,
      domain: normalized.domain,
      baseUrl: normalized.baseUrl,
      origin: normalized.origin,
      mode,
      wosAlpha,
      wosBeta,
      wosGamma,
      event: body.event || 'Website Audit Request',
      source: body.source || 'n8n',
      timestamp: new Date().toISOString(),
    },
  },
];
