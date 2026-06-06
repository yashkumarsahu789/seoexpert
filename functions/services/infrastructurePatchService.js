const COMMON_PREFETCH_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  'https://www.google-analytics.com',
  'https://www.googletagmanager.com',
];

function normalizeCanonicalUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  parsed.hash = '';
  parsed.search = '';
  if (!parsed.pathname.endsWith('/')) {
    parsed.pathname = `${parsed.pathname}/`;
  }
  return parsed.href;
}

function extractOrigins(html, siteOrigin) {
  const origins = new Set();
  const attrPattern = /(?:src|href)=["'](https?:\/\/[^"']+)["']/gi;
  let match;

  while ((match = attrPattern.exec(html)) !== null) {
    try {
      const origin = new URL(match[1]).origin;
      if (origin !== siteOrigin) origins.add(origin);
    } catch {
      // skip malformed URLs
    }
  }

  for (const origin of COMMON_PREFETCH_ORIGINS) {
    if (html.includes(origin.replace('https://', ''))) {
      origins.add(origin);
    }
  }

  return [...origins];
}

function extractInternalPaths(html, siteOrigin) {
  const paths = new Set(['/']);
  const attrPattern = /(?:href)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrPattern.exec(html)) !== null) {
    const href = match[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    try {
      const resolved = href.startsWith('http') ? new URL(href) : new URL(href, siteOrigin);
      if (resolved.origin === siteOrigin && resolved.pathname !== '/') {
        paths.add(resolved.pathname);
      }
    } catch {
      // skip malformed href
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

  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const hasDnsPrefetch = /<link[^>]+rel=["']dns-prefetch["']/i.test(html);
  const hasPreconnect = /<link[^>]+rel=["']preconnect["']/i.test(html);

  const scriptTags = html.match(/<script[^>]*>/gi) || [];
  const blockingScripts = scriptTags.filter(
    (tag) =>
      /src=/i.test(tag) &&
      !/\b(defer|async|type=["']module["'])\b/i.test(tag) &&
      !/type=["']speculationrules["']/i.test(tag)
  );

  const hasSpeculationRules = /type=["']speculationrules["']/i.test(html);
  const hasRobotsTxt = false;
  const hasSitemap = lower.includes('sitemap.xml') || /<loc>[^<]+sitemap/i.test(html);
  const hasSchema =
    lower.includes('application/ld+json') ||
    lower.includes('schema.org') ||
    lower.includes('localbusiness');

  const imgTags = html.match(/<img[^>]*>/gi) || [];
  const imagesWithoutLazy = imgTags.filter((tag) => !/\bloading=["']lazy["']/i.test(tag));
  const imagesWithoutAlt = imgTags.filter((tag) => !/\balt=["'][^"']+["']/i.test(tag));

  const externalOrigins = siteOrigin ? extractOrigins(html, siteOrigin) : [];

  return {
    hasCanonical,
    hasDnsPrefetch,
    hasPreconnect,
    blockingScriptCount: blockingScripts.length,
    hasSpeculationRules,
    hasRobotsTxt,
    hasSitemap,
    hasSchema,
    imagesWithoutLazy: imagesWithoutLazy.length,
    imagesWithoutAlt: imagesWithoutAlt.length,
    externalOriginCount: externalOrigins.length,
    externalOrigins,
    internalPaths: siteOrigin ? extractInternalPaths(html, siteOrigin) : [],
  };
}

function buildNetworkHintTags(origins) {
  const lines = ['<!-- SEO Expert: DNS Pre-Resolution & Preconnect -->'];

  for (const origin of origins) {
    lines.push(`<link rel="dns-prefetch" href="${origin}" />`);
    if (origin.includes('fonts.gstatic.com') || origin.includes('cdnjs')) {
      lines.push(`<link rel="preconnect" href="${origin}" crossorigin />`);
    } else {
      lines.push(`<link rel="preconnect" href="${origin}" />`);
    }
  }

  return lines.join('\n    ');
}

function injectAfterHeadOpen(html, block) {
  if (!block.trim()) return html;
  return html.replace(/<head([^>]*)>/i, (match) => `${match}\n    ${block}`);
}

function injectCanonical(html, canonicalUrl) {
  if (/<link[^>]+rel=["']canonical["']/i.test(html)) {
    return html;
  }
  const tag = `<link rel="canonical" href="${canonicalUrl}" />`;
  return injectAfterHeadOpen(html, `<!-- SEO Expert: Canonical URL -->\n    ${tag}`);
}

function injectNetworkHints(html, origins) {
  if (!origins.length) return html;
  if (
    /<link[^>]+rel=["']dns-prefetch["']/i.test(html) &&
    /<link[^>]+rel=["']preconnect["']/i.test(html)
  ) {
    return html;
  }
  return injectAfterHeadOpen(html, buildNetworkHintTags(origins));
}

function deferBlockingScripts(html) {
  return html.replace(/<script([^>]*src=[^>]*)>/gi, (full, attrs) => {
    if (/\b(defer|async|type=["']module["'])\b/i.test(attrs)) return full;
    if (/type=["']speculationrules["']/i.test(attrs)) return full;
    return `<script${attrs} defer>`;
  });
}

function injectSpeculationRules(html, internalPaths) {
  if (/type=["']speculationrules["']/i.test(html) || internalPaths.length < 2) {
    return html;
  }

  const urls = internalPaths.filter((p) => p !== '/').slice(0, 5);
  if (!urls.length) return html;

  const rules = {
    prerender: [{ source: 'list', urls }],
    prefetch: [{ source: 'list', urls }],
  };

  const block = `<!-- SEO Expert: Speculation Rules API -->
    <script type="speculationrules">
${JSON.stringify(rules, null, 2)}
    </script>`;

  return injectAfterHeadOpen(html, block);
}

function addLazyLoadingToImages(html) {
  return html.replace(/<img([^>]*)>/gi, (full, attrs) => {
    if (/\bloading=/i.test(attrs)) return full;
    return `<img${attrs} loading="lazy">`;
  });
}

function addAltPlaceholders(html, siteName) {
  return html.replace(/<img([^>]*)>/gi, (full, attrs) => {
    if (/\balt=["'][^"']*["']/i.test(attrs)) return full;
    const safeName = siteName.replace(/"/g, "'");
    return `<img${attrs} alt="${safeName} image">`;
  });
}

export function buildLocalBusinessSchema(url, businessInfo = {}, siteName = 'Local Business') {
  const canonical = normalizeCanonicalUrl(url);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: businessInfo.name?.trim() || siteName,
    url: canonical,
  };

  if (businessInfo.telephone?.trim()) {
    schema.telephone = businessInfo.telephone.trim();
  }
  if (businessInfo.openingHours?.trim()) {
    schema.openingHours = businessInfo.openingHours.trim();
  }
  if (businessInfo.address?.trim()) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: businessInfo.address.trim(),
    };
  }

  return schema;
}

function injectLocalBusinessSchema(html, schema) {
  if (/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?LocalBusiness/i.test(html)) {
    return html;
  }

  const block = `<!-- SEO Expert: Local Business Schema -->
    <script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
    </script>`;

  return injectAfterHeadOpen(html, block);
}

const SECURITY_HEADERS = {
  vercel: {
    headers: [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ],
  },
  firebase: {
    hosting: {
      headers: [
        {
          source: '**',
          headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
          ],
        },
      ],
    },
  },
};

export function generateSecurityHeadersPatch(existingContent, configType) {
  const template = SECURITY_HEADERS[configType];
  if (!template) return null;

  try {
    const parsed = JSON.parse(existingContent || '{}');
    if (configType === 'vercel') {
      parsed.headers = template.headers;
    } else if (configType === 'firebase') {
      parsed.hosting = parsed.hosting || {};
      parsed.hosting.headers = template.hosting.headers;
    }
    return JSON.stringify(parsed, null, 2) + '\n';
  } catch {
    return JSON.stringify(template, null, 2) + '\n';
  }
}

export function generateRobotsTxt(siteUrl) {
  const origin = new URL(siteUrl).origin;
  return `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
}

export function generateSitemapXml(siteUrl, paths = ['/']) {
  const origin = new URL(siteUrl).origin;
  const today = new Date().toISOString().slice(0, 10);
  const urls = [...new Set(paths)].map(
    (path) => `  <url>
    <loc>${origin}${path.startsWith('/') ? path : `/${path}`}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export function applyInfrastructureOptimizations(html, auditData, options = {}) {
  const { url, seoContent = {} } = auditData;
  const businessInfo = options.businessInfo || seoContent.businessInfo || {};
  const siteName = businessInfo.name || seoContent.customTitle || 'Your Site';

  let result = html;
  const fixes = [];

  const signals = buildInfrastructureSignals(html, url);
  const canonicalUrl = normalizeCanonicalUrl(url);

  if (!signals.hasCanonical) {
    result = injectCanonical(result, canonicalUrl);
    fixes.push('canonical');
  }

  if (!signals.hasDnsPrefetch || !signals.hasPreconnect) {
    result = injectNetworkHints(result, signals.externalOrigins);
    fixes.push('dns-prefetch/preconnect');
  }

  if (signals.blockingScriptCount > 0) {
    result = deferBlockingScripts(result);
    fixes.push(`defer-scripts(${signals.blockingScriptCount})`);
  }

  if (!signals.hasSpeculationRules && signals.internalPaths.length > 1) {
    result = injectSpeculationRules(result, signals.internalPaths);
    fixes.push('speculation-rules');
  }

  if (signals.imagesWithoutLazy > 0) {
    result = addLazyLoadingToImages(result);
    fixes.push(`lazy-images(${signals.imagesWithoutLazy})`);
  }

  if (signals.imagesWithoutAlt > 0) {
    result = addAltPlaceholders(result, siteName);
    fixes.push(`alt-tags(${signals.imagesWithoutAlt})`);
  }

  if (businessInfo.telephone?.trim() || businessInfo.openingHours?.trim()) {
    const schema = buildLocalBusinessSchema(url, businessInfo, siteName);
    result = injectLocalBusinessSchema(result, schema);
    fixes.push('local-business-schema');
  }

  return { html: result, fixes, signals };
}

export function listInfrastructureFixes(signals, businessInfo = {}) {
  const fixes = [];
  if (!signals.hasCanonical) fixes.push('canonical tag');
  if (!signals.hasDnsPrefetch || !signals.hasPreconnect) fixes.push('DNS pre-resolution');
  if (signals.blockingScriptCount > 0) fixes.push(`${signals.blockingScriptCount} blocking scripts`);
  if (!signals.hasSpeculationRules && signals.internalPaths.length > 1) fixes.push('speculation rules');
  if (signals.imagesWithoutLazy > 0) fixes.push(`${signals.imagesWithoutLazy} images without lazy load`);
  if (signals.imagesWithoutAlt > 0) fixes.push(`${signals.imagesWithoutAlt} images without alt`);
  if (!signals.hasSitemap) fixes.push('sitemap.xml');
  if (!signals.hasRobotsTxt) fixes.push('robots.txt');
  if (
    (businessInfo.telephone?.trim() || businessInfo.openingHours?.trim()) &&
    !signals.hasSchema
  ) {
    fixes.push('local business schema');
  }
  return fixes;
}
