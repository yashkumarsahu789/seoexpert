# Webflow Site Spawn

User requirement (Hindi/English) → AI JSON → Webflow CMS → publish → `brand.webflow.io`

## UI

Home → **Webflow** → requirement likho → **Webflow par site banao**

## Token UI me "other perms" nahi dikh rahe?

API ab bhi `missing scopes: cms:read` de raha hai = token **bina CMS/Sites permission** ke bana.

### Sahi jagah (site-level token)

1. **demosite** site kholo (jo `demosite-57cbb8.webflow.io` hai)
2. Designer ya Dashboard se **gear icon** → **Site settings**
3. Left sidebar: **Apps & integrations**
4. Page ke **neeche scroll** → section **API access**
5. **Generate API token** → modal me **table** dikhegi:

| Row | Set karo |
|-----|----------|
| **CMS** | Read and write |
| **Sites** | Read and write (ya Read + Publish) |
| Baaki (Ecommerce, Forms…) | No access — theek hai |

Agar sirf **name + Generate** dikhe, **bina CMS/Sites rows** → galat page ho sakti hai (Workspace token / App token).

### Agar CMS/Sites rows hi nahi hain

- Account **Site Administrator** nahi ho sakta — workspace owner se admin role lo
- Token **Workspace** se bana ho — site settings wale flow se dubara banao
- [Webflow forum](https://discourse.webflow.com/t/quick-question-about-api-tokens/283836) — non-admin ko generate button bhi nahi milta

### Verify

```bash
npm run webflow:token
```

Kam se kam **cms:read** ✅ hona chahiye.

### API ke bina (abhi ke liye)

```bash
npm run webflow:export
```

→ `webflow/coupon-sites/sunlu-kanny-promo.html` — hosted full page (free plan). Embed: `webflow/coupon-sites/webflow-home-embed.html`

Frontend demo: `npm run webflow:dev` → http://localhost:5174/demo (KANNY 10% off full page).


### 1. Webflow

1. Master coupon landing template banao (Designer me hero, coupon code, CTA).
2. CMS Collection banao — fields (slug names):
   - `h1-heading`, `subheading`, `coupon-code`, `discount-display`, `affiliate-url`, `seo-title`, `seo-description`
3. API token: Account Settings → Integrations
4. Site ID + Collection ID copy karo

### 2. n8n (Render env)

```
WEBFLOW_API_TOKEN=...
WEBFLOW_MASTER_SITE_ID=...
WEBFLOW_COUPON_COLLECTION_ID=...
WEBFLOW_USE_AI=true
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional Enterprise:

```
WEBFLOW_WORKSPACE_ID=...
WEBFLOW_TEMPLATE_NAME=...
```

Optional pre-duplicated site pool (jab har brand ko alag subdomain chahiye):

```
WEBFLOW_SITE_POOL=siteId1,siteId2,siteId3
```

### 3. Supabase

```bash
supabase db push   # migration 016_webflow_sites
```

### 4. Deploy workflow

```bash
npm run n8n:push -- webflow_site_spawn
```

### 5. React .env

```
VITE_N8N_WEBFLOW_WEBHOOK_URL=https://lifesolvenow.onrender.com/webhook/webflow-site-spawn
```

## API reality

- **Duplicate site** — public API nahi; manually duplicate karke `WEBFLOW_SITE_POOL` me IDs daalo.
- **Enterprise** — `WEBFLOW_WORKSPACE_ID` se naya site create ho sakta hai.
- **Standard plan** — master site par CMS item + publish (recommended start).

## Webhook body

```json
{ "requirement": "Create coupon site for CopyWriter 40% off", "dryRun": false }
```

## Response

```json
{
  "ok": true,
  "siteUrl": "https://your-master.webflow.io",
  "payload": { "siteConfiguration": {}, "contentData": {} },
  "steps": ["AI: bulk_task #12 completed", "CMS: item created", "Webflow: published"]
}
```
