# Webflow Coupon Builder

Standalone React app — coupon promo sites, Webflow CMS publish, n8n automation.

## Structure

```
webflow/
├── src/              React UI (builder + Sunlu KANNY demo)
├── coupon-sites/     Exported HTML + embed + index.json (GitHub Pages)
├── scripts/          CLI: export, publish, token check
├── WEBFLOW.md        Setup guide
└── .env.example
```

## Dev

```bash
cd webflow
npm install
npm run dev
```

→ http://localhost:5174 (builder `/`, demo `/demo`)

From repo root:

```bash
npm run webflow:dev
```

## CLI (from `webflow/` or root via `npm run webflow:*`)

| Command | Purpose |
|---------|---------|
| `webflow:check` | List sites + CMS collections |
| `webflow:token` | Verify API scopes |
| `webflow:export` | HTML → `coupon-sites/` |
| `webflow:host` | Sync `coupon-sites/index.json` |
| `webflow:publish` | Push KANNY promo to Webflow CMS |

## Main app link

SEO Engine home opens this app via `VITE_WEBFLOW_APP_URL` (default `http://localhost:5174`).

n8n workflow stays in `n8n/workflows/webflow_site_spawn.json` — see `WEBFLOW.md`.
