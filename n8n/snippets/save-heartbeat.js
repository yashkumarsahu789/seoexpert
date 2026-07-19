// Save heartbeat via Supabase RPC — no $env / process.env needed on Render n8n
const hb = $('Build Heartbeat').first().json;
const anonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGxmeWZrcGF0bnhrcm1zbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM2NjMsImV4cCI6MjA4OTU2OTY2M30.eLqakT_Yus8i17cDzJWRGdgvQMSDzvuqHnvjb3AeVPE';

const response = await this.helpers.httpRequest({
  method: 'POST',
  url: 'https://sbdlfyfkpatnxkrmslvq.supabase.co/rest/v1/rpc/touch_n8n_heartbeat',
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  },
  body: { p_source: hb.source },
  json: true,
});

return [{ json: { saved: true, source: hb.source, response } }];
