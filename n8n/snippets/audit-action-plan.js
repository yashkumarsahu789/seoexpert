// n8n Code — build structured action plan aligned to 4-step audit plan
const ctx = $input.first().json;
const rows = [];

function add(row) {
  rows.push({ status: 'open', ...row });
}

// Step 1 — present SEO/AEO/GEO vs requirements
for (const c of (ctx.presentState?.checklist || []).filter((x) => x.status === 'missing')) {
  add({
    step: 1,
    type: 'present_gap',
    priority: c.area === 'geo' ? 'high' : 'medium',
    category: c.area,
    code: `PRESENT-${c.area.toUpperCase()}`,
    title: `${c.feature.replace(/_/g, ' ')} — missing`,
    remediation: c.fixHint || `Add or fix ${c.feature} for ${c.area.toUpperCase()}`,
    metadata: { feature: c.feature, detail: c.detail },
  });
}

// Step 2 — best keywords (high search volume) + content that needs update
for (const k of (ctx.keywords?.bestKeywords || ctx.keywords?.opportunities || []).slice(0, 12)) {
  add({
    step: 2,
    type: 'keyword_new',
    priority: (k.searchVolume ?? 0) > 1000 ? 'high' : 'medium',
    category: 'seo',
    code: 'KW-NEW',
    title: `Target high-volume keyword: ${k.keyword}`,
    remediation: k.searchVolume
      ? `Create or expand content (~${k.searchVolume}/mo searches, source: ${k.source})`
      : `Create content pillar for "${k.keyword}" (source: ${k.source})`,
    metadata: { keyword: k.keyword, searchVolume: k.searchVolume, source: k.source },
  });
}

for (const k of (ctx.keywords?.updateRequired || []).slice(0, 10)) {
  add({
    step: 2,
    type: 'keyword_update',
    priority: 'high',
    category: 'seo',
    code: 'KW-UPDATE',
    title: `Update existing content: ${k.keyword}`,
    remediation: 'Topic already on site but thin — expand with direct answers, stats, and internal links',
    metadata: { keyword: k.keyword, searchVolume: k.searchVolume },
  });
}

// Step 3 — competitor gaps (rank above them)
for (const g of (ctx.competitors?.gaps || []).slice(0, 10)) {
  add({
    step: 3,
    type: 'competitor_gap',
    priority: g.aiPriority || 'high',
    category: 'seo',
    code: 'COMP-GAP',
    title: `Outrank #${g.competitorRank} for "${g.keyword}"`,
    remediation: g.remediation,
    metadata: { url: g.competitorUrl, weaknesses: g.weaknesses, keyword: g.keyword },
  });
}

// Step 4 — AEO & GEO findings (required features missing on site)
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
rows.sort(
  (a, b) =>
    (a.step - b.step) ||
    (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
);

return [{ json: { ...ctx, actionPlan: rows.slice(0, 60) } }];
