#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getWorkflow } from './n8n-api.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[k]) process.env[k] = v
  }
}

const w = await getWorkflow('LcWsAcUygnLnqMGP')
console.log('active:', w.active, 'nodes:', w.nodes.length)
for (const n of w.nodes) {
  if (n.type.includes('code')) {
    console.log(`  ${n.name}: ${(n.parameters?.jsCode || '').length} bytes`)
  }
}
