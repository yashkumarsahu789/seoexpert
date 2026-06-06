function attrEquals(value, expected) {
  return String(value || '').trim().toLowerCase() === expected.toLowerCase();
}

function linkHasRel(el, rel) {
  const value = String(el.getAttribute('rel') || '').toLowerCase();
  return value.split(/\s+/).includes(rel.toLowerCase());
}

export function buildInfrastructureSignals(html = '', url = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let siteOrigin = '';

  try {
    siteOrigin = new URL(url).origin;
  } catch {
    siteOrigin = '';
  }

  const hasCanonical = [...doc.querySelectorAll('head link')].some((el) => linkHasRel(el, 'canonical'));
  const hasDnsPrefetch = [...doc.querySelectorAll('head link')].some((el) => linkHasRel(el, 'dns-prefetch'));
  const hasPreconnect = [...doc.querySelectorAll('head link')].some((el) => linkHasRel(el, 'preconnect'));

  const scripts = [...doc.querySelectorAll('script[src]')];
  const blockingScripts = scripts.filter((el) => {
    const type = String(el.getAttribute('type') || '').toLowerCase();
    if (el.hasAttribute('defer') || el.hasAttribute('async')) return false;
    if (type === 'module' || type === 'speculationrules') return false;
    return true;
  });

  const images = [...doc.querySelectorAll('img')];
  const hasSpeculationRules = [...doc.querySelectorAll('script')].some((el) =>
    attrEquals(el.getAttribute('type'), 'speculationrules')
  );

  const hasSchema =
    doc.querySelector('script[type="application/ld+json"]') !== null ||
    doc.querySelector('[itemscope][itemtype]') !== null ||
    /schema\.org/i.test(html);

  const externalOrigins = new Set();
  [...doc.querySelectorAll('script[src], link[href], img[src]')].forEach((el) => {
    const src = el.getAttribute('src') || el.getAttribute('href');
    if (!src || !/^https?:\/\//i.test(src)) return;
    try {
      const origin = new URL(src).origin;
      if (siteOrigin && origin !== siteOrigin) externalOrigins.add(origin);
    } catch {
      // skip
    }
  });

  const internalPaths = new Set(['/']);
  [...doc.querySelectorAll('a[href]')].forEach((el) => {
    const href = String(el.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
    try {
      const resolved = href.startsWith('http') ? new URL(href) : new URL(href, siteOrigin || url);
      if (!siteOrigin || resolved.origin === siteOrigin) internalPaths.add(resolved.pathname || '/');
    } catch {
      // skip
    }
  });

  return {
    hasCanonical,
    hasDnsPrefetch,
    hasPreconnect,
    blockingScriptCount: blockingScripts.length,
    hasSpeculationRules,
    hasRobotsTxt: false,
    hasSitemap: false,
    hasSchema,
    imagesWithoutLazy: images.filter((img) => !img.getAttribute('loading')).length,
    imagesWithoutAlt: images.filter((img) => !String(img.getAttribute('alt') || '').trim()).length,
    externalOriginCount: externalOrigins.size,
    externalOrigins: [...externalOrigins],
    internalPaths: [...internalPaths].slice(0, 8),
  };
}
