/**
 * Node-side page intelligence — direct Groq/SambaNova (no n8n, no browser)
 */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { classifyKeyword } from '../page-generator.mjs'
import { runLlmChat } from '../llmRunner.mjs'
import { TOOLS_ROOT } from './env.mjs'

const PREFERRED = ['groq-llama-3.1-8b-instant', 'groq-llama-3.3-70b-versatile', 'sambanova-Meta-Llama-3.1-70B-Instruct']

async function loadAutomationModules() {
  const base = path.join(TOOLS_ROOT, 'src')
  const ai = await import(pathToFileURL(path.join(base, 'data', 'aiAutomation.js')).href)
  const cfg = await import(pathToFileURL(path.join(base, 'lib', 'pageConfig.js')).href)
  return { ai, buildPageConfig: cfg.buildPageConfig }
}

async function llmJsonStep(env, prompt, label) {
  const { text, agentId } = await runLlmChat({
    prompt,
    preferredAgents: PREFERRED,
    maxTokens: 1200,
    env,
  })
  if (!text) throw new Error(`${label}: empty AI response`)
  return { text, agentId }
}

export async function runPageIntelligenceNode(keyword, serpTopUrl = '', env) {
  const { ai, buildPageConfig } = await loadAutomationModules()
  const kw = String(keyword || '').trim()
  const serp = String(serpTopUrl || '').trim()
  const ruleCls = classifyKeyword(kw, serp)
  const agentsUsed = []

  const briefRes = await llmJsonStep(
    env,
    ai.buildKeywordBriefPrompt(kw, serp, {
      pageType: ruleCls.pageType,
      toolType: ruleCls.toolType,
      label: ruleCls.label,
      brandKey: ruleCls.brandKey,
    }),
    'brief'
  )
  agentsUsed.push(briefRes.agentId)
  const brief = ai.parseKeywordBriefResponse(briefRes.text)
  if (!brief) throw new Error('AI brief parse failed')

  const designRes = await llmJsonStep(env, ai.buildKeywordDesignPrompt(kw, brief, serp), 'design')
  agentsUsed.push(designRes.agentId)
  const design = ai.parseKeywordDesignResponse(designRes.text)

  const pageType = brief.page_type || ruleCls.pageType
  const toolType = brief.tool_type || ruleCls.toolType || 'landing'

  const seoRes = await llmJsonStep(
    env,
    ai.buildKeywordSeoPrompt(kw, {
      pageType,
      toolType,
      label: ruleCls.label,
      brandName: ruleCls.name || ruleCls.label,
      targetUrl: ruleCls.targetUrl || serp,
      brief,
    }),
    'seo'
  )
  agentsUsed.push(seoRes.agentId)
  const seo = ai.parseKeywordSeoResponse(seoRes.text)

  const intelligence = { brief, design, seo, ruleCls, agentsUsed }
  const config = buildPageConfig(kw, serp, seo, { intelligence, design })

  return { config, intelligence }
}

export async function runTemplatePageNode(keyword, serpTopUrl = '') {
  const { buildPageConfig } = await loadAutomationModules()
  const config = buildPageConfig(keyword, serpTopUrl)
  return { config, intelligence: null }
}
