// n8n Code — Telegram + Slack alerts for critical audit findings (optional)
const ctx = $input.first().json;
const critical = ctx.scores?.criticalCount || 0;

let token = '';
let chatId = '';
let slackUrl = '';
try {
  token = $env.TELEGRAM_BOT_TOKEN || '';
  chatId = $env.TELEGRAM_CHAT_ID || '';
  slackUrl = $env.SLACK_WEBHOOK_URL || '';
} catch {
  token = '';
  chatId = '';
  slackUrl = '';
}

const blocked = Object.entries(ctx.technical?.robots?.aiBots || {})
  .filter(([, v]) => v === 'blocked')
  .map(([b]) => b);

const lines = [
  '🚨 SEO/AEO/GEO Audit — Critical',
  `Domain: ${ctx.domain}`,
  `WOS: ${ctx.scores?.wos ?? '—'} (SEO ${ctx.scores?.s_seo} / AEO ${ctx.scores?.s_aeo} / GEO ${ctx.scores?.s_geo})`,
  `Critical issues: ${critical}`,
];

if (blocked.length) lines.push(`AI bots blocked: ${blocked.join(', ')}`);
if (!ctx.technical?.sitemap?.ok) lines.push('sitemap.xml missing or unreachable');

const text = lines.join('\n');
let telegramSent = false;
let slackSent = false;

if (token && chatId && critical > 0) {
  await this.helpers.httpRequest({
    method: 'POST',
    url: `https://api.telegram.org/bot${token}/sendMessage`,
    body: { chat_id: chatId, text, disable_notification: false },
    json: true,
    timeout: 15000,
  });
  telegramSent = true;
}

if (slackUrl && critical > 0) {
  await this.helpers.httpRequest({
    method: 'POST',
    url: slackUrl,
    body: { text },
    json: true,
    timeout: 15000,
  }).catch(() => {});
  slackSent = true;
}

return [{
  json: {
    ...ctx,
    telegramSent,
    slackSent,
    alertSkip: critical === 0 ? 'no_critical' : (!token && !slackUrl ? 'no_credentials' : null),
  },
}];
