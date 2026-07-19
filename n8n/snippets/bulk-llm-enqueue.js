// n8n Code — scrape/fetch data → INSERT bulk_tasks (LLM runs in Supabase Edge + Cloudflare)
const body = $input.first().json?.body ?? $input.first().json ?? {};

let SUPABASE_URL = '';
let SUPABASE_KEY = '';
try {
  SUPABASE_URL = $env.SUPABASE_URL || '';
  SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY || '';
} catch {
  /* sandbox */
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY missing on Render n8n');
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function normalizeRows(payload) {
  if (Array.isArray(payload.items)) {
    return payload.items
      .map((item) => {
        if (typeof item === 'string') return { input_text: item };
        if (item?.input_text) return { input_text: String(item.input_text) };
        if (item?.text) return { input_text: String(item.text) };
        return { input_text: JSON.stringify(item) };
      })
      .filter((r) => r.input_text?.trim());
  }
  if (payload.input_text) return [{ input_text: String(payload.input_text) }];
  if (payload.text) return [{ input_text: String(payload.text) }];
  if (payload.scraped) return [{ input_text: String(payload.scraped) }];
  return [{ input_text: JSON.stringify(payload) }];
}

const rows = normalizeRows(body);
if (!rows.length) throw new Error('No input_text — send { input_text } or { items: [...] }');

const inserted = await this.helpers.httpRequest({
  method: 'POST',
  url: `${SUPABASE_URL}/rest/v1/bulk_tasks`,
  headers,
  body: rows,
  json: true,
});

const list = Array.isArray(inserted) ? inserted : [inserted];
return list.map((row) => ({
  json: {
    ok: true,
    taskId: row.id,
    status: row.status,
    message: 'Row inserted — Supabase webhook will call process-llm-task',
  },
}));
