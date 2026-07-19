// Render free-tier guard: lightweight heartbeat payload (no heavy processing)
// Hardcoded — n8n Code node blocks $env unless N8N_BLOCK_ENV_ACCESS_IN_NODE=false
const instanceUrl = 'https://lifesolvenow.onrender.com';
const trigger = $input.first().json;

const isWebhook = Boolean(trigger.headers?.host || trigger.query?.source);
const source = isWebhook
  ? trigger.headers?.['x-keepalive-source'] || trigger.query?.source || 'webhook'
  : 'n8n_schedule';

const now = new Date().toISOString();

return [
  {
    json: {
      id: 'render_lifetime_guard',
      last_ping_at: now,
      source,
      instance_url: instanceUrl.replace(/\/$/, ''),
      status: 'alive',
      meta: {
        render_plan: 'free',
        guard_version: 1,
        checks: {
          sleep_window_minutes: 15,
          ping_interval_minutes: 5,
          db_external: 'supabase',
          note: 'External pings required — schedule alone cannot wake sleeping Render',
        },
      },
      ping_url: `${instanceUrl.replace(/\/$/, '')}/healthz`,
      log: {
        pinged_at: now,
        source,
        status: 'ok',
      },
    },
  },
];
