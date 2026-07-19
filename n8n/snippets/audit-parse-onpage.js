// n8n Code — parse on-page HTML + markdown strip for token savings
const ctx = $input.first().json;
const html = ctx.technical?.html?.body || '';

function stripTags(htmlStr) {
  return htmlStr
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(htmlStr, name) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i');
  const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i');
  const m = htmlStr.match(re) || htmlStr.match(alt);
  return m ? m[1].trim() : null;
}

function extractTag(htmlStr, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = htmlStr.match(re);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
}

function extractAll(htmlStr, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(htmlStr)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    if (text) out.push(text);
  }
  return out;
}

function extractJsonLd(htmlStr) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const schemas = [];
  let m;
  while ((m = re.exec(htmlStr)) !== null) {
    try {
      schemas.push(JSON.parse(m[1].trim()));
    } catch {
      schemas.push({ _parseError: true, raw: m[1].slice(0, 500) });
    }
  }
  return schemas;
}

function schemaTypes(schemas) {
  const types = new Set();
  const walk = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj['@type']) {
      const t = obj['@type'];
      (Array.isArray(t) ? t : [t]).forEach((x) => types.add(x));
    }
    Object.values(obj).forEach((v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (typeof v === 'object') walk(v);
    });
  };
  schemas.forEach(walk);
  return [...types];
}

function isQuestionHeading(text) {
  const t = text.trim();
  return t.endsWith('?') || /^(what|why|how|when|where|who|which|can|do|does|is|are)\b/i.test(t);
}

const h1s = extractAll(html, 'h1');
const h2s = extractAll(html, 'h2');
const h3s = extractAll(html, 'h3');
const schemas = extractJsonLd(html);
const schemaTypeList = schemaTypes(schemas);
const plainText = stripTags(html);
const markdownApprox = plainText.slice(0, 8000);
const tokenEstimate = Math.ceil(markdownApprox.length / 4);

const questionHeadings = [...h2s, ...h3s].filter(isQuestionHeading);
const questionRatio =
  h2s.length + h3s.length > 0 ? questionHeadings.length / (h2s.length + h3s.length) : 0;

const onpage = {
  title: extractTag(html, 'title'),
  metaDescription: extractMeta(html, 'description'),
  canonical: (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null,
  author: extractMeta(html, 'author') || (html.match(/rel=["']author["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null,
  publishedDate:
    extractMeta(html, 'article:published_time') ||
    extractMeta(html, 'datePublished') ||
    (html.match(/datetime=["']([^"']+)["']/i) || [])[1] ||
    null,
  h1: h1s[0] || null,
  h1Count: h1s.length,
  h2s: h2s.slice(0, 20),
  h3s: h3s.slice(0, 20),
  questionHeadings,
  questionHeadingRatio: Math.round(questionRatio * 100),
  wordCount: plainText.split(/\s+/).filter(Boolean).length,
  schemas,
  schemaTypes: schemaTypeList,
  hasFaqSchema: schemaTypeList.some((t) => /FAQPage/i.test(t)),
  hasOrgSchema: schemaTypeList.some((t) => /Organization|LocalBusiness/i.test(t)),
  hasAuthorSchema: schemaTypeList.some((t) => /Person|Author/i.test(t)),
  hasBreadcrumbSchema: schemaTypeList.some((t) => /BreadcrumbList/i.test(t)),
  hasSpeakableSchema: schemaTypeList.some((t) => /Speakable/i.test(t)),
  hasSameAs: /sameAs/i.test(html),
  hasToc: /<nav[^>]*(?:toc|table-of|contents)/i.test(html),
  isNoindex: /noindex/i.test(extractMeta(html, 'robots') || html.match(/content=["'][^"']*noindex/i)?.[0] || ''),
  internalLinks: (html.match(new RegExp(`<a[^>]+href=["'][^"']*${ctx.domain}`, 'gi')) || []).length,
  imagesWithoutAlt: (html.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length,
  outboundLinks: (html.match(/<a[^>]+href=["']https?:\/\//gi) || []).length,
  markdownSample: markdownApprox,
  tokenEstimate,
};

return [{ json: { ...ctx, onpage } }];
