import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../firebaseClient'

const TASKS = 'ai_center_tasks'
const USAGE = 'ai_agent_usage'
const PAGES = 'keyword_pages'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function mapTaskDoc(id, data) {
  return {
    id,
    task_type: data.task_type,
    title: data.title || '',
    input_text: data.input_text || '',
    estimated_calls: data.estimated_calls ?? 1,
    github_repo: data.github_repo ?? null,
    github_path: data.github_path ?? null,
    status: data.status || 'queued',
    created_at: data.created_at,
    updated_at: data.updated_at,
    assigned_agent_id: data.assigned_agent_id ?? null,
    output_text: data.output_text ?? null,
    decline_log: data.decline_log || [],
    github_committed_at: data.github_committed_at ?? null,
  }
}

export async function listFirestoreTasks(max = 30) {
  if (!isFirebaseConfigured) return []
  const q = query(collection(db, TASKS), orderBy('created_at', 'desc'), limit(max))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapTaskDoc(d.id, d.data()))
}

export async function createFirestoreTask(task) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const now = new Date().toISOString()
  const payload = {
    ...task,
    status: task.status || 'queued',
    decline_log: task.decline_log || [],
    created_at: now,
    updated_at: now,
  }
  const ref = await addDoc(collection(db, TASKS), payload)
  return mapTaskDoc(ref.id, payload)
}

export async function patchFirestoreTask(id, patch) {
  if (!isFirebaseConfigured) return
  const ref = doc(db, TASKS, String(id))
  await updateDoc(ref, { ...patch, updated_at: new Date().toISOString() })
}

export async function deleteAllFirestoreTasks() {
  if (!isFirebaseConfigured) return
  const snap = await getDocs(collection(db, TASKS))
  if (!snap.empty) {
    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

export async function getFirestoreUsageToday() {
  if (!isFirebaseConfigured) return {}
  const date = todayKey()
  const q = query(collection(db, USAGE), where('usage_date', '==', date))
  const snap = await getDocs(q)
  const usage = {}
  snap.docs.forEach((d) => {
    const data = d.data()
    if (data.agent_id) usage[data.agent_id] = data.calls_used || 0
  })
  return usage
}

export async function incrementFirestoreUsage(agentId, calls = 1) {
  if (!isFirebaseConfigured) return
  const date = todayKey()
  const docId = `${date}_${agentId}`
  const ref = doc(db, USAGE, docId)
  const existing = await getDoc(ref)
  const current = existing.exists() ? existing.data().calls_used || 0 : 0
  await setDoc(ref, {
    agent_id: agentId,
    usage_date: date,
    calls_used: current + calls,
    updated_at: new Date().toISOString(),
  })
}

export async function listFirestorePages() {
  if (!isFirebaseConfigured) return []
  const q = query(collection(db, PAGES), orderBy('updated_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getFirestorePage(slug) {
  if (!isFirebaseConfigured) return null
  const ref = doc(db, PAGES, slug)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function upsertFirestorePage(page) {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured')
  const now = new Date().toISOString()
  const ref = doc(db, PAGES, page.slug)
  const existing = await getDoc(ref)
  const payload = {
    slug: page.slug,
    keyword: page.keyword,
    page_type: page.page_type,
    tool_type: page.tool_type ?? null,
    serp_top_url: page.serp_top_url ?? null,
    theme_id: page.theme_id ?? page.config?.theme?.id ?? null,
    config: page.config ?? null,
    html: page.html ?? null,
    public_url: page.public_url || null,
    path: page.path || `/p/${page.slug}`,
    created_at: existing.exists() ? existing.data().created_at : now,
    updated_at: now,
  }
  await setDoc(ref, payload)
  return payload
}

export async function deleteFirestorePage(slug) {
  if (!isFirebaseConfigured) return
  await deleteDoc(doc(db, PAGES, slug))
}
