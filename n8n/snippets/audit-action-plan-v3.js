// n8n Code — action plan v3 aligned to 4-step transparent audit
const ctx = $input.first().json;
const rows = [];

function add(row) {
  rows.push({ status: 'open', ...row });
}

// Step 1 — SEO / AEO / GEO requirement checks (official + patent + tracker)
for (const pillar of ['seo', 'aeo', 'geo']) {
  for (const c of (ctx[`${pillar}Checks`] || []).filter((x) => x.status !== 'present')) {
    add({
      step: 1,
      pillar,
      type: `req_${c.status}`,
      priority: c.severity,
      category: pillar,
      code: c.rule_code,
      title: `[${c.source_type}] ${c.title}`,
      remediation: c.remediation,
      metadata: { source_name: c.source_name, source_type: c.source_type, status: c.status },
    });
  }
}

// Step 2 — keywords + daily rank
for (const r of (ctx.keywords?.rankResults || []).slice(0, 12)) {
  add({
    step: 2,
    type: 'keyword_rank',
    priority: r.ourRank == null || r.ourRank > 10 ? 'high' : 'medium',
    category: 'seo',
    code: 'KW-RANK',
    title: `"${r.keyword}" — rank ${r.ourRank ?? 'not in top 20'}`,
    remediation: r.beatPlan,
    metadata: { keyword: r.keyword, ourRank: r.ourRank, topResult: r.topResult },
  });
}

for (const k of (ctx.keywords?.bestKeywords || ctx.keywords?.suggestions || []).slice(0, 10)) {
  add({
    step: 2,
    type: 'keyword_new',
    priority: 'medium',
    category: 'seo',
    code: 'KW-NEW',
    title: `Target keyword: ${k.keyword}`,
    remediation: `Create or expand content for "${k.keyword}"`,
    metadata: k,
  });
}

for (const k of (ctx.keywords?.updateRequired || []).slice(0, 8)) {
  add({
    step: 2,
    type: 'keyword_update',
    priority: 'high',
    category: 'seo',
    code: 'KW-UPDATE',
    title: `Update content: ${k.keyword}`,
    remediation: 'Topic exists but needs depth, schema, and internal links',
    metadata: k,
  });
}

// Step 3 — competitors (raw metrics only)
for (const s of (ctx.competitors?.snapshots || []).slice(0, 10)) {
  const gapSummary = (s.our_gaps || []).map((g) => g.metric).filter(Boolean).join(', ');
  add({
    step: 3,
    type: 'competitor',
    priority: s.our_rank == null || s.our_rank > s.competitor_rank ? 'high' : 'medium',
    category: 'seo',
    code: 'COMP-RAW',
    title: `Keyword "${s.keyword}" — rank #${s.competitor_rank} competitor`,
    remediation: gapSummary ? `Metric gaps: ${gapSummary}` : 'Review raw competitor comparison',
    metadata: {
      url: s.competitor_url,
      our_setup: s.our_setup,
      their_setup: s.their_setup,
      comparison: s.comparison,
      our_gaps: s.our_gaps,
    },
  });
}

// Step 4 — extra AEO/GEO heuristic findings
for (const f of (ctx.aeo_geo?.findings || [])) {
  add({
    step: 4,
    type: 'finding',
    priority: f.severity,
    category: f.category,
    code: f.fix_code,
    title: f.title,
    remediation: f.remediation,
    metadata: f.metadata || {},
  });
}

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
rows.sort((a, b) => (a.step - b.step) || (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));

return [{ json: { ...ctx, actionPlan: rows.slice(0, 80) } }];
