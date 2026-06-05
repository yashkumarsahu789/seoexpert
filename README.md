# SEO Expert — AI-Driven SEO Optimization Tool

Analyze any website's tech stack and SEO health, then auto-generate and deploy fixes via GitHub + Google AI.

## Features

- **Tech Stack Detection** — Wappalyzer (local, no paid APIs)
- **SEO Audit** — Lighthouse programmatic audit (Performance, Accessibility, SEO)
- **AI Patch Generation** — Google AI Studio (Gemini) with your own API key
- **GitHub Auto-Deploy** — Commits SEO fixes and triggers Vercel/Netlify deploy
- **Firebase** — Hosting + Cloud Functions backend

## Quick Start (Local)

```bash
# Install frontend + server dependencies
npm install
npm install --prefix server

# Run frontend (Vite) + backend (Express) together
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/audit` | Audit URL (tech stack + Lighthouse) |
| POST | `/api/generate-patch` | AI generates SEO code patches |
| POST | `/api/patch-code` | Push patches to GitHub |
| POST | `/api/orchestrate` | Full flow: AI patch → GitHub deploy |

## Firebase Deploy

```bash
npm run build
npm install --prefix functions
npx firebase-tools@latest deploy
```

Project: `manager-fc26f`

## Required Keys (user-provided)

- **Google AI Studio API Key** — [aistudio.google.com](https://aistudio.google.com)
- **GitHub PAT** — repo scope for auto-push

## Repo

https://github.com/yashkumarsahu789/seoexpert
