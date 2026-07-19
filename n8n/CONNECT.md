# Cursor se n8n Connect Kaise Karein

Yeh guide batati hai ki **yahan (seoexpert repo)** se changes karke **wahan (Render n8n)** par automation kaise deploy ho — bina n8n UI mein manual drag-drop ke.

## Architecture

```
Cursor AI (prompt)
    ↓ likhta hai
n8n/workflows/*.json  +  n8n/snippets/*.js
    ↓ npm run n8n:push
n8n API (lifesolvenow.onrender.com)
    ↓
Live automation (webhooks, cron, etc.)
```

React app sirf **webhook URL** se n8n ko trigger karti hai (`VITE_N8N_*` vars). Poora workflow logic repo mein rehta hai.

---

## Step 1: n8n API Key banao (ek baar)

1. Kholo: https://lifesolvenow.onrender.com
2. **Settings** → **Personal API Keys** → **Create API Key**
3. `.env` mein add karo (`.env.example` dekho):

```env
N8N_API_URL=https://lifesolvenow.onrender.com
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Sahi key **`eyJ...`** (JWT) ya **`n8n_api_...`** (legacy) se start hoti hai.  
> **`rnd_...`** ya webhook UUID galat hai — woh n8n API key nahi hai.  
> API key kabhi `VITE_` prefix mat lagao — woh browser mein leak ho jayegi.

4. Test karo:

```bash
npm run n8n:check
```

---

## Step 2: Pehla workflow pull karo (optional)

Agar n8n UI mein pehle se workflow hai (jaise `tzQVzirqMc3lD7UN`):

```bash
npm run n8n:pull -- tzQVzirqMc3lD7UN
```

Yeh `n8n/workflows/` mein JSON file bana dega aur `workflows-manifest.json` update karega.

---

## Step 3: Yahan se deploy karo

```bash
npm run n8n:push              # saari workflows
npm run n8n:push -- website_audit   # sirf ek workflow
npm run n8n:list              # remote par kya hai dekho
```

---

## Step 4: Cursor AI ko naya automation banwao

Cursor chat mein aise prompt do:

> "n8n automation banao: jab Supabase `shops` table mein naya row insert ho, to `indexing_queue` mein URL add karo. `workflow-blueprint.json` ke `1_shop_registered` flow follow karo. `n8n/snippets/` use karo. Push bhi karo."

AI yeh karega:

1. `n8n/workflows/shop_registered.json` — n8n-compatible JSON
2. `n8n/snippets/*.js` — Code node logic (agar zarurat ho)
3. `n8n/workflows-manifest.json` — entry add
4. `npm run n8n:push` — Render par deploy

---

## Folder structure

| Path | Kaam |
|------|------|
| `n8n/workflows/*.json` | Deploy hone wale workflows (source of truth) |
| `n8n/snippets/*.js` | Code node JavaScript |
| `n8n/workflows-manifest.json` | Local slug ↔ n8n workflow ID map |
| `n8n/workflow-blueprint.json` | High-level spec (6 SEO workflows) |
| `scripts/n8n-sync.mjs` | push / pull / list CLI |

### Workflow JSON format

Har file mein `_meta` block (API ko nahi jata):

```json
{
  "_meta": {
    "id": "shop_registered",
    "description": "Naya shop → indexing queue",
    "activate": true,
    "snippetRefs": {
      "Build Sitemap Rows": "generate-sitemap-entry.js"
    }
  },
  "name": "shop.registered",
  "nodes": [...],
  "connections": {...},
  "settings": { "executionOrder": "v1" }
}
```

`snippetRefs` se push ke waqt snippet file automatically Code node mein inline ho jati hai.

---

## React app ↔ n8n webhook

Webhook workflow push + activate ke baad:

1. n8n UI → workflow → Webhook node → **Production URL** copy karo
2. `.env` mein set karo:

```env
VITE_N8N_AUDIT_WEBHOOK_URL=https://lifesolvenow.onrender.com/webhook/...
VITE_N8N_ERROR_WEBHOOK_URL=https://lifesolvenow.onrender.com/webhook/...
```

> `-test` URLs sirf development ke liye; production mein `/webhook/` (bina `-test`) use karo.

---

## Naye automation ka quick checklist

- [ ] `n8n/workflows/<slug>.json` banao
- [ ] Zarurat ho to `n8n/snippets/<name>.js` banao
- [ ] `workflows-manifest.json` mein entry
- [ ] `npm run n8n:push -- <slug>`
- [ ] Webhook ho to `.env` mein `VITE_N8N_*_WEBHOOK_URL` update
- [ ] n8n par credentials (Supabase, Telegram) ek baar UI se set — API se secrets push mat karo

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `N8N_API_KEY missing` | `.env` mein key add karo |
| `401 unauthorized` | Galat key type (`rnd_` = wrong). n8n → Settings → **n8n API** se nayi key |
| Key `rnd_` se start | Yeh n8n API key nahi — UI se sahi key copy karo |
| Render API disabled | Render env: `N8N_PUBLIC_API_DISABLED` hatao ya `false` set karo |
| Webhook 404 | Workflow activate nahi — `npm run n8n:push` (activate: true) |
| Render sleep | Pehli request slow — Render free tier cold start |
