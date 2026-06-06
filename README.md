# SEO Expert — AI-Driven SEO Optimization Tool

Analyze any website's tech stack and SEO health, then auto-generate and deploy fixes via GitHub — **100% free, no AI keys required**.

## Features

- **Tech Stack Detection** — Wappalyzer (local, no paid APIs)
- **SEO Audit** — Lighthouse programmatic audit (Performance, Accessibility, SEO)
- **Template Auto-Fix** — Instant meta tag generation from URL (no AI, no rate limits)
- **GitHub Auto-Deploy** — Commits SEO fixes and triggers Vercel/Netlify deploy
- **Firebase** — Hosting + Cloud Functions backend

## Quick Start (Local)

```bash
npm install
npm install --prefix server
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## How Template Fixes Work

When Lighthouse finds missing SEO tags, the backend instantly generates:

| Missing | Generated from URL |
|---------|-------------------|
| Title | `Welcome to LifeSolveNow` (from `lifesolvenow.com`) |
| Meta Description | `Explore updates, services, and official platform features on LifeSolveNow.` |
| OpenGraph tags | Same title + description |

No AI key. No network call. Instant patch → GitHub push.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/audit` | Audit URL (tech stack + Lighthouse) |
| POST | `/api/generate-patch` | Template-based SEO patches |
| POST | `/api/patch-code` | Push patches to GitHub |
| POST | `/api/orchestrate` | Full flow: template patch → GitHub deploy |

## GitHub Pages Live URL

https://yashkumarsahu789.github.io/seoexpert/

### One-time GitHub setup (required)

1. Open repo **Settings → Pages**
2. **Build and deployment → Source:** `Deploy from a branch`
3. **Branch:** `main` and folder **`/docs`**
4. Click **Save**

Do **NOT** use `/ (root)` — that serves raw source code and shows a blank page.

After saving, wait 1–2 minutes and open:
https://yashkumarsahu789.github.io/seoexpert/

## Firebase Deploy

```bash
npm run build
npm install --prefix functions
npx firebase-tools@latest deploy
```

Project: `manager-fc26f`

## Required for Auto-Deploy

- **GitHub PAT** — `repo` scope only (for pushing SEO fixes)

## Repo

https://github.com/yashkumarsahu789/seoexpert
