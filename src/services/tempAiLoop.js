/**
 * /temp AI loop — task → model assign; busy / daily-limit pe wait, phir run.
 * Keys kabhi browser me nahi — sirf Edge Function TEMP_GOOGLE_API_KEY1–3.
 */

import { preferredModelsForTask, getTempModel, TEMP_AI_MODELS } from '../data/tempAiModels'
import { fetchTempModelUsage } from './tempDbService'

const STORAGE_KEY = 'temp-ai-usage-v1'
const BUSY_POLL_MS = 1500
const LIMIT_POLL_MS = 5000

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { day: todayKey(), usage: {}, busy: {} }
    const parsed = JSON.parse(raw)
    if (parsed.day !== todayKey()) {
      return { day: todayKey(), usage: {}, busy: {} }
    }
    return { day: parsed.day, usage: parsed.usage || {}, busy: parsed.busy || {} }
  } catch {
    return { day: todayKey(), usage: {}, busy: {} }
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function getTempModelUsageSnapshot() {
  const state = loadState()
  const ids = new Set([
    ...Object.keys(state.usage),
    ...Object.keys(state.busy),
    ...TEMP_AI_MODELS.map((m) => m.id),
  ])
  return {
    day: state.day,
    models: Object.fromEntries(
      [...ids].map((id) => {
        const model = getTempModel(id)
        const used = state.usage[id] || 0
        const rpd = model?.rpd ?? 1500
        return [
          id,
          {
            usedToday: used,
            remaining: Math.max(0, rpd - used),
            busy: Boolean(state.busy[id]),
            rpd,
            rpm: model?.rpm ?? 15,
          },
        ]
      })
    ),
  }
}

/** Supabase temp_model_usage → local state (teammate shared DB) */
export async function hydrateTempUsageFromSupabase() {
  try {
    const remote = await fetchTempModelUsage()
    if (!Object.keys(remote).length) return
    const state = loadState()
    for (const [modelId, count] of Object.entries(remote)) {
      state.usage[modelId] = Math.max(state.usage[modelId] || 0, count)
    }
    saveState(state)
  } catch {
    /* offline / migration pending */
  }
}

function markBusy(modelId, busy) {
  const state = loadState()
  if (busy) state.busy[modelId] = true
  else delete state.busy[modelId]
  saveState(state)
}

function incrementUsage(modelId) {
  const state = loadState()
  state.usage[modelId] = (state.usage[modelId] || 0) + 1
  saveState(state)
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

/**
 * Pick first preferred model that is free + under daily limit.
 * If all busy/limited → wait and retry.
 */
export async function acquireModelForTask(taskType, { onStatus, signal } = {}) {
  const candidates = preferredModelsForTask(taskType)
  if (!candidates.length) throw new Error('Koi model map nahi mila is task ke liye')

  while (!signal?.aborted) {
    const state = loadState()
    for (const model of candidates) {
      const used = state.usage[model.id] || 0
      const busy = Boolean(state.busy[model.id])
      if (busy) continue
      if (used >= model.rpd) continue

      markBusy(model.id, true)
      onStatus?.({
        phase: 'acquired',
        modelId: model.id,
        label: model.label,
        usedToday: used,
        remaining: model.rpd - used,
      })
      return model
    }

    const anyBusy = candidates.some((m) => state.busy[m.id])
    const allLimited = candidates.every((m) => (state.usage[m.id] || 0) >= m.rpd)

    if (allLimited) {
      onStatus?.({
        phase: 'waiting_limit',
        message: 'Saare preferred models daily limit pe — reset (midnight PT) ka wait, ya neeche fallback try',
      })
      // Try any other free-tier model under limit
      const fallback = preferredModelsForTask('general').find((m) => {
        const used = state.usage[m.id] || 0
        return !state.busy[m.id] && used < m.rpd
      })
      if (fallback) {
        markBusy(fallback.id, true)
        onStatus?.({
          phase: 'acquired',
          modelId: fallback.id,
          label: fallback.label,
          usedToday: state.usage[fallback.id] || 0,
          remaining: fallback.rpd - (state.usage[fallback.id] || 0),
          fallback: true,
        })
        return fallback
      }
      await sleep(LIMIT_POLL_MS, signal)
      continue
    }

    onStatus?.({
      phase: 'waiting_busy',
      message: anyBusy
        ? 'Preferred model busy hai — free hone ka wait…'
        : 'Model slot free nahi — wait…',
    })
    await sleep(BUSY_POLL_MS, signal)
  }

  throw new DOMException('Aborted', 'AbortError')
}

export function releaseModel(modelId, { countUsage = true } = {}) {
  if (countUsage) incrementUsage(modelId)
  markBusy(modelId, false)
}
