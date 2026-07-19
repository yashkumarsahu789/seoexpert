#!/usr/bin/env node
/**
 * Daily keyword page automation — no n8n
 * 1. Pick keyword (seeds + Google suggest)
 * 2. SERP top URL (Bing / optional SerpAPI)
 * 3. AI brief → design → SEO (Groq) OR template
 * 4. Save React config → Firebase
 * 5. Update tools/public/pages registry + sitemap
 * 6. Ping Google/Bing sitemap
 *
 * Usage:
 *   node scripts/daily-keyword-page.mjs
 *   node scripts/daily-keyword-page.mjs --dry-run
 *   node scripts/daily-keyword-page.mjs --force
 *   node scripts/daily-keyword-page.mjs --keyword="bmi calculator"
 *   node scripts/daily-keyword-page.mjs --no-ai
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { slugify } from '../tools/lib/page-generator.mjs'
import { buildPagesSitemapXml, buildRobotsTxt } from '../tools/lib/seo-trends.mjs'
import { loadAutomationEnv, automationConfig, REPO_ROOT } from '../tools/lib/automation/env.mjs'
import { collectKeywordCandidates, serpTopUrl } from '../tools/lib/automation/serp.mjs'
import { listKeywordPages, pagesCreatedInLast24h, upsertKeywordPage } from '../tools/lib/automation/firebase.mjs'
import { runPageIntelligenceNode, runTemplatePageNode } from '../tools/lib/automation/page-intelligence.mjs'
import { pingSitemap } from '../tools/lib/automation/indexing.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PAGES_DIR = path.join(REPO_ROOT, 'tools', 'public', 'pages')
const SEEDS_PATH = path.join(REPO_ROOT, 'n8n', 'data', 'keyword-seeds.json')

function parseArgs(argv) {
  const out = { dryRun: false, force: false, noAi: false, keyword: '' }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--force') out.force = true
    else if (arg === '--no-ai') out.noAi = true
    else if (arg.startsWith('--keyword=')) out.keyword = arg.slice('--keyword='.length).trim()
  }
  return out
}

function shouldSkipKeyword(kw, skipList) {
  const lower = kw.toLowerCase()
  return skipList.some((s) => lower.includes(s))
}

function configToRow(config) {
  return {
    slug: config.slug,
    keyword: config.keyword,
    page_type: config.pageType,
    tool_type: config.toolType,
    serp_top_url: config.serpTopUrl,
    theme_id: config.theme?.id,
    config,
    public_url: config.publicUrl,
    path: config.route,
    intelligence: config.intelligence || null,
    used_ai: Boolean(config.intelligence),
  }
}

async function updateStaticRegistry(allPages, cfg) {
  await mkdir(PAGES_DIR, { recursive: true })
  const registry = {
    updated_at: new Date().toISOString(),
    source: 'daily-automation',
    pages: allPages.map((p) => ({
      slug: p.slug,
      keyword: p.keyword,
      page_type: p.page_type || p.pageType,
      route: p.path || `/p/${p.slug}`,
      public_url: p.public_url || `${cfg.appPublicBase}/p/${p.slug}`,
    })),
  }
  await writeFile(path.join(PAGES_DIR, 'index.json'), JSON.stringify(registry, null, 2))

  const urls = registry.pages.map((p) => p.public_url || `${cfg.publicBase}/${p.slug}`)
  const sitemapXml = buildPagesSitemapXml(urls, cfg.publicBase)
  const robotsTxt = buildRobotsTxt(`${cfg.publicBase}/sitemap.xml`)
  await writeFile(path.join(PAGES_DIR, 'sitemap.xml'), sitemapXml)
  await writeFile(path.join(PAGES_DIR, 'robots.txt'), robotsTxt)

  return { registry, sitemapUrl: `${cfg.publicBase}/sitemap.xml` }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = loadAutomationEnv()
  const cfg = automationConfig(env)

  const seeds = JSON.parse(await readFile(SEEDS_PATH, 'utf8'))
  const existingRows = await listKeywordPages(env)
  const existingSlugs = new Set(existingRows.map((r) => r.slug))

  if (!args.force && !args.dryRun) {
    const recent = pagesCreatedInLast24h(existingRows)
    if (recent.length >= cfg.dailyMax) {
      const last = recent[0]
      console.log(
        JSON.stringify(
          {
            ok: true,
            skipped: true,
            reason: 'daily_limit',
            message: `Last 24h me ${recent.length} page — max ${cfg.dailyMax}/day`,
            lastPage: last ? { keyword: last.keyword, slug: last.slug, at: last.created_at } : null,
          },
          null,
          2
        )
      )
      return
    }
  }

  let keyword = args.keyword
  if (!keyword) {
    const candidates = await collectKeywordCandidates(seeds)
    keyword = candidates.find((k) => {
      if (shouldSkipKeyword(k, cfg.skipKeywords)) return false
      return !existingSlugs.has(slugify(k))
    })
  }

  if (!keyword) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'no_new_keyword' }, null, 2))
    return
  }

  if (existingSlugs.has(slugify(keyword)) && !args.force) {
    console.log(JSON.stringify({ ok: true, skipped: true, reason: 'already_exists', keyword }, null, 2))
    return
  }

  console.log(`→ Keyword: ${keyword}`)
  const topUrl = await serpTopUrl(keyword, { serpApiKey: cfg.serpApiKey, serperApiKey: cfg.serperApiKey })
  if (topUrl) console.log(`→ SERP top: ${topUrl}`)

  const useAi = cfg.useAi && !args.noAi
  const { config, intelligence } = useAi
    ? await runPageIntelligenceNode(keyword, topUrl, env)
    : await runTemplatePageNode(keyword, topUrl)

  const row = configToRow(config)

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          keyword,
          slug: config.slug,
          pageType: config.pageType,
          theme: config.theme?.id,
          usedAi: useAi,
          serpTopUrl: topUrl,
          purpose: intelligence?.brief?.purpose || null,
        },
        null,
        2
      )
    )
    return
  }

  await upsertKeywordPage(env, row)
  console.log(`✓ Firebase saved: /p/${config.slug}`)

  const mergedPages = [
    row,
    ...existingRows.filter((r) => r.slug !== row.slug),
  ]
  const { sitemapUrl } = await updateStaticRegistry(mergedPages, cfg)
  console.log(`✓ Registry + sitemap updated (${mergedPages.length} pages)`)

  const ping = await pingSitemap(sitemapUrl)
  console.log(`✓ Indexing ping: google=${ping.google} bing=${ping.bing}`)

  console.log(
    JSON.stringify(
      {
        ok: true,
        keyword,
        slug: config.slug,
        pageType: config.pageType,
        theme: config.theme?.id,
        usedAi: useAi,
        publicUrl: row.public_url,
        liveRoute: `${cfg.appPublicBase}/p/${config.slug}`,
        purpose: intelligence?.brief?.purpose || null,
        indexing: ping,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message }, null, 2))
  process.exit(1)
})
