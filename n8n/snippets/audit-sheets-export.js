// n8n Code — optional webhook export to Google Sheets / Airtable automation
const ctx = $input.first().json;

function getEnv(name) {
  try {
    return $env[name] || '';
  } catch {
    return '';
  }
}

const sheetsWebhook = getEnv('GOOGLE_SHEETS_WEBHOOK_URL') || getEnv('AIRTABLE_WEBHOOK_URL');
let exported = false;
let exportError = null;

if (sheetsWebhook && ctx.actionPlan?.length) {
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: sheetsWebhook,
      headers: { 'Content-Type': 'application/json' },
      body: {
        event: 'audit_action_plan',
        domain: ctx.domain,
        websiteUrl: ctx.websiteUrl,
        auditRunId: ctx.auditRunId,
        wos: ctx.scores?.wos,
        completedAt: ctx.summary?.completedAt,
        rows: ctx.actionPlan,
        findings: (ctx.aeo_geo?.findings || []).slice(0, 30),
      },
      json: true,
      timeout: 20000,
    });
    exported = true;
  } catch (err) {
    exportError = err.message;
  }
}

return [{ json: { ...ctx, sheetsExport: { exported, exportError, configured: Boolean(sheetsWebhook) } } }];
