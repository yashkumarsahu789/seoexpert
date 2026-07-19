#!/usr/bin/env node
/**
 * Apply migration 007 via Supabase CLI (remote linked project).
 * Requires: npx supabase login + supabase link --project-ref sbdlfyfkpatnxkrmslvq
 *
 * Or paste supabase/migrations/007_shop_indexing_rank.sql in Supabase Dashboard → SQL Editor.
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const migrationPath = path.join(ROOT, 'supabase/migrations/007_shop_indexing_rank.sql')

if (!existsSync(migrationPath)) {
  console.error('Missing', migrationPath)
  process.exit(1)
}

const sql = readFileSync(migrationPath, 'utf8')
console.log('Migration 007 — shop_rank_snapshots + indexing columns\n')
console.log('If CLI push fails, copy this file to Supabase SQL Editor:\n')
console.log(migrationPath)
console.log('')

const push = spawnSync('npx', ['supabase', 'db', 'push', '--include-all'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
})

if (push.status === 0) {
  console.log('\nMigration applied via supabase db push.')
  process.exit(0)
}

console.log('\nCLI push failed. Run this SQL manually in Supabase Dashboard → SQL Editor:\n')
console.log('---')
console.log(sql)
console.log('---')

process.exit(push.status ?? 1)
