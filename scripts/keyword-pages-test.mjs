#!/usr/bin/env node
/** Generate sample keyword pages locally (no n8n / no GitHub) */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatePage } from '../tools/lib/page-generator.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PAGES_DIR = path.join(ROOT, 'tools', 'public', 'pages')
const SEEDS_PATH = path.join(ROOT, 'n8n', 'data', 'keyword-seeds.json')

async function main() {
  const seeds = JSON.parse(await readFile(SEEDS_PATH, 'utf8'))
  const sample = seeds.slice(0, 6)
  await mkdir(PAGES_DIR, { recursive: true })

  const registry = { updated_at: new Date().toISOString(), pages: [] }

  for (const keyword of sample) {
    const page = generatePage(keyword)
    const file = path.join(PAGES_DIR, `${page.slug}.html`)
    await writeFile(file, page.html, 'utf8')
    registry.pages.push({
      slug: page.slug,
      keyword,
      page_type: page.pageType,
      path: `/pages/${page.slug}.html`,
    })
    console.log(`✓ ${page.pageType.padEnd(5)} ${keyword} → pages/${page.slug}.html`)
  }

  await writeFile(path.join(PAGES_DIR, 'index.json'), JSON.stringify(registry, null, 2))
  console.log(`\nGenerated ${registry.pages.length} pages in tools/public/pages/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
