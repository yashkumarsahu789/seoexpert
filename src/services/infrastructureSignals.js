const COMMON_PREFETCH_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
];

function extractOrigins(html, siteOrigin) {
  const origins = new Set();
  const attrPattern = /(?:src|href)=["'](https?:\/\/[^"']+)["']/gi;
  let match;

  while ((match = attrPattern.exec(html)) !== null) {
    try {
      const origin = new URL(match[1]).origin;
      if (origin !== siteOrigin) origins.add(origin);
    } catch {
      // skip
    }
  }

  for (const origin of COMMON_PREFETCH_ORIGINS) {
    if (html.includes(origin.replace('https://', ''))) origins.add(origin);
  }

  return [...origins];
}

function extractInternalPaths(html, siteOrigin) {
  const paths = new Set(['/']);
  const attrPattern = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = attrPattern.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue;
    try {
      const resolved = href.startsWith('http') ? new URL(href) : new URL(href, siteOrigin);
      if (resolved.origin === siteOrigin) paths.add(resolved.pathname);
    } catch {
      // skip
    }
  }

  return [...paths].slice(0, 8);
}

export function buildInfrastructureSignals(html = '', url = '') {
  const lower = html.toLowerCase();
  let siteOrigin = '';

  try {
    siteOrigin = new URL(url).origin;
  } catch {
    siteOrigin = '';
  }

  const scriptTags = html.match(/<script[^>]*>/gi) || [];
  const blockingScripts = scriptTags.filter(
    (tag) => /src=/i.test(tag) && !/\b(defer|async|type=["']module["'])\b/i.test(tag)
  );
  const imgTags = html.match(/<img[^>]*>/gi) || [];

  return {
    hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    hasDnsPrefetch: /<link[^>]+rel=["']dns-prefetch["']/i.test(html),
    hasPreconnect: /<link[^>]+rel=["']preconnect["']/i.test(html),
    blockingScriptCount: blockingScripts.length,
    hasSpeculationRules: /type=["']speculationrules["']/i.test(html),
    hasRobotsTxt: false,
    hasSitemap: false,
    hasSchema:
      lower.includes('application/ld+json') ||
      lower.includes('schema.org') ||
      lower.includes('localbusiness'),
    imagesWithoutLazy: imgTags.filter((t) => !/\bloading=["']lazy["']/i.test(t)).length,
    imagesWithoutAlt: imgTags.filter((t) => !/\balt=["'][^"']+["']/i.test(t)).length,
    externalOrigins: siteOrigin ? extractOrigins(html, siteOrigin) : [],
    internalPaths: siteOrigin ? extractInternalPaths(html, siteOrigin) : [],
  };
}
