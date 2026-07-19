// n8n Code — POST each saved site to the main audit webhook (fire-and-forget)
const site = $input.first().json;

if (!site.websiteUrl) {
  return [{ json: { ...site, triggered: false, error: 'websiteUrl missing' } }];
}

let webhookUrl = '';
try {
  webhookUrl =
    $env.AUDIT_WEBHOOK_URL ||
    $env.VITE_N8N_AUDIT_WEBHOOK_URL ||
    'https://lifesolvenow.onrender.com/webhook/62d11c24-940d-456d-a512-5d27089c0a69';
} catch {
  webhookUrl = 'https://lifesolvenow.onrender.com/webhook/62d11c24-940d-456d-a512-5d27089c0a69';
}

const payload = {
  websiteId: site.websiteId,
  websiteUrl: site.websiteUrl,
  mode: site.mode || 'full',
  source: 'daily-schedule',
  event: site.event || 'Daily SEO/AEO/GEO Audit',
  timestamp: new Date().toISOString(),
  wosAlpha: 0.5,
  wosBeta: 0.25,
  wosGamma: 0.25,
};

let auditRunId = null;
let triggerError = null;

try {
  const res = await this.helpers.httpRequest({
    method: 'POST',
    url: webhookUrl,
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    json: true,
    timeout: 90000,
  });
  auditRunId = res?.auditRunId || res?.body?.auditRunId || null;
} catch (err) {
  triggerError = err.message;
}

// small delay so Render/n8n is not hammered
await new Promise((r) => setTimeout(r, 3000));

return [
  {
    json: {
      ...site,
      triggered: !triggerError,
      auditRunId,
      triggerError,
      webhookUrl,
    },
  },
];
