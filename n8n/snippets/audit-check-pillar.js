// @inject-free-audit-utils
// n8n Code — run requirement checks for one pillar (seo | aeo | geo)
const ctx = $input.first().json;
const pillar = ctx._checkPillar || 'seo';
const rules = (ctx.requirements || []).filter((r) => r.pillar === pillar && r.check_key !== 'manual_review');

const onpage = ctx.onpage || {};
const technical = ctx.technical || {};
const robots = technical.robots || {};
const llms = technical.llms || {};
const html = technical.html?.body || '';
const domain = (ctx.domain || '').toLowerCase();

function getEnv(name) {
  try { return $env[name] || ''; } catch { return ''; }
}

async function evalCheck(key, pillar) {
  switch (key) {
    case 'title_present':
      return onpage.title ? { ok: true, detail: onpage.title } : { ok: false };
    case 'meta_description':
      return onpage.metaDescription ? { ok: true, detail: 'Present' } : { ok: false };
    case 'h1_single':
      return (onpage.h1Count || 0) === 1 ? { ok: true, detail: onpage.h1 } : { ok: false, weak: (onpage.h1Count || 0) > 0 };
    case 'robots_txt':
      return robots.found ? { ok: true } : { ok: false };
    case 'sitemap':
      return technical.sitemap?.ok ? { ok: true, detail: `${technical.sitemap.urlCount || 0} URLs` } : { ok: false };
    case 'org_schema':
      return onpage.hasOrgSchema ? { ok: true } : { ok: false };
    case 'core_web_vitals':
      if (technical.pagespeed?.performance_score == null) return { ok: null, detail: 'PageSpeed key not set' };
      return technical.pagespeed.performance_score >= 50
        ? { ok: true, detail: `Score ${technical.pagespeed.performance_score}` }
        : { ok: false, weak: true, detail: `Score ${technical.pagespeed.performance_score}` };
    case 'https_enabled':
      return /^https:/i.test(ctx.websiteUrl || ctx.baseUrl || '') ? { ok: true } : { ok: false };
    case 'internal_links':
      return (onpage.internalLinks || 0) >= 3 ? { ok: true } : { ok: false, weak: true };
    case 'image_alt':
      return (onpage.imagesWithoutAlt || 0) === 0 ? { ok: true } : { ok: false, weak: true };
    case 'content_depth':
      return (onpage.wordCount || 0) >= 600 ? { ok: true } : { ok: false, weak: true, detail: `${onpage.wordCount || 0} words` };
    case 'publish_date':
      return onpage.publishedDate ? { ok: true, detail: onpage.publishedDate } : { ok: false };
    case 'author_eeat':
      return onpage.author || onpage.hasAuthorSchema ? { ok: true } : { ok: false };
    case 'breadcrumb_schema':
      return onpage.hasBreadcrumbSchema ? { ok: true } : { ok: false };
    case 'noindex_check':
      return onpage.isNoindex ? { ok: false, harmful: true } : { ok: true };
    case 'question_headings':
      return (onpage.questionHeadingRatio || 0) >= 30 ? { ok: true } : { ok: false, weak: true };
    case 'direct_answer': {
      const words = (onpage.markdownSample || '').slice(0, 400).split(/\s+/).filter(Boolean).length;
      return words >= 25 && words <= 80 ? { ok: true } : { ok: false, weak: words > 0 };
    }
    case 'faq_schema':
      return onpage.hasFaqSchema ? { ok: true } : { ok: false };
    case 'speakable_schema':
      return onpage.hasSpeakableSchema ? { ok: true } : { ok: false };
    case 'outbound_citations':
      return (onpage.outboundLinks || 0) >= 3 ? { ok: true } : { ok: false, weak: (onpage.outboundLinks || 0) > 0 };
    case 'heading_structure':
      return (onpage.h2s?.length || 0) >= 3 ? { ok: true } : { ok: false, weak: true };
    case 'toc_present':
      return /<nav[^>]*(?:toc|table-of|contents)/i.test(html) || onpage.hasToc ? { ok: true } : { ok: false };
    case 'gptbot_allowed':
      return robots.aiBots?.GPTBot !== 'blocked' ? { ok: true } : { ok: false, harmful: true };
    case 'claudebot_allowed':
      return robots.aiBots?.ClaudeBot !== 'blocked' ? { ok: true } : { ok: false, harmful: true };
    case 'perplexitybot_allowed':
      return robots.aiBots?.PerplexityBot !== 'blocked' ? { ok: true } : { ok: false, harmful: true };
    case 'google_extended_policy':
      return robots.aiBots?.['Google-Extended'] !== 'blocked' ? { ok: true } : { ok: false, weak: true };
    case 'llms_txt':
      return llms.llms_txt ? { ok: true } : { ok: false };
    case 'llms_full':
      return llms.llms_full ? { ok: true } : { ok: false };
    case 'ai_bots_not_blocked': {
      const blocked = Object.entries(robots.aiBots || {}).filter(([, v]) => v === 'blocked');
      return blocked.length === 0 ? { ok: true } : { ok: false, harmful: true, detail: blocked.map(([b]) => b).join(', ') };
    }
    case 'entity_consistency': {
      const brand = domain.split('.')[0];
      if (brand.length < 3) return { ok: false, weak: true, detail: 'Brand too short' };
      try {
        const serp = await freeSerpOrPaid(this, `${brand} company`, domain);
        const blob = JSON.stringify(serp.organic_results || []).toLowerCase();
        const hasLinkedIn = blob.includes('linkedin.com');
        const hasCrunch = blob.includes('crunchbase.com');
        ctx._entitySignals = { linkedin: hasLinkedIn, crunchbase: hasCrunch, source: serp.source };
        return hasLinkedIn || hasCrunch ? { ok: true } : { ok: false, weak: true };
      } catch {
        return { ok: false, weak: true };
      }
    }
    case 'sameas_profiles':
      return onpage.hasSameAs ? { ok: true } : { ok: false, weak: true };
    default:
      return { ok: null, detail: 'Check not automated yet' };
  }
}

const checks = [];
for (const rule of rules) {
  const result = await evalCheck.call(this, rule.check_key, pillar);
  let status = 'not_applicable';
  let remediation = '';

  if (result.ok === true) {
    status = 'present';
  } else if (result.ok === false) {
    if (result.harmful) {
      status = 'needs_remove';
      remediation = rule.action_if_harmful === 'remove'
        ? `Remove or fix: ${rule.title}`
        : `Fix blocking issue: ${rule.title}`;
    } else if (result.weak) {
      status = 'needs_update';
      remediation = `Update/improve: ${rule.title}. ${rule.description || ''}`;
    } else {
      status = 'missing';
      remediation = `Add: ${rule.title}. ${rule.description || ''}`;
    }
  }

  if (result.ok !== null) {
    checks.push({
      requirement_id: rule.id,
      pillar: rule.pillar,
      rule_code: rule.rule_code,
      source_type: rule.source_type,
      source_name: rule.source_name,
      source_url: rule.source_url,
      title: rule.title,
      detail: result.detail || rule.description,
      status,
      remediation,
      severity: rule.severity,
      check_key: rule.check_key,
    });
  }
}

const summary = {
  pillar,
  total: checks.length,
  present: checks.filter((c) => c.status === 'present').length,
  missing: checks.filter((c) => c.status === 'missing').length,
  needs_update: checks.filter((c) => c.status === 'needs_update').length,
  needs_remove: checks.filter((c) => c.status === 'needs_remove').length,
  bySource: {
    official: checks.filter((c) => c.source_type === 'official').length,
    patent: checks.filter((c) => c.source_type === 'patent').length,
    tracker: checks.filter((c) => c.source_type === 'tracker').length,
  },
};

const phaseKey = `phase_${pillar}`;
const prevChecks = ctx[`${pillar}Checks`] || [];
const allChecks = [...prevChecks, ...checks];

return [{
  json: {
    ...ctx,
    [`${pillar}Checks`]: allChecks,
    [phaseKey]: summary,
    _checkPillar: undefined,
  },
}];
