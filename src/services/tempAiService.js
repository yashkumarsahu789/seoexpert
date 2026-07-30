import { acquireModelForTask, releaseModel } from './tempAiLoop'
import {
  fetchTempModelUsage,
  incrementTempModelUsage,
  insertTempRun,
  updateTempRun,
} from './tempDbService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

async function callTempAi(body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase missing — temp/.env me VITE_SUPABASE_* set karo')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/temp-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `temp-ai failed (${res.status})`)
  }
  return data
}

export async function checkTempAiSecrets() {
  return callTempAi({ action: 'check-secrets' })
}

export async function runTempAiTask({
  prompt,
  taskType = 'general',
  boxId = null,
  onStatus,
  signal,
} = {}) {
  if (!String(prompt || '').trim()) {
    throw new Error('Prompt empty hai')
  }

  let runRow = null
  try {
    runRow = await insertTempRun({
      box_id: boxId,
      task_type: taskType,
      prompt: String(prompt).trim(),
      status: 'waiting',
    })
  } catch {
    /* table missing — local-only fallback */
  }

  const model = await acquireModelForTask(taskType, { onStatus, signal })
  let counted = false

  try {
    if (runRow?.id) {
      await updateTempRun(runRow.id, {
        status: 'processing',
        model_id: model.id,
      })
    }

    onStatus?.({ phase: 'calling', modelId: model.id, label: model.label })
    const result = await callTempAi({
      action: 'generate',
      model: model.id,
      prompt: String(prompt).trim(),
      taskType,
    })
    counted = true

    await incrementTempModelUsage(model.id).catch(() => {})

    if (runRow?.id) {
      await updateTempRun(runRow.id, {
        status: 'completed',
        model_id: model.id,
        key_slot: result.keySlot,
        response_text: result.text,
      })
    }

    onStatus?.({
      phase: 'done',
      modelId: model.id,
      label: model.label,
      keySlot: result.keySlot,
      runId: runRow?.id,
    })

    return {
      text: result.text,
      modelId: model.id,
      modelLabel: model.label,
      keySlot: result.keySlot,
      runId: runRow?.id,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (runRow?.id) {
      await updateTempRun(runRow.id, {
        status: 'failed',
        model_id: model.id,
        error_message: message,
      }).catch(() => {})
    }
    onStatus?.({ phase: 'error', modelId: model.id, message })
    throw err
  } finally {
    releaseModel(model.id, { countUsage: counted })
  }
}

export { fetchTempModelUsage }

