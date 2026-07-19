#!/usr/bin/env node
/** Seed 1st React keyword page config → Firebase (+ optional static registry) */
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PAGES_DIR = path.join(ROOT, 'tools', 'public', 'pages')
const SEEDS_PATH = path.join(ROOT, 'n8n', 'data', 'keyword-seeds.json')

async function loadBuildPageConfig() {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tools', 'src', 'lib', 'pageConfig.js')).href)
  return mod.buildPageConfig
}

function loadToolsEnv() {
  const envPath = path.join(ROOT, 'tools', '.env')
  if (!existsSync(envPath)) return {}
  const out = {}
  for (const line of readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return out
}

function pickFirstKeyword(seeds) {
  const skip = /^chatgpt|openai chatgpt/i
  return seeds.find((k) => !skip.test(k)) || seeds[0]
}

async function seedFirebase(row) {
  const env = loadToolsEnv()
  if (!env.VITE_FIREBASE_API_KEY) return false
  const firebaseRoot = path.join(ROOT, 'tools', 'node_modules', 'firebase')
  const { initializeApp } = await import(pathToFileURL(path.join(firebaseRoot, 'app', 'dist', 'esm', 'index.esm.js')).href)
  const { getFirestore, doc, setDoc, getDoc } = await import(
    pathToFileURL(path.join(firebaseRoot, 'firestore', 'dist', 'esm', 'index.esm.js')).href
  )
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  const db = getFirestore(app)
  const now = new Date().toISOString()
  const ref = doc(db, 'keyword_pages', row.slug)
  const existing = await getDoc(ref)
  await setDoc(ref, {
    ...row,
    created_at: existing.exists() ? existing.data().created_at : now,
    updated_at: now,
  })
  return true
}

async function main() {
  const buildPageConfig = await loadBuildPageConfig()
  const seeds = JSON.parse(await readFile(SEEDS_PATH, 'utf8'))
  const keyword = pickFirstKeyword(seeds)
  const config = buildPageConfig(keyword)

  const row = {
    slug: config.slug,
    keyword: config.keyword,
    page_type: config.pageType,
    tool_type: config.toolType,
    serp_top_url: config.serpTopUrl,
    theme_id: config.theme.id,
    config,
    public_url: config.publicUrl,
    path: config.route,
  }

  await mkdir(PAGES_DIR, { recursive: true })
  await writeFile(
    path.join(PAGES_DIR, 'index.json'),
    JSON.stringify(
      {
        updated_at: new Date().toISOString(),
        pages: [{ slug: config.slug, keyword, page_type: config.pageType, route: config.route }],
      },
      null,
      2
    )
  )

  let firebaseOk = false
  try {
    firebaseOk = await seedFirebase(row)
  } catch (err) {
    console.log(`⚠ Firestore: ${err.message}`)
  }

  console.log(`✓ React page "${keyword}" → /p/${config.slug} (theme: ${config.theme.id})`)
  console.log(`  Firebase: ${firebaseOk ? 'saved' : 'skipped'}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
