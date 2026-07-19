# AI Automation — Bulk LLM Pipeline

n8n sirf data scrape/fetch karta hai aur `bulk_tasks` me INSERT karta hai.  
LLM processing **Supabase Edge Function + Cloudflare Workers AI** par hoti hai (free, serverless).

```
n8n (scrape) → Supabase INSERT bulk_tasks
                    ↓ Database Webhook (INSERT)
              Edge Function process-llm-task
                    ↓ Cloudflare Workers AI
              UPDATE bulk_tasks (ai_response, status)
```

---

## Step 0: Cloudflare Workers AI keys

1. **CLOUDFLARE_ACCOUNT_ID** — [Cloudflare Dashboard](https://dash.cloudflare.com) → Overview. URL me bhi: `dash.cloudflare.com/<ACCOUNT_ID>/...`
2. **CLOUDFLARE_API_TOKEN** — My Profile → API Tokens → Create Token:
   - Template: **Workers AI (Beta)**, ya
   - Custom: permission **Workers AI → Edit**

Ye keys **Supabase Edge Function secrets** me jati hain — browser / VITE_ me kabhi mat daalo.

---

## Step 1: SQL migration

Repo me file: `supabase/migrations/008_bulk_tasks.sql`

```bash
supabase db push
# ya Supabase SQL Editor me migration run karo
```

Table `bulk_tasks`: `id`, `input_text`, `ai_response`, `status`, `created_at`, `updated_at`

---

## Step 2: Edge Function

Code: `supabase/functions/process-llm-task/index.ts`

Logic:
1. Webhook payload se `record.id` + `record.input_text`
2. Status → `processing` (race lock)
3. Cloudflare API: `@cf/meta/llama-3.1-8b-instruct` (default) ya DeepSeek via `CF_AI_MODEL=deepseek`
4. `ai_response` save, status → `completed` (error par `failed`)

---

## Step 3: Deploy CLI

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy process-llm-task
supabase secrets set \
  CLOUDFLARE_ACCOUNT_ID=your_account_id \
  CLOUDFLARE_API_TOKEN=your_token \
  CF_AI_MODEL=llama
```

Models:
- `llama` → `@cf/meta/llama-3.1-8b-instruct`
- `deepseek` → `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`
- Full path bhi chalega: `CF_AI_MODEL=@cf/meta/llama-3.1-8b-instruct`

---

## Step 4: Database Webhook (Supabase UI)

1. Dashboard → **Database** → **Webhooks** → **Create a new hook**
2. **Table**: `bulk_tasks`
3. **Events**: ✅ INSERT only (UPDATE/DELETE off)
4. **Webhook configuration**: Type = **Supabase Edge Functions**
5. Function: `process-llm-task`
6. Save

---

## Step 5: n8n configuration

### Option A — Supabase node (recommended doc pattern)

| Field | Value |
|-------|-------|
| Node | Supabase |
| Operation | Insert |
| Table | `bulk_tasks` |
| Mapping | scraped text → `input_text` |

Render env (n8n):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Option B — Repo webhook workflow

```bash
npm run n8n:push -- bulk_llm_enqueue
```

Webhook URL → `.env`:
```env
VITE_N8N_BULK_LLM_WEBHOOK_URL=https://lifesolvenow.onrender.com/webhook/bulk-llm-enqueue
```

POST body:
```json
{ "input_text": "Summarize this product page..." }
```

Bulk:
```json
{ "items": [{ "input_text": "..." }, { "input_text": "..." }] }
```

---

## React UI

Route: `/ai-automation` — setup checklist + test insert + task monitor.

Local `.env`:
```env
VITE_AI_ENABLED=true
VITE_CF_AI_MODEL=llama
VITE_N8N_BULK_LLM_WEBHOOK_URL=...
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Row `pending` forever | Database Webhook missing ya Edge Function deploy nahi |
| `failed` status | Cloudflare secrets check — `supabase secrets list` |
| n8n insert error | `SUPABASE_SERVICE_ROLE_KEY` on Render |
| Duplicate processing | Edge function locks `pending` → `processing` first |
