# n8n Setup — LifeSolveNow SEO (v2 Safe)

> **Cursor se connect:** pehle `CONNECT.md` padho — API key + `npm run n8n:push` se yahan se deploy hota hai.

## Step 0: n8n Credentials

| Credential | Where |
|------------|-------|
| Supabase | URL + **service_role** key |
| SerpAPI or ValueSerp | serpapi.com / valueserp.com |
| Telegram Bot | @BotFather (free alerts) |
| GSC Service Account | Optional — sitemap submit |

## Step 1: Supabase Database Webhook

1. Supabase Dashboard → Database → Webhooks
2. New webhook on `shops` table → **INSERT**
3. URL = n8n workflow `1_shop_registered` webhook URL

## Step 2: Create 6 Workflows

Copy node order from `workflow-blueprint.json`.

**Every workflow:** Settings → Error Workflow → `6_error_alert`

## Step 3: Safety Rules (built into DB)

- `workflow_config` table — cooldowns & limits
- `shops_eligible_for_boost` view — 7-day cooldown
- `daily_automation_limits` — max boosts/pings per day
- Indexing = **sitemap ping only** (`use_indexing_api: false`)

## Step 4: Test

1. React app → Add test shop
2. Check `automation_runs` table
3. Check Telegram — should be silent (no errors)
4. Force error → should alert only you
