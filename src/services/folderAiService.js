import { isSupabaseConfigured } from '../supabaseClient'
import {
  getWorkflow,
  listWorkflowSteps,
  updateWorkflow,
  updateWorkflowRun,
} from './folderService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

async function callFolderAi(body) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL / anon key missing')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/folder-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || `folder-ai failed (${res.status})`)
  }
  return data
}

export async function runFolderAiAction({ folderId, workflowId, action, stepId, inputJson, runId }) {
  return callFolderAi({ folderId, workflowId, action, stepId, inputJson, runId })
}

export async function orchestrateWorkflowOnce(workflowId, folderId) {
  if (!isSupabaseConfigured) return { skipped: true }

  const workflow = await getWorkflow(workflowId)
  if (!workflow) return { skipped: true }
  if (workflow.status !== 'generating') return { skipped: true }

  const stage = workflow.generation_stage

  try {
    if (stage === 'analyzing') {
      const result = await callFolderAi({ folderId, workflowId, action: 'analyze' })
      return { stage: 'analyzing', ...result }
    }

    if (stage === 'building_steps') {
      const steps = await listWorkflowSteps(workflowId)
      const pending = steps.find((s) => s.status === 'pending')
      if (!pending) {
        await updateWorkflow(workflowId, { generationStage: 'compiling' })
        return { stage: 'building_steps', advanced: 'compiling' }
      }
      const result = await callFolderAi({
        folderId,
        workflowId,
        action: 'build_step',
        stepId: pending.id,
      })
      return { stage: 'building_steps', stepId: pending.id, ...result }
    }

    if (stage === 'compiling') {
      const result = await callFolderAi({ folderId, workflowId, action: 'compile' })
      return { stage: 'compiling', ...result }
    }

    return { skipped: true, stage }
  } catch (err) {
    await updateWorkflow(workflowId, {
      status: 'failed',
      generationStage: 'failed',
      errorMessage: err.message,
    })
    return { failed: true, error: err.message }
  }
}

export async function testWorkflowRun(folderId, workflowId, inputJson, runId) {
  const result = await callFolderAi({
    folderId,
    workflowId,
    action: 'test_run',
    inputJson,
    runId,
  })

  if (runId) {
    await updateWorkflowRun(runId, {
      status: result.ok ? 'completed' : 'failed',
      outputJson: result.output || result,
      errorMessage: result.error || null,
    })
  }

  return result
}

export async function regenerateStep(folderId, workflowId, stepId) {
  return callFolderAi({ folderId, workflowId, action: 'edit_step', stepId })
}

export function isGenerating(workflow) {
  return workflow?.status === 'generating' && !['idle', 'ready', 'failed'].includes(workflow?.generation_stage)
}
