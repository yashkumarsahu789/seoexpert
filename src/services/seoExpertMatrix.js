function getTechNames(auditData) {
  return (auditData.techStack?.technologies || []).map((t) => t.name.toLowerCase());
}

function deriveSiteName(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    const base = hostname.split('.')[0];
    return base
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
  } catch {
    return 'Your Site';
  }
}

function attrEquals(value, expected) {
  return String(value || '').trim().toLowerCase() === expected.toLowerCase();
}

export function buildHtmlSignals(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const hasSchema =
    doc.querySelector('script[type="application/ld+json"]') !== null ||
    doc.querySelector('[itemscope][itemtype]') !== null ||
    /schema\.org/i.test(html);

  const images = [...doc.querySelectorAll('img')];
  const hasLazyLoading = images.some((img) => attrEquals(img.getAttribute('loading'), 'lazy'));
  const hasWebP = images.some((img) => /\.webp(\?|$)/i.test(img.getAttribute('src') || ''));

  const hasViewport = [...doc.querySelectorAll('head meta')].some((el) =>
    attrEquals(el.getAttribute('name'), 'viewport')
  );

  const semanticTags = ['nav', 'main', 'article', 'footer'];
  const presentSemantic = semanticTags.filter((tag) => doc.querySelector(tag));

  return {
    hasSchema,
    hasLazyLoading,
    hasWebP,
    hasViewport,
    hasSemanticTags: presentSemantic.length >= 2,
    presentSemantic,
    missingSemantic: semanticTags.filter((tag) => !presentSemantic.includes(tag)),
  };
}

function detectThemeCategory(techNames, html = '') {
  const haystack = `${techNames.join(' ')} ${html.toLowerCase()}`;

  if (
    techNames.some((t) => ['react', 'next.js', 'vite', 'vue.js', 'angular', 'nuxt.js', 'gatsby'].some((k) => t.includes(k))) ||
    haystack.includes('_next/static') ||
    haystack.includes('__next_data__') ||
    haystack.includes('/assets/index-')
  ) {
    return 'spa';
  }

  if (techNames.some((t) => t.includes('wordpress') || t.includes('shopify') || t.includes('wix'))) {
    return 'cms';
  }

  return 'static';
}

const THEME_MATRIX = {
  spa: {
    label: 'React / Next.js / Vite SPA',
    topStrategy: 'Client-Side Metadata & JSON-LD Schema Injection',
    checks: [
      {
        id: 'schema',
        test: (ctx) => ctx.signals.hasSchema,
        issue: 'Missing JSON-LD Schema',
        severity: 'High',
        fix: 'React/Next components mein LocalBusiness ya WebSite JSON-LD schema inject karein taaki Google structured data samjhe.',
      },
      {
        id: 'title',
        test: (ctx) => ctx.metaTags.title.present,
        issue: 'Missing Dynamic Page Title',
        severity: 'High',
        fix: 'React Helmet / Next.js Head mein unique title tag set karein — blank SPA titles SEO kill karte hain.',
      },
    ],
  },
  cms: {
    label: 'WordPress / Shopify CMS',
    topStrategy: 'Core Web Vitals & Image Optimization',
    checks: [
      {
        id: 'lazy',
        test: (ctx) => ctx.signals.hasLazyLoading,
        issue: 'Missing Lazy Loading on Images',
        severity: 'Critical',
        fix: 'WordPress/Shopify images par loading="lazy" lagayein — site speed aur Core Web Vitals improve honge.',
      },
      {
        id: 'webp',
        test: (ctx) => ctx.signals.hasWebP,
        issue: 'No WebP Image Format Detected',
        severity: 'High',
        fix: 'Images ko WebP mein convert karein — CMS sites heavy hoti hain, WebP size 30-50% kam karta hai.',
      },
      {
        id: 'performance',
        test: (ctx) => ctx.scores.performance === null || ctx.scores.performance >= 70,
        issue: 'Low Core Web Vitals / Performance',
        severity: 'Critical',
        fix: 'Render-blocking CSS/JS hatao, caching plugin use karo, aur image compression on karo.',
      },
    ],
  },
  static: {
    label: 'Custom HTML / Bootstrap Template',
    topStrategy: 'Mobile Responsiveness & Semantic HTML Tags',
    checks: [
      {
        id: 'viewport',
        test: (ctx) => ctx.signals.hasViewport,
        issue: 'Missing Mobile Viewport Meta Tag',
        severity: 'Critical',
        fix: '<meta name="viewport" content="width=device-width, initial-scale=1.0"> add karein — bina iske mobile SEO fail hota hai.',
      },
      {
        id: 'semantic',
        test: (ctx) => ctx.signals.hasSemanticTags,
        issue: 'Missing Semantic HTML Tags',
        severity: 'High',
        fix: 'Template mein <nav>, <main>, <article>, <footer> tags add karein — Google crawlers ko structure samajhne mein madad milti hai.',
      },
    ],
  },
};

const INFRASTRUCTURE_CHECKS = [
  {
    id: 'canonical',
    test: (ctx) => ctx.infrastructure?.hasCanonical,
    issue: 'Missing Canonical Tag',
    severity: 'High',
    fix: 'Duplicate content rokne ke liye <link rel="canonical"> inject karein.',
  },
  {
    id: 'dns-prefetch',
    test: (ctx) => ctx.infrastructure?.hasDnsPrefetch && ctx.infrastructure?.hasPreconnect,
    issue: 'Missing DNS Pre-Resolution / Preconnect',
    severity: 'High',
    fix: 'Google Fonts aur CDN ke liye dns-prefetch + preconnect tags lagayein.',
  },
  {
    id: 'blocking-scripts',
    test: (ctx) => !ctx.infrastructure?.blockingScriptCount,
    issue: 'Render-Blocking Scripts Detected',
    severity: 'Critical',
    fix: 'External scripts mein defer/async add karein — speed score 90+.',
  },
  {
    id: 'speculation-rules',
    test: (ctx) => ctx.infrastructure?.hasSpeculationRules || (ctx.infrastructure?.internalPaths?.length || 0) <= 1,
    issue: 'Missing Speculation Rules API',
    severity: 'Medium',
    fix: 'Chrome Speculation Rules inject karein — instant page navigation.',
  },
  {
    id: 'robots-sitemap',
    test: (ctx) => ctx.infrastructure?.hasRobotsTxt && ctx.infrastructure?.hasSitemap,
    issue: 'Missing robots.txt or sitemap.xml',
    severity: 'Critical',
    fix: 'robots.txt aur sitemap.xml auto-generate karein — crawling 10x fast.',
  },
];

const UNIVERSAL_CHECKS = [
  {
    id: 'meta-description',
    test: (ctx) => ctx.metaTags.description.present,
    issue: 'Missing Meta Description',
    severity: 'High',
    fix: (ctx) =>
      `Custom meta description likhein: "${ctx.siteName} ke baare mein 1-2 lines" — generic text duplicate SEO ko nuksan pahunchata hai.`,
  },
  {
    id: 'og',
    test: (ctx) => ctx.metaTags.openGraph.titlePresent && ctx.metaTags.openGraph.descriptionPresent,
    issue: 'Incomplete OpenGraph Tags',
    severity: 'Medium',
    fix: 'og:title aur og:description add karein — social sharing aur Google Discover ke liye zaroori.',
  },
  {
    id: 'h1',
    test: (ctx) => ctx.headings.counts.h1 === 1,
    issue: 'H1 Heading Issue',
    severity: 'High',
    fix: (ctx) =>
      ctx.headings.counts.h1 === 0
        ? 'Page par ek clear H1 heading add karein — yeh page ka main topic batata hai.'
        : 'Sirf ek H1 rakhein — multiple H1 tags SEO confuse karte hain.',
  },
];

function runChecks(checks, ctx) {
  const missing = [];
  const passed = [];

  for (const check of checks) {
    const ok = check.test(ctx);
    if (ok) {
      passed.push({ id: check.id, label: check.issue, status: 'pass' });
    } else {
      missing.push({
        id: check.id,
        issue: check.issue,
        severity: check.severity,
        fix: typeof check.fix === 'function' ? check.fix(ctx) : check.fix,
        status: 'missing',
      });
    }
  }

  return { missing, passed };
}

export function generateExpertSuggestions(auditData, html = '') {
  const techNames = getTechNames(auditData);
  const signals = buildHtmlSignals(html);
  const category = detectThemeCategory(techNames, html);
  const theme = THEME_MATRIX[category];
  const siteName = deriveSiteName(auditData.url);

  const ctx = {
    techNames,
    signals,
    infrastructure: auditData.infrastructure || {},
    metaTags: auditData.lighthouse?.metaTags || {},
    headings: auditData.lighthouse?.headings || { counts: { h1: 0 } },
    scores: auditData.lighthouse?.scores || { performance: null },
    siteName,
  };

  const themeResult = runChecks(theme.checks, ctx);
  const infraResult = runChecks(INFRASTRUCTURE_CHECKS, ctx);
  const universalResult = runChecks(UNIVERSAL_CHECKS, ctx);

  const suggestions = [...infraResult.missing, ...themeResult.missing, ...universalResult.missing];
  const passedChecks = [...infraResult.passed, ...themeResult.passed, ...universalResult.passed];

  return {
    detectedTheme: theme.label,
    themeCategory: category,
    currentTopStrategyForThisTheme: theme.topStrategy,
    suggestions,
    passedChecks,
    htmlSignals: signals,
    seoIssues: [...new Set([...(auditData.seoIssues || []), ...suggestions.map((s) => s.issue)])],
  };
}
