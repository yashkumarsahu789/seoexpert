# SEO Expert — AI-Driven SEO Optimization Tool

Analyze any website's tech stack and SEO health, then deploy **your own custom** meta tags to GitHub — **no AI key required**.

## Live URLs

| Platform | URL | Mode |
|----------|-----|------|
| **Firebase (recommended)** | https://manager-fc26f.web.app | Full backend: Lighthouse + Wappalyzer + GitHub push |
| GitHub Pages | https://yashkumarsahu789.github.io/seoexpert/ | Lite audit in browser (no Lighthouse scores) |

## Features

- **Tech Stack Detection** — Wappalyzer (Firebase) / HTML heuristics (GitHub Pages)
- **SEO Audit** — Lighthouse on Firebase backend; meta/headings in browser on GitHub Pages
- **Custom Template Patch** — User writes title + description → backend pushes to GitHub
- **GitHub Auto-Deploy** — Commits SEO fixes to your repo
- **No AI Key** — Template engine uses your custom text, not generic duplicates

## Quick Start (Local — full power)

```bash
npm install
npm install --prefix server
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Firebase Deploy (100% live product)

### Step 1 — Upgrade to Blaze plan (required for Cloud Functions + Lighthouse)

https://console.firebase.google.com/project/manager-fc26f/usage/details

Spark (free) plan cannot deploy Cloud Functions with Lighthouse.

### Step 2 — Deploy

```bash
npm install
npm install --prefix functions
npm run deploy:firebase
```

Or hosting only (UI without backend API):

```bash
npm run deploy:firebase:hosting
```

## Custom SEO Patch Flow (Step 6)

1. Run audit on target website URL
2. Fill **Website Title** — e.g. `LifeSolveNow — Digital Services for Local Shops`
3. Fill **Meta Description** — 1–2 lines about the business (unique per user)
4. Add GitHub PAT + repo → **Authorize Patch & Deploy**

Backend converts your text into `<title>`, `<meta description>`, and OpenGraph tags — no AI, no duplicate generic text.

## API Endpoints (Firebase / Local)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/audit` | Full audit (Lighthouse + Wappalyzer) |
| POST | `/api/generate-patch` | Custom template patches |
| POST | `/api/patch-code` | Push patches to GitHub |
| POST | `/api/orchestrate` | Audit → custom patch → GitHub deploy |

## GitHub Pages Deploy

Auto-deploys on push to `main` via GitHub Actions (`.github/workflows/deploy-pages.yml`).

Settings → Pages → Source: **GitHub Actions**

## Repo

https://github.com/yashkumarsahu789/seoexpert
