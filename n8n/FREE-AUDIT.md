# Free Audit Engine (no paid keys required)

Default pipeline uses **100% free** data sources inside n8n:

| Old paid key | Free replacement in pipeline |
|--------------|------------------------------|
| `PAGESPEED_API_KEY` | HTML heuristic (`freeHeuristicPerformance`) — Lighthouse-style scores from page HTML + fetch time |
| `SERP_API_KEY` | Google SERP HTML scrape + regex parse (`freeSerpSearch`) |
| `DATAFORSEO_LOGIN/PASSWORD` | Google Autocomplete API (`suggestqueries.google.com`) + volume proxy |

Paid keys are **optional fallbacks only** — if set on Render, they override free engine.

## Only key needed later (optional)

```
OPENAI_API_KEY=     # AI keyword seeds + gap agent (skip works fine)
OPENAI_MODEL=gpt-4o-mini
```

## Deploy after snippet changes

```bash
npm run n8n:push -- website_audit
```

## Note on Lighthouse / Crawlee

Full `lighthouse` npm and `crawlee` need Node + Chrome — they don't run inside n8n Code nodes on Render. We use equivalent **free heuristics + HTTP crawl** already in the pipeline. For true Lighthouse, add a separate worker later.
