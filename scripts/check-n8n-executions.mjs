#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (existsSync(path.join(root, '.env'))) {
  for (const line of readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
}

const base = (process.env.N8N_API_URL || 'https://lifesolvenow.onrender.com').replace(/\/$/, '')
const key = process.env.N8N_API_KEY

const res = await fetch(`${base}/api/v1/executions?workflowId=LcWsAcUygnLnqMGP&limit=3&includeData=true`, {
  headers: { 'X-N8N-API-KEY': key, Accept: 'application/json' },
})
const data = await res.json()
for (const ex of data.data || []) {
  console.log('---', ex.id, ex.status, ex.startedAt, ex.stoppedAt)
  const runData = ex.data?.resultData?.runData || {}
  for (const [node, runs] of Object.entries(runData)) {
    const last = runs?.[runs.length - 1]
    if (last?.error) console.log(' ERROR', node, last.error.message)
  }
}
