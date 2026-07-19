/**
 * Keyword page intelligence — AI pehle samjhe, phir page bane
 */
import { classifyKeyword } from '../../lib/page-generator.mjs'
import { buildPageConfig } from '../lib/pageConfig'
import {
  buildKeywordBriefPrompt,
  buildKeywordDesignPrompt,
  buildKeywordSeoPrompt,
  parseKeywordBriefResponse,
  parseKeywordDesignResponse,
  parseKeywordSeoResponse,
} from '../data/aiAutomation'
import {
  listCenterTasks,
  runOrchestratorUntilIdle,
  submitCenterTask,
} from './aiCenterService'

async function waitForTaskOutput(taskId, maxTicks = 12) {
  await runOrchestratorUntilIdle(maxTicks)
  const tasks = await listCenterTasks(50)
  const row = tasks.find((t) => String(t.id) === String(taskId))
  if (!row) throw new Error('Task not found')
  if (row.status === 'failed') throw new Error(row.output_text || 'AI task failed')
  if (row.status === 'no_agent') throw new Error('Koi AI agent available nahi — Groq key .env me check karo')
  if (row.status !== 'completed') throw new Error(`Task still ${row.status}`)
  return row.output_text
}

async function runAiStep(taskType, title, inputText) {
  const task = await submitCenterTask({ taskType, title, inputText })
  const output = await waitForTaskOutput(task.id)
  return { task, output, parsed: null }
}

export async function runPageIntelligence(keyword, serpTopUrl = '') {
  const kw = String(keyword || '').trim()
  const serp = String(serpTopUrl || '').trim()
  const ruleCls = classifyKeyword(kw, serp)
  const tasks = []

  const briefStep = await runAiStep(
    'keyword_page_brief',
    `Brief: ${kw}`,
    buildKeywordBriefPrompt(kw, serp, {
      pageType: ruleCls.pageType,
      toolType: ruleCls.toolType,
      label: ruleCls.label,
      brandKey: ruleCls.brandKey,
    })
  )
  tasks.push(briefStep.task)
  const brief = parseKeywordBriefResponse(briefStep.output)
  if (!brief) throw new Error('AI brief parse fail — dubara try karo')

  const briefStep2 = await runAiStep(
    'keyword_page_design',
    `Design: ${kw}`,
    buildKeywordDesignPrompt(kw, brief, serp)
  )
  tasks.push(briefStep2.task)
  const design = parseKeywordDesignResponse(briefStep2.output)

  const pageType = brief.page_type || ruleCls.pageType
  const toolType = brief.tool_type || ruleCls.toolType || 'landing'

  const seoStep = await runAiStep(
    'keyword_page_seo',
    `SEO: ${kw}`,
    buildKeywordSeoPrompt(kw, {
      pageType,
      toolType,
      label: ruleCls.label,
      brandName: ruleCls.name || ruleCls.label,
      targetUrl: ruleCls.targetUrl || serp,
      brief,
    })
  )
  tasks.push(seoStep.task)
  const seo = parseKeywordSeoResponse(seoStep.output)

  const intelligence = { brief, design, seo, ruleCls, agentsUsed: tasks.map((t) => t.assigned_agent_id).filter(Boolean) }

  const config = buildPageConfig(kw, serp, seo, { intelligence, design })

  return { config, intelligence, tasks }
}
