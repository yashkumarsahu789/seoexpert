// n8n Code — Step 1: present SEO / AEO / GEO inventory vs requirements
const ctx = $input.first().json;
const onpage = ctx.onpage || {};
const technical = ctx.technical || {};
const robots = technical.robots || {};
const llms = technical.llms || {};

function item(area, feature, ok, detail, fixHint) {
  return {
    area,
    feature,
    status: ok ? 'present' : 'missing',
    needsUpdate: ok === 'update',
    detail,
    fixHint: fixHint || null,
  };
}

const checklist = [];

// SEO — present technical + on-page
checklist.push(item('seo', 'title_tag', Boolean(onpage.title), onpage.title || 'Missing'));
checklist.push(
  item('seo', 'meta_description', Boolean(onpage.metaDescription), onpage.metaDescription ? 'Present' : 'Missing', 'Add 150–160 char unique meta')
);
checklist.push(
  item('seo', 'h1', (onpage.h1Count || 0) === 1, `Count: ${onpage.h1Count || 0}`, 'Exactly one H1 per page')
);
checklist.push(item('seo', 'robots_txt', robots.found, robots.found ? 'Found' : 'Not found'));
checklist.push(
  item('seo', 'sitemap', technical.sitemap?.ok, technical.sitemap?.ok ? `${technical.sitemap.urlCount || 0} URLs` : 'Missing or empty')
);
checklist.push(
  item('seo', 'org_schema', onpage.hasOrgSchema, onpage.hasOrgSchema ? 'Organization schema found' : 'Missing JSON-LD')
);
if (technical.pagespeed?.performance_score != null) {
  const score = technical.pagespeed.performance_score;
  checklist.push(
    item('seo', 'core_web_vitals', score >= 50, `Mobile score ${score}`, score < 50 ? 'Improve LCP and TBT' : null)
  );
}

// AEO — answer engine readiness
checklist.push(
  item(
    'aeo',
    'question_headings',
    (onpage.questionHeadingRatio || 0) >= 30,
    `Question-style H2/H3 ratio ${onpage.questionHeadingRatio || 0}%`,
    'Rewrite headings as user questions'
  )
);
checklist.push(item('aeo', 'faq_schema', onpage.hasFaqSchema, onpage.hasFaqSchema ? 'FAQPage schema' : 'Missing'));
checklist.push(
  item(
    'aeo',
    'author_eeat',
    Boolean(onpage.author || onpage.hasAuthorSchema),
    onpage.author || (onpage.hasAuthorSchema ? 'Schema only' : 'No author signal')
  )
);
checklist.push(
  item('aeo', 'publish_date', Boolean(onpage.publishedDate), onpage.publishedDate || 'Not detected')
);

// GEO — generative engine / AI crawler readiness
const blocked = Object.entries(robots.aiBots || {}).filter(([, v]) => v === 'blocked');
checklist.push(
  item(
    'geo',
    'ai_crawler_access',
    blocked.length === 0,
    blocked.length ? `Blocked: ${blocked.map(([b]) => b).join(', ')}` : 'GPTBot/ClaudeBot allowed'
  )
);
checklist.push(item('geo', 'llms_txt', llms.llms_txt, llms.llms_txt ? 'llms.txt found' : 'Missing at site root'));
checklist.push(
  item('geo', 'llms_full', llms.llms_full, llms.llms_full ? 'llms-full.txt found' : 'Optional but recommended')
);

const present = checklist.filter((c) => c.status === 'present' && !c.needsUpdate);
const missing = checklist.filter((c) => c.status === 'missing');
const needsUpdate = checklist.filter((c) => c.needsUpdate || (c.status === 'present' && c.fixHint));

return [
  {
    json: {
      ...ctx,
      presentState: {
        checklist,
        summary: {
          total: checklist.length,
          present: present.length,
          missing: missing.length,
          needsUpdate: needsUpdate.length,
        },
        seo: checklist.filter((c) => c.area === 'seo'),
        aeo: checklist.filter((c) => c.area === 'aeo'),
        geo: checklist.filter((c) => c.area === 'geo'),
      },
    },
  },
];
