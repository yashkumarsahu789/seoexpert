#!/usr/bin/env node
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  activateWorkflow,
  createWorkflow,
  getN8nConfig,
  getWorkflow,
  listWorkflows,
  updateWorkflow,
  validateApiKey,
} from './n8n-api.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const WORKFLOWS_DIR = path.join(ROOT, 'n8n', 'workflows')
const SNIPPETS_DIR = path.join(ROOT, 'n8n', 'snippets')
const MANIFEST_PATH = path.join(ROOT, 'n8n', 'workflows-manifest.json')

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env')
  if (!existsSync(envPath)) return
  const raw = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

loadDotEnv()

async function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    return { version: 1, workflows: {} }
  }
  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'))
}

async function writeManifest(manifest) {
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function stripForApi(workflowDoc) {
  const { _meta, id, active, createdAt, updatedAt, versionId, meta, tags, pinData, ...rest } =
    workflowDoc
  return rest
}

async function inlineSnippets(workflowDoc) {
  const refs = workflowDoc._meta?.snippetRefs
  if (!refs) return workflowDoc

  const nodes = workflowDoc.nodes.map((node) => {
    const snippetFile = refs[node.name]
    if (!snippetFile) return node
    const snippetPath = path.join(SNIPPETS_DIR, snippetFile.replace(/^snippets\//, ''))
    if (!existsSync(snippetPath)) {
      throw new Error(`Snippet missing for node "${node.name}": ${snippetPath}`)
    }
    let code = readFileSync(snippetPath, 'utf8')
    if (code.includes('@inject-free-audit-utils')) {
      const utilsPath = path.join(SNIPPETS_DIR, '_free-audit-utils.js')
      if (existsSync(utilsPath)) {
        const utils = readFileSync(utilsPath, 'utf8').replace(/^\/\/ @inject-free-audit-utils[^\n]*\n/, '')
        code = utils + '\n' + code
      }
    }
    if (code.includes('@inject-page-generator')) {
      const pgPath = path.join(ROOT, 'tools', 'lib', 'page-generator.mjs')
      if (existsSync(pgPath)) {
        let pg = readFileSync(pgPath, 'utf8').replace(/^\/\/[^\n]*\n/, '')
        pg = pg.replace(/export const /g, 'const ')
        pg = pg.replace(/export function /g, 'function ')
        code = code.replace(/\/\/ @inject-page-generator[^\n]*\n?/, '')
        code = pg + '\n' + code
      }
    }
    if (code.includes('@inject-seo-trends')) {
      const seoPath = path.join(ROOT, 'tools', 'lib', 'seo-trends.mjs')
      if (existsSync(seoPath)) {
        let seo = readFileSync(seoPath, 'utf8').replace(/^\/\/[^\n]*\n/, '')
        seo = seo.replace(/export const /g, 'const ')
        seo = seo.replace(/export function /g, 'function ')
        code = code.replace(/\/\/ @inject-seo-trends[^\n]*\n?/, '')
        code = seo + '\n' + code
      }
    }
    if (code.includes('${BASELINE_JSON}')) {
      const baselinePath = path.join(ROOT, 'n8n', 'data', 'requirements-baseline.json')
      const baseline = existsSync(baselinePath) ? readFileSync(baselinePath, 'utf8') : '[]'
      code = code.replace('${BASELINE_JSON}', baseline)
    }
    if (code.includes('${SEED_KEYWORDS_JSON}')) {
      const seedsPath = path.join(ROOT, 'n8n', 'data', 'keyword-seeds.json')
      const seeds = existsSync(seedsPath) ? readFileSync(seedsPath, 'utf8') : '[]'
      code = code.replace('${SEED_KEYWORDS_JSON}', seeds)
    }
    return {
      ...node,
      parameters: {
        ...node.parameters,
        jsCode: code,
      },
    }
  })

  return { ...workflowDoc, nodes }
}

async function loadLocalWorkflow(fileName) {
  const filePath = path.join(WORKFLOWS_DIR, fileName)
  const raw = JSON.parse(await readFile(filePath, 'utf8'))
  return inlineSnippets(raw)
}

function saveLocalWorkflow(fileName, remoteWorkflow) {
  const filePath = path.join(WORKFLOWS_DIR, fileName)
  const local = {
    _meta: {
      id: fileName.replace(/\.json$/, ''),
      description: remoteWorkflow.name,
      activate: Boolean(remoteWorkflow.active),
      n8nId: remoteWorkflow.id,
    },
    name: remoteWorkflow.name,
    nodes: remoteWorkflow.nodes,
    connections: remoteWorkflow.connections,
    settings: remoteWorkflow.settings || { executionOrder: 'v1' },
  }
  writeFileSync(filePath, `${JSON.stringify(local, null, 2)}\n`, 'utf8')
}

async function cmdList() {
  const res = await listWorkflows()
  const items = res.data || res
  console.log('\nn8n workflows:\n')
  for (const wf of items) {
    console.log(`  ${wf.active ? '●' : '○'} ${wf.id}  ${wf.name}`)
  }
  console.log('')
}

async function cmdPull(targetId) {
  const manifest = await readManifest()

  if (targetId) {
    const remote = await getWorkflow(targetId)
    const slug = remote.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const fileName = `${slug || 'workflow'}.json`
    saveLocalWorkflow(fileName, remote)
    manifest.workflows[slug || 'workflow'] = {
      file: fileName,
      n8nId: remote.id,
      name: remote.name,
    }
    await writeManifest(manifest)
    console.log(`Pulled → n8n/workflows/${fileName}`)
    return
  }

  const res = await listWorkflows()
  const items = res.data || res
  for (const wf of items) {
    const remote = await getWorkflow(wf.id)
    const slug = remote.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const fileName = `${slug}.json`
    saveLocalWorkflow(fileName, remote)
    manifest.workflows[slug] = { file: fileName, n8nId: remote.id, name: remote.name }
    console.log(`Pulled ${remote.name}`)
  }
  await writeManifest(manifest)
}

async function cmdPush(targetSlug) {
  const manifest = await readManifest()
  const files = (await readdir(WORKFLOWS_DIR)).filter((f) => f.endsWith('.json'))

  for (const fileName of files) {
    const slug = fileName.replace(/\.json$/, '')
    if (targetSlug && slug !== targetSlug) continue

    const doc = await loadLocalWorkflow(fileName)
    const payload = stripForApi(doc)
    const entry = manifest.workflows[slug]
    let n8nId = entry?.n8nId || doc._meta?.n8nId

    let remote
    if (n8nId) {
      try {
        remote = await updateWorkflow(n8nId, payload)
        console.log(`Updated: ${payload.name} (${n8nId})`)
      } catch (err) {
        if (err.status === 404) {
          remote = await createWorkflow(payload)
          n8nId = remote.id
          console.log(`Re-created (old id missing): ${payload.name} (${n8nId})`)
        } else {
          throw err
        }
      }
    } else {
      remote = await createWorkflow(payload)
      n8nId = remote.id
      console.log(`Created: ${payload.name} (${n8nId})`)
    }

    manifest.workflows[slug] = {
      file: fileName,
      n8nId,
      name: payload.name,
    }

    const shouldActivate = doc._meta?.activate !== false
    if (shouldActivate && !remote.active) {
      await activateWorkflow(n8nId)
      console.log(`  Activated: ${payload.name}`)
    }
  }

  await writeManifest(manifest)
  console.log('\nDone. Manifest updated.')
}

async function cmdExport(targetSlug) {
  const files = (await readdir(WORKFLOWS_DIR)).filter((f) => f.endsWith('.json'))
  const outDir = path.join(ROOT, 'n8n', 'export')
  if (!existsSync(outDir)) {
    const { mkdirSync } = await import('node:fs')
    mkdirSync(outDir, { recursive: true })
  }
  for (const fileName of files) {
    const slug = fileName.replace(/\.json$/, '')
    if (targetSlug && slug !== targetSlug) continue
    const doc = await loadLocalWorkflow(fileName)
    const payload = stripForApi(doc)
    const outPath = path.join(outDir, fileName)
    writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    console.log(`Exported → n8n/export/${fileName} (n8n UI → Import from File)`)
  }
}

async function cmdCheck() {
  validateApiKey(process.env.N8N_API_KEY)
  const { baseUrl } = getN8nConfig()
  const res = await listWorkflows()
  const items = res.data || res
  console.log(`OK — connected to ${baseUrl}`)
  console.log(`Workflows on server: ${Array.isArray(items) ? items.length : '?'}`)
}

function printHelp() {
  console.log(`
n8n sync — Cursor se n8n Render par deploy

Usage:
  node scripts/n8n-sync.mjs check
  node scripts/n8n-sync.mjs list
  node scripts/n8n-sync.mjs pull [workflowId]
  node scripts/n8n-sync.mjs push [slug]
  node scripts/n8n-sync.mjs export [slug]

Env (.env):
  N8N_API_URL=https://lifesolvenow.onrender.com
  N8N_API_KEY=eyJ... ya n8n_api_...   (Settings → n8n API)

Examples:
  npm run n8n:check
  npm run n8n:pull -- tzQVzirqMc3lD7UN
  npm run n8n:push
  npm run n8n:push -- website_audit
`)
}

const [cmd, arg] = process.argv.slice(2)

async function main() {
  if (cmd === 'check') await cmdCheck()
  else if (cmd === 'list') await cmdList()
  else if (cmd === 'pull') await cmdPull(arg)
  else if (cmd === 'push') await cmdPush(arg)
  else if (cmd === 'export') await cmdExport(arg)
  else printHelp()
}

main()
  .catch((err) => {
    console.error(`\nError: ${err.message}`)
    if (err.status === 401) {
      console.error(
        '\n401 fix:\n' +
          '  1. n8n → Settings → n8n API → nayi API key banao\n' +
          '  2. Key "eyJ" ya "n8n_api_" se start honi chahiye\n' +
          '  3. Render par N8N_PUBLIC_API_DISABLED=true na ho\n' +
          '  4. npm run n8n:check dubara chalao'
      )
    }
    if (err.data) console.error(JSON.stringify(err.data, null, 2))
    process.exit(1)
  })
