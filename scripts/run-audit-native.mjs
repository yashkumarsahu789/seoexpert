#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://sbdlfyfkpatnxkrmslvq.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZGxmeWZrcGF0bnhrcm1zbHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTM2NjMsImV4cCI6MjA4OTU2OTY2M30.eLqakT_Yus8i17cDzJWRGdgvQMSDzvuqHnvjb3AeVPE'
const SERPER_KEY = process.env.SERPER_API_KEY || '231506b3ec144d842cf349ccd47b4c4ecb35852b'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const targetArg = process.argv[2] || 'https://lifesolvenow.com'

function canonicalWebsiteUrl(raw) {
  let u = String(raw || '').trim()
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u.replace(/\/+$/, '')
}

function websiteDomain(raw) {
  try {
    return new URL(canonicalWebsiteUrl(raw)).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return String(raw || '').toLowerCase()
  }
}

async function fetchWebsiteHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (res.ok) return await res.text()
  } catch (err) {
    console.warn('Direct fetch failed, trying proxy:', err.message)
  }

  const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`
  try {
    const res = await fetch(proxy)
    if (res.ok) return await res.text()
  } catch {
    // fallback
  }
  return ''
}

function parseOnPage(html, pageUrl) {
  if (!html) return { title: '', metaDescription: '', h1: '', h1Count: 0, h2s: [], wordCount: 0, internalLinks: 0, outboundLinks: 0, hasOrgSchema: false }
  
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : ''

  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i)
  const metaDescription = descMatch ? descMatch[1].trim() : ''

  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
  const h1Count = h1Matches.length
  const h1 = h1Count > 0 ? h1Matches[0][1].replace(/<[^>]+>/g, '').trim() : ''

  const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
  const h2s = h2Matches.map((m) => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean)

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length

  return { title, metaDescription, h1, h1Count, h2s, wordCount }
}

async function runCliAudit(rawUrl) {
  const url = canonicalWebsiteUrl(rawUrl)
  const domain = websiteDomain(url)

  console.log(`\n========================================`)
  console.log(`🚀 RUNNING NATIVE SEO AUDIT: ${domain}`)
  console.log(`Target URL: ${url}`)
  console.log(`========================================\n`)

  // Check or register website row
  let websiteId = null
  const { data: existingSite } = await supabase
    .from('websites')
    .select('id')
    .ilike('url', `%${domain}%`)
    .limit(1)
    .maybeSingle()

  if (existingSite?.id) {
    websiteId = existingSite.id
    console.log(`✓ Existing website ID: ${websiteId}`)
  } else {
    const { data: newSite } = await supabase
      .from('websites')
      .insert({ url, site_name: 'LifeSolveNow', status: 'running' })
      .select('id')
    websiteId = Array.isArray(newSite) ? newSite[0]?.id : newSite?.id
    console.log(`✓ Registered website ID: ${websiteId}`)
  }

  // 1. Init audit run
  const { data: run, error: runErr } = await supabase
    .from('audit_runs')
    .insert({
      website_id: websiteId,
      website_url: url,
      domain,
      status: 'running',
      mode: 'full',
      summary: { source: 'native-cli-runner' },
    })
    .select('id')
    .single()

  if (runErr) {
    console.error('Failed to create audit run in DB:', runErr.message)
    process.exit(1)
  }

  const auditRunId = run.id
  console.log(`✓ Audit Run ID: ${auditRunId}`)

  // 2. Fetch HTML & on-page analysis
  console.log(`[1/5] Fetching HTML & analyzing on-page structure...`)
  const html = await fetchWebsiteHtml(url)
  const onpage = parseOnPage(html, url)
  console.log(`      Title: "${onpage.title || '(missing)'}"`)
  console.log(`      Meta description: "${onpage.metaDescription ? onpage.metaDescription.slice(0, 60) + '...' : '(missing)'}"`)
  console.log(`      H1 count: ${onpage.h1Count} | Word count: ${onpage.wordCount}`)

  // 3. Load & evaluate requirements
  console.log(`[2/5] Evaluating SEO / AEO / GEO rules against catalog...`)
  const { data: reqs } = await supabase.from('audit_requirements').select('*').eq('active', true)
  const requirements = reqs || []

  const seoChecks = []
  const aeoChecks = []
  const geoChecks = []
  const findings = []
  const siteReqChecks = []

  for (const r of requirements) {
    let status = 'present'
    let detail = 'Passed'
    let remediation = null

    if (r.check_key === 'title_present') {
      status = onpage.title ? 'present' : 'missing'
      detail = onpage.title || 'Missing title tag'
      remediation = 'Add descriptive <title> tag'
    } else if (r.check_key === 'meta_description') {
      status = onpage.metaDescription ? 'present' : 'missing'
      detail = onpage.metaDescription || 'Missing meta description'
      remediation = 'Add meta description'
    } else if (r.check_key === 'h1_single') {
      if (onpage.h1Count === 1) status = 'present'
      else if (onpage.h1Count === 0) status = 'missing'
      else status = 'needs_update'
      detail = `Found ${onpage.h1Count} H1 tags`
    } else if (r.check_key === 'content_depth') {
      status = onpage.wordCount >= 500 ? 'present' : onpage.wordCount >= 200 ? 'needs_update' : 'missing'
      detail = `${onpage.wordCount} words`
    } else if (r.check_key === 'https_enabled') {
      status = /^https:/i.test(url) ? 'present' : 'missing'
      detail = 'HTTPS check'
    }

    const rec = {
      audit_run_id: auditRunId,
      website_id: websiteId,
      requirement_id: r.id,
      pillar: r.pillar,
      rule_code: r.rule_code,
      source_type: r.source_type,
      source_name: r.source_name,
      status,
      title: r.title,
      detail,
      remediation,
      severity: r.severity,
    }
    siteReqChecks.push(rec)
    if (r.pillar === 'seo') seoChecks.push(rec)
    else if (r.pillar === 'aeo') aeoChecks.push(rec)
    else if (r.pillar === 'geo') geoChecks.push(rec)

    if (status !== 'present') {
      findings.push({
        audit_run_id: auditRunId,
        category: r.pillar,
        dimension: r.rule_code,
        severity: r.severity,
        title: r.title,
        description: detail,
        remediation,
        status: 'open',
      })
    }
  }

  function scorePillar(checks, base = 75) {
    if (!checks.length) return base
    const p = checks.filter((c) => c.status === 'present').length
    const m = checks.filter((c) => c.status === 'missing').length
    const u = checks.filter((c) => c.status === 'needs_update').length
    return Math.max(15, Math.min(100, Math.round(base * (p / checks.length) - m * 8 - u * 4)))
  }

  const s_seo = scorePillar(seoChecks, 76)
  const s_aeo = scorePillar(aeoChecks, 72)
  const s_geo = scorePillar(geoChecks, 70)
  const wos_score = Math.round((0.5 * s_seo + 0.25 * s_aeo + 0.25 * s_geo) * 100) / 100

  console.log(`[3/5] Scores Calculated:`)
  console.log(`      WOS Total: ${wos_score} / 100`)
  console.log(`      SEO: ${s_seo} | AEO: ${s_aeo} | GEO: ${s_geo}`)

  // 4. Keyword Rank Check via Serper
  console.log(`[4/5] Checking Google Search Rankings via Serper...`)
  const seeds = [domain.replace(/\.[a-z]+$/i, ''), onpage.title?.split(/[-|]/)[0]?.trim()].filter(Boolean)
  const kwRankings = []

  for (const kw of seeds.slice(0, 2)) {
    try {
      const sRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: kw, gl: 'in' }),
      })
      if (sRes.ok) {
        const sData = await sRes.json()
        const org = sData.organic || []
        let ourRank = null
        let ourUrl = null
        org.forEach((item, idx) => {
          if (!ourRank && String(item.link || '').includes(domain)) {
            ourRank = idx + 1
            ourUrl = item.link
          }
        })
        console.log(`      Keyword "${kw}": ${ourRank ? '#' + ourRank : 'Not in top 10'}`)
        kwRankings.push({
          website_id: websiteId,
          audit_run_id: auditRunId,
          keyword: kw,
          rank_position: ourRank,
          rank_url: ourUrl,
          serp_features: { source: 'Google (Serper)' },
        })
      }
    } catch {
      // ignore
    }
  }

  // 5. Persist to Supabase
  console.log(`[5/5] Saving results to Supabase...`)
  if (siteReqChecks.length) {
    try {
      await supabase.from('site_requirement_checks').insert(siteReqChecks)
    } catch (e) {
      console.warn('site_requirement_checks error:', e.message)
    }
  }
  if (findings.length) {
    try {
      await supabase.from('audit_findings').insert(findings)
    } catch (e) {
      console.warn('audit_findings error:', e.message)
    }
  }
  if (kwRankings.length) {
    try {
      await supabase.from('keyword_rankings').insert(kwRankings)
    } catch (e) {
      console.warn('keyword_rankings error:', e.message)
    }
  }

  await supabase
    .from('audit_runs')
    .update({
      status: 'completed',
      wos_score,
      s_seo,
      s_aeo,
      s_geo,
      token_count: Math.round(onpage.wordCount * 1.3),
      completed_at: new Date().toISOString(),
      summary: { domain, url, wos: wos_score, s_seo, s_aeo, s_geo },
      phase_seo: { score: s_seo },
      phase_aeo: { score: s_aeo },
      phase_geo: { score: s_geo },
    })
    .eq('id', auditRunId)

  await supabase.from('websites').update({ status: 'completed' }).eq('id', websiteId)

  console.log(`\n🎉 AUDIT COMPLETED SUCCESSFULLY!`)
  console.log(`WOS Score: ${wos_score}`)
  console.log(`Check it in the UI at: https://yashkumarsahu789.github.io/seoexpert/audit/sites\n`)
}

runCliAudit(targetArg).catch((e) => {
  console.error('Audit failed:', e)
  process.exit(1)
})
