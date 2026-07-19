// n8n Code — generate branded HTML audit report
const ctx = $input.first().json;
const s = ctx.scores || {};
const findings = ctx.aeo_geo?.findings || [];

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function scoreColor(n) {
  if (n >= 80) return '#059669';
  if (n >= 60) return '#d97706';
  return '#dc2626';
}

const findingRows = findings
  .map(
    (f) =>
      `<tr><td><span class="badge ${f.severity}">${esc(f.severity)}</span></td><td>${esc(f.category.toUpperCase())}</td><td>${esc(f.title)}</td><td><code>${esc(f.fix_code)}</code></td><td>${esc(f.remediation)}</td></tr>`
  )
  .join('');

const kwRows = (ctx.keywords?.opportunities || [])
  .slice(0, 10)
  .map(
    (k) =>
      `<tr><td>${esc(k.keyword)}</td><td>${esc(k.source)}</td><td>${k.presentOnSite ? 'Yes' : 'No'}</td><td>${esc(k.action)}</td></tr>`
  )
  .join('');

const gapRows = (ctx.competitors?.gaps || [])
  .slice(0, 8)
  .map(
    (g) =>
      `<tr><td>${esc(g.keyword)}</td><td>${esc(g.weaknesses?.join(', '))}</td><td>${esc(g.remediation)}</td></tr>`
  )
  .join('');

const dfsRows = (ctx.keywords?.dataforseo?.enriched || [])
  .slice(0, 10)
  .map(
    (k) =>
      `<tr><td>${esc(k.keyword)}</td><td>${k.search_volume ?? '—'}</td><td>${esc(k.competition)}</td></tr>`
  )
  .join('');

const planRows = (ctx.actionPlan || [])
  .slice(0, 15)
  .map(
    (r) =>
      `<tr><td>${esc(r.priority)}</td><td>${esc(r.code)}</td><td>${esc(r.title)}</td><td>${esc(r.remediation)}</td></tr>`
  )
  .join('');

const aiSummary = ctx.competitors?.aiGapAnalysis?.executive_summary || ctx.keywords?.ai?.summary || '';
const entity = ctx.aeo_geo?.entitySignals || {};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SEO/AEO/GEO Audit — ${esc(ctx.domain)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;background:#f8fafc;color:#0f172a}
.wrap{max-width:960px;margin:0 auto;padding:2rem}
.hero{background:linear-gradient(135deg,#7c3aed,#059669);color:#fff;padding:2rem;border-radius:1rem;margin-bottom:1.5rem}
.scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin:1.5rem 0}
.score{background:#fff;border-radius:.75rem;padding:1rem;text-align:center;box-shadow:0 1px 3px rgb(0 0 0/.08)}
.score strong{font-size:2rem;display:block}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:.75rem;overflow:hidden;margin:1rem 0}
th,td{padding:.65rem .75rem;text-align:left;border-bottom:1px solid #e2e8f0;font-size:.875rem}
th{background:#f1f5f9}
.badge{padding:.15rem .45rem;border-radius:.35rem;font-size:.7rem;text-transform:uppercase}
.critical{background:#fecaca;color:#991b1b}
.high{background:#fed7aa;color:#9a3412}
.medium{background:#fef08a;color:#854d0e}
.low{background:#dbeafe;color:#1e40af}
h2{margin-top:2rem}
code{background:#f1f5f9;padding:.1rem .35rem;border-radius:.25rem}
</style>
</head>
<body>
<div class="wrap">
  <div class="hero">
    <h1>Integrated Audit Report</h1>
    <p>${esc(ctx.websiteUrl)} · ${esc(ctx.summary?.completedAt || new Date().toISOString())}</p>
    <div class="scores">
      <div class="score"><span>WOS</span><strong style="color:${scoreColor(s.wos)}">${s.wos ?? '—'}</strong></div>
      <div class="score"><span>SEO</span><strong style="color:${scoreColor(s.s_seo)}">${s.s_seo ?? '—'}</strong></div>
      <div class="score"><span>AEO</span><strong style="color:${scoreColor(s.s_aeo)}">${s.s_aeo ?? '—'}</strong></div>
      <div class="score"><span>GEO</span><strong style="color:${scoreColor(s.s_geo)}">${s.s_geo ?? '—'}</strong></div>
    </div>
    <p>α=${s.alpha} · β=${s.beta} · γ=${s.gamma} · Tokens ≈ ${s.token_count ?? 0}</p>
  </div>

  <h2>Findings (${findings.length})</h2>
  <table><thead><tr><th>Severity</th><th>Category</th><th>Issue</th><th>Fix</th><th>Remediation</th></tr></thead><tbody>${findingRows || '<tr><td colspan="5">No issues detected</td></tr>'}</tbody></table>

  <h2>Keyword Opportunities</h2>
  <table><thead><tr><th>Keyword</th><th>Source</th><th>On Site</th><th>Action</th></tr></thead><tbody>${kwRows || '<tr><td colspan="4">No keyword data</td></tr>'}</tbody></table>

  <h2>Competitor Gaps</h2>
  <table><thead><tr><th>Keyword</th><th>Weakness</th><th>Remediation</th></tr></thead><tbody>${gapRows || '<tr><td colspan="3">No competitor data yet — re-run audit or add keywords</td></tr>'}</tbody></table>

  ${aiSummary ? `<h2>AI Executive Summary</h2><p>${esc(aiSummary)}</p>` : ''}

  ${dfsRows ? `<h2>Keyword Volume (DataForSEO)</h2><table><thead><tr><th>Keyword</th><th>Volume</th><th>Competition</th></tr></thead><tbody>${dfsRows}</tbody></table>` : ''}

  <h2>Action Plan</h2>
  <table><thead><tr><th>Priority</th><th>Code</th><th>Task</th><th>Fix</th></tr></thead><tbody>${planRows || '<tr><td colspan="4">No action items</td></tr>'}</tbody></table>

  <h2>Technical Snapshot</h2>
  <ul>
    <li>Sitemap URLs cataloged: ${ctx.technical?.sitemap?.urlCount ?? 0}</li>
    <li>Pages crawled (sample): ${ctx.crawl?.sampled ?? 0} / catalog ${ctx.crawl?.catalogTotal ?? 0}</li>
    <li>JS-heavy pages detected: ${ctx.crawl?.jsHeavyPages ?? 0}</li>
    <li>llms.txt: ${ctx.technical?.llms?.llms_txt ? 'Yes' : 'No'}</li>
    <li>Entity — LinkedIn: ${entity.linkedin ? 'Yes' : 'No'}, Crunchbase: ${entity.crunchbase ? 'Yes' : 'No'}</li>
    <li>FAQ schema: ${ctx.onpage?.hasFaqSchema ? 'Yes' : 'No'}</li>
    <li>Question heading ratio: ${ctx.onpage?.questionHeadingRatio ?? 0}%</li>
    <li>DataForSEO: ${ctx.keywords?.dataforseo?.configured ? 'Yes' : 'No'} · OpenAI: ${ctx.keywords?.ai?.configured ? 'Yes' : 'No'}</li>
  </ul>
</div>
</body>
</html>`;

return [{ json: { ...ctx, reportHtml: html } }];
