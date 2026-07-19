# Competitor Raw Data (no AI)

100% raw scrape — no Gemini, no OpenAI.

## What you get per keyword

| Raw field | Source |
|-----------|--------|
| Google rank (ours vs competitor) | Serper / SerpAPI / free SERP fallback |
| Page URL + title | HTTP fetch |
| Word count, H2/H3 count | HTML text extract |
| Keyword density, in title/H1 | Regex metrics |
| FAQ / table / schema / video | HTML signals |
| Image alt count | `<img alt>` parse |
| Domain age | RDAP (free) |
| Headings list | H1/H2/H3 scrape |
| Metric gaps | Code diff (ours vs theirs) |

## SERP — why competitor tab empty?

Render (n8n) shared IP se **free Bing/Google scrape** often block ho jata hai.

**Recommended fix:** [Serper.dev](https://serper.dev) — 2,500 free Google searches/month.

```bash
# Render → Environment (n8n service)
SERPER_API_KEY=your-serper-key
```

Phir site par **Re-audit** chalao.

Optional fallback: `SERP_API_KEY` (SerpAPI).

## Pipeline

```
Keywords Rank → Competitor Analysis (raw) → AEO/GEO → Action Plan → Save
```

**AI Gap Agent is bypassed** — faster, no LLM keys.

## Deploy

```bash
npm run n8n:push -- website_audit
```

## Test SERP locally

```bash
SERPER_API_KEY=xxx node scripts/test-serp.mjs "your keyword"
```

## UI

`/audit/competitors` — raw comparison table + headings + metric gaps.
