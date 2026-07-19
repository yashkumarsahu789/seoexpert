import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function cleanEnv(name: string): string {
  return (Deno.env.get(name) || '').trim().replace(/^['"]|['"]$/g, '')
}

function parseRepo(repo: string): { owner: string; repo: string } {
  const trimmed = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')
  const [owner, name] = trimmed.split('/')
  if (!owner || !name) throw new Error(`Invalid repo: ${repo} — use owner/name or full URL`)
  return { owner, repo: name }
}

async function githubRequest(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    const msg = (data.message as string) || `GitHub HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: { repo?: string; path?: string; content?: string; message?: string; action?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = cleanEnv('GITHUB_TOKEN')
  if (!token) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN missing in Supabase secrets' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (body.action === 'check') {
    try {
      const user = await githubRequest(token, '/user')
      return new Response(
        JSON.stringify({ ok: true, login: user.login, hint: 'GitHub token valid' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return new Response(JSON.stringify({ ok: false, error: message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  const { repo, path, content, message } = body
  if (!repo || !path || content == null) {
    return new Response(JSON.stringify({ error: 'repo, path, content required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { owner, repo: repoName } = parseRepo(repo)
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')

    let sha: string | undefined
    try {
      const existing = await githubRequest(token, `/repos/${owner}/${repoName}/contents/${encodedPath}`)
      sha = existing.sha as string
    } catch {
      sha = undefined
    }

    const payload = {
      message: message || `ai-center: update ${path}`,
      content: btoa(unescape(encodeURIComponent(String(content)))),
      ...(sha ? { sha } : {}),
    }

    const result = await githubRequest(token, `/repos/${owner}/${repoName}/contents/${encodedPath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return new Response(
      JSON.stringify({
        ok: true,
        commit: (result.commit as Record<string, unknown>)?.sha,
        html_url: result.content ? (result.content as Record<string, unknown>).html_url : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
