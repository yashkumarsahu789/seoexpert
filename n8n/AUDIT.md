# Website Audit v3 — Primary Feature

## Architecture

```
Daily 5 AM  → Requirements Daily Sync (Official + Patents + Trackers → Supabase)
Daily 6 AM  → Website Audit Daily (all saved sites re-audit)
Manual/UI   → Website Audit webhook
```

## 4 transparent steps

| Step | What | n8n nodes |
|------|------|-----------|
| **1** | SEO / AEO / GEO separate checks vs daily requirements | Load Requirements → Check SEO → Check AEO → Check GEO |
| **2** | Keywords + search volume + **your rank** daily | Keyword Seeds → DataForSEO → Keywords Rank Check |
| **3** | Competitors same keyword + setup gap + beat plan | Competitor Analysis |
| **4** | AEO/GEO heuristics + merged action plan | AEO GEO Heuristics → Action Plan v3 |

## Requirement sources (3 types)

1. **Official** — Google Search Central, Bing, OpenAI GPTBot, Anthropic, llms.txt spec
2. **Patents** — Entity, freshness, answer-extraction signals (curated + updated)
3. **Trackers** — Schema.org, Search Engine Journal RSS, AI crawler lists

Stored in `audit_requirements`. Site results in `site_requirement_checks` with status:
`present` | `missing` | `needs_update` | `needs_remove`

## Supabase tables (migration 005)

- `audit_requirements` — daily rule catalog
- `requirement_sync_log` — sync history
- `site_requirement_checks` — per-audit transparent checks
- `keyword_rankings` — daily rank history
- `competitor_snapshots` — competitor setup vs gaps

## Deploy

```bash
npm run seed:requirements          # first time baseline
npm run n8n:push -- website_audit
npm run n8n:push -- requirements_daily_sync
npm run n8n:push -- website_audit_daily
```

## Render env

`SERP_API_KEY`, `DATAFORSEO_*`, `OPENAI_API_KEY`, `PAGESPEED_API_KEY`, `SUPABASE_*`

## UI

Primary route: `/` — Audit Hub with 4 step tabs, pillar breakdown, source badges.
