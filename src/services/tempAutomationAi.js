/**
 * Automations ke andar AI call — user-facing runner nahi.
 * Jab bhi nayi automation banegi, woh yahi use karegi (3 locked keys + model wait).
 */
import { runTempAiTask } from './tempAiService'

/**
 * @param {object} opts
 * @param {string} opts.automationSlug — e.g. 'keyword-classify'
 * @param {string} opts.prompt
 * @param {string} [opts.taskType] — tempAiModels TEMP_TASK_MODEL_MAP key
 * @param {string} [opts.boxId] — temp_automation_boxes uuid
 */
export async function runAutomationAi({
  automationSlug,
  prompt,
  taskType = 'general',
  boxId = null,
  onStatus,
  signal,
}) {
  return runTempAiTask({
    prompt,
    taskType,
    boxId,
    onStatus,
    signal,
    meta: { automationSlug },
  })
}
