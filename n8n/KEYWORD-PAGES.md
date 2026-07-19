# Keyword Pages Pipeline

Daily automation: **1 site per 24 hours** → top keyword → 1-page site → GitHub → GitHub Pages deploy.

## Daily limit (1 / 24h)

| Setting | Value |
|---------|-------|
| Cron | 8 AM IST (`30 2 * * *` UTC) — once per day |
| `KEYWORD_PAGES_DAILY_MAX` | `1` (Render n8n env) |
| 24h guard | Agar last 24h me page commit ho chuki → run skip |
| Manual override | Webhook `{ "forceRun": true, "maxPages": 1 }` — testing only |

```bash
# Normal daily (auto) — sirf 1 page
# Cron trigger — kuch bhejne ki zaroorat nahi

# Dry run test
curl -X POST .../webhook/keyword-pages-run \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"maxPages":1}'
```

## Two page types (AI optional)

| Type | Example keyword | How built | AI? |
|------|-----------------|-----------|-----|
| **brand** | chatgpt, youtube, amazon | Landing + "Open →" via `/out/?to=` redirect | ❌ Template only |
| **tool** | calculator, timer, bmi | Mini tool in HTML/JS | ❌ Code only |

AI is **not required** for this pipeline. Use bulk LLM only later for richer copy if needed.

## Flow

```
Cron 8 AM IST (n8n keyword_pages_daily)
  → Google Suggest + shop_rank_snapshots keywords
  → SERP top URL (free scrape)
  → classify brand vs tool
  → generate HTML (tools/lib/page-generator.mjs)
  → GitHub commit via Supabase ai-center-github
  → GitHub Actions deploy-keyword-pages.yml
  → Live on GitHub Pages under tools/public/
```

## Local commands

```bash
# Generate 6 sample pages locally
npm run keyword-pages:test

# Check env, GitHub PAT, n8n webhook, blockers
npm run keyword-pages:check

# Push workflow to Render n8n
npm run n8n:push -- keyword_pages_daily
```

## Manual webhook (dry run)

```bash
curl -X POST https://lifesolvenow.onrender.com/webhook/keyword-pages-run \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"maxPages":1}'
```

## Required setup

### 1. Supabase migration

```bash
# Apply 014_keyword_pages.sql (keyword_pages table)
supabase db push
```

### 2. Supabase secrets

```bash
supabase secrets set GITHUB_TOKEN=ghp_...
supabase secrets set CLOUDFLARE_ACCOUNT_ID=...
supabase secrets set CLOUDFLARE_API_TOKEN=...
```

### 3. Render n8n env

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_REPO=owner/seoexpert
KEYWORD_PAGES_PATH=tools/public/pages
KEYWORD_PAGES_DAILY_MAX=1
```

### 4. GitHub Pages

Repo → Settings → Pages → Source: **GitHub Actions**

Workflow: `.github/workflows/deploy-keyword-pages.yml`

### 5. Vite env

```
VITE_GITHUB_REPO=owner/seoexpert
VITE_N8N_KEYWORD_PAGES_WEBHOOK_URL=https://lifesolvenow.onrender.com/webhook/keyword-pages-run
```

## Files

| Path | Role |
|------|------|
| `tools/lib/page-generator.mjs` | HTML templates (brand + tools) |
| `tools/public/pages/*.html` | Generated pages |
| `tools/public/out/index.html` | Redirect gate (traffic through platform) |
| `n8n/snippets/keyword-pages-daily-run.js` | Daily orchestrator |
| `n8n/workflows/keyword_pages_daily.json` | Cron + webhook |
| `n8n/data/keyword-seeds.json` | Seed keywords |
| `supabase/migrations/014_keyword_pages.sql` | Tracking table |

## AI Center integration (same as main site)

`tools/src/data/` me **same AI registry** hai jo main site use karti hai:

| File | Role |
|------|------|
| `aiAutomation.js` | CF/Groq/SambaNova limits, `KEYWORD_PAGES_AI_RULES` |
| `aiCenter.js` | Agents + task types (+ `keyword_page_*`) |
| `services/aiCenterService.js` | Queue, orchestrate, GitHub commit |
| `services/keywordPagesService.js` | Pipeline bridge |

### Kab AI use hota hai

| Step | AI? | Task type |
|------|-----|-----------|
| Keyword find | ❌ | n8n free |
| SERP scrape | ❌ | n8n free |
| Classify brand/tool | ⚡ optional | `keyword_page_classify` |
| Tool HTML | ❌ | page-generator.mjs |
| Brand SEO copy | ⚡ optional | `keyword_page_seo` → cf-llama |
| GitHub deploy | ❌ (PAT) | `keyword_page_commit` → GitHub agent |

### UI tabs (tools dev server)

1. **Keyword pipeline** — queue keyword + optional AI SEO
2. **AI Center** — full agent fleet, limits, orchestrator (same as main)
3. **Generated pages** — local HTML preview

### Limits (Cloudflare free)

Same as main AI Center: ~**150–300** LLM calls/day shared pool. Tool pages **unlimited** (no AI).

```
VITE_AI_ENABLED=true
VITE_CF_AI_MODEL=llama
VITE_GITHUB_REPO=owner/repo
```

## SEO + indexing automation

### Code layer (har page — bina AI)
- JSON-LD `WebPage` + `FAQPage` schema
- Open Graph + Twitter meta
- Canonical URL
- `robots.txt` → sitemap link

### AI layer (brand pages — optional)
```
KEYWORD_PAGES_USE_AI_SEO=true   # n8n Render
```
→ cf-llama se title, description, H1 (2026 SEO trends prompt)

### Daily indexing (XML + ping)

| Time | Workflow | Kya karta hai |
|------|----------|---------------|
| 8 AM IST | `keyword_pages_daily` | 1 page + sitemap + ping |
| 9 AM IST | `keyword_pages_indexing_daily` | Full sitemap rebuild + Google/Bing/IndexNow + index check |

```bash
# Manual indexing run
curl -X POST .../webhook/keyword-pages-indexing -H "Content-Type: application/json" -d '{}'
```

**Ping targets (open / free):**
- `https://www.google.com/ping?sitemap=...`
- `https://www.bing.com/ping?sitemap=...`
- [IndexNow](https://www.indexnow.org/) API (Bing, Yandex, etc.)

**Env:**
```
KEYWORD_PAGES_PUBLIC_BASE=https://shop.LifeSolveNow.com/pages
INDEXNOW_KEY=<random-32-chars>   # optional — generate once, commit indexnow-key.txt
```

Migration `015_keyword_pages_indexing.sql` — `index_status`, `last_index_ping_at` columns.

## Blockers checklist (run `npm run keyword-pages:check`)

See script output — typical blockers:

1. **GITHUB_TOKEN** not in Supabase secrets → commits fail
2. **keyword_pages_daily** not pushed to n8n → webhook 404
3. **Migration 014** not applied → DB save skipped (commits still work)
4. **GitHub Pages** not enabled → commits don't go live
5. **Google SERP scrape** rate-limited → some keywords skip top URL
6. **SERP_API_KEY** optional — add on Render for paid fallback

## SEO note

Brand landing pages must comply with Google quality guidelines — clear disclosure, not impersonation. Templates say "Official access via LifeSolveNow" and redirect through `/out/`.
