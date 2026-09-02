import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { TOOLS_ROOT } from './env.mjs'

let db = null

export async function initFirebase(env) {
  if (db) return db
  const apiKey = env.VITE_FIREBASE_API_KEY
  if (!apiKey) throw new Error('VITE_FIREBASE_API_KEY missing — tools/.env ya GitHub secrets')

  const firebaseRoot = path.join(TOOLS_ROOT, 'node_modules', 'firebase')
  const { initializeApp } = await import(pathToFileURL(path.join(firebaseRoot, 'app', 'dist', 'esm', 'index.esm.js')).href)
  const { getFirestore, collection, getDocs, doc, setDoc, getDoc, query, orderBy, limit } = await import(
    pathToFileURL(path.join(firebaseRoot, 'firestore', 'dist', 'esm', 'index.esm.js')).href
  )

  const app = initializeApp({
    apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })

  db = {
    firestore: getFirestore(app),
    collection,
    getDocs,
    doc,
    setDoc,
    getDoc,
    query,
    orderBy,
    limit,
  }
  return db
}

function readLocalRegistryPages() {
  try {
    const regPath = path.join(TOOLS_ROOT, 'public', 'pages', 'index.json')
    if (existsSync(regPath)) {
      const data = JSON.parse(readFileSync(regPath, 'utf8'))
      return (data.pages || []).map((p) => ({
        id: p.slug,
        slug: p.slug,
        keyword: p.keyword,
        page_type: p.page_type || p.pageType,
        path: p.route,
        created_at: data.updated_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      }))
    }
  } catch (err) {
    console.warn(`[firebase] Failed reading local registry (${err.message})`)
  }
  return []
}

export async function listKeywordPages(env, max = 500) {
  try {
    const f = await initFirebase(env)
    const q = f.query(f.collection(f.firestore, 'keyword_pages'), f.orderBy('updated_at', 'desc'), f.limit(max))
    const snap = await f.getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.warn(`[firebase] Firestore list failed (${err.message}) — falling back to local registry`)
    return readLocalRegistryPages()
  }
}

export function pagesCreatedInLast24h(rows) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  return (rows || []).filter((r) => {
    const t = r.created_at ? new Date(r.created_at).getTime() : 0
    return t >= cutoff
  })
}

export async function upsertKeywordPage(env, row) {
  try {
    const f = await initFirebase(env)
    const now = new Date().toISOString()
    const ref = f.doc(f.firestore, 'keyword_pages', row.slug)
    const existing = await f.getDoc(ref)
    await f.setDoc(ref, {
      ...row,
      created_at: existing.exists() ? existing.data().created_at : now,
      updated_at: now,
      source: 'daily-automation',
    })
    return { slug: row.slug, created: !existing.exists(), firestore: true }
  } catch (err) {
    console.warn(`[firebase] Firestore upsert skipped (${err.message}) — continuing with static registry`)
    return { slug: row.slug, created: true, firestore: false }
  }
}
