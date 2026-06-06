import * as cheerio from 'cheerio';

function loadDocument(html = '') {
  return cheerio.load(html, { decodeEntities: true });
}

function attrEquals(value, expected) {
  return String(value || '').trim().toLowerCase() === expected.toLowerCase();
}

function metaByName($, name) {
  let found = null;
  $('head meta').each((_, el) => {
    const $el = $(el);
    if (attrEquals($el.attr('name'), name)) {
      found = $el;
      return false;
    }
    return undefined;
  });
  return found;
}

function metaByProperty($, property) {
  let found = null;
  $('head meta').each((_, el) => {
    const $el = $(el);
    if (attrEquals($el.attr('property'), property)) {
      found = $el;
      return false;
    }
    return undefined;
  });
  return found;
}

function linkByRel($, rel) {
  let found = null;
  $('head link').each((_, el) => {
    const $el = $(el);
    const relValue = String($el.attr('rel') || '').toLowerCase();
    if (relValue.split(/\s+/).includes(rel.toLowerCase())) {
      found = $el;
      return false;
    }
    return undefined;
  });
  return found;
}

export function parseMetaFromHtml(html = '') {
  const $ = loadDocument(html);
  const title = $('head title').first().text().trim();
  const description = metaByName($, 'description')?.attr('content')?.trim() || '';
  const ogTitle = metaByProperty($, 'og:title')?.attr('content')?.trim() || '';
  const ogDescription = metaByProperty($, 'og:description')?.attr('content')?.trim() || '';
  const ogType = metaByProperty($, 'og:type')?.attr('content')?.trim() || '';
  const canonical = linkByRel($, 'canonical')?.attr('href')?.trim() || '';
  const viewport = metaByName($, 'viewport')?.attr('content')?.trim() || '';

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogType,
    canonical,
    viewport,
    hasTitle: Boolean(title),
    hasDescription: Boolean(description),
    hasOgTitle: Boolean(ogTitle),
    hasOgDescription: Boolean(ogDescription),
    hasCanonical: Boolean(canonical),
    hasViewport: Boolean(viewport),
  };
}

export function parseHeadingsFromHtml(html = '') {
  const $ = loadDocument(html);
  const counts = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };

  for (let i = 1; i <= 6; i += 1) {
    counts[`h${i}`] = $(`h${i}`).length;
  }

  return {
    counts,
    hasH1: counts.h1 > 0,
    multipleH1: counts.h1 > 1,
  };
}

export function parseHtmlSignals(html = '') {
  const $ = loadDocument(html);
  const meta = parseMetaFromHtml(html);

  const hasSchema =
    $('script[type="application/ld+json"]').length > 0 ||
    $('[itemscope][itemtype]').length > 0 ||
    /schema\.org/i.test($.html());

  const images = $('img').toArray();
  const lazyImages = images.filter((el) => attrEquals($(el).attr('loading'), 'lazy'));
  const webpImages = images.filter((el) => /\.webp(\?|$)/i.test($(el).attr('src') || ''));

  const semanticTags = ['nav', 'main', 'article', 'footer'];
  const presentSemantic = semanticTags.filter((tag) => $(tag).length > 0);

  return {
    hasSchema,
    hasLazyLoading: lazyImages.length > 0,
    hasWebP: webpImages.length > 0,
    hasViewport: meta.hasViewport,
    hasSemanticTags: presentSemantic.length >= 2,
    presentSemantic,
    missingSemantic: semanticTags.filter((tag) => !presentSemantic.includes(tag)),
  };
}

export function parseInfrastructureFromHtml(html = '', url = '') {
  const $ = loadDocument(html);
  const meta = parseMetaFromHtml(html);

  let siteOrigin = '';
  try {
    siteOrigin = new URL(url).origin;
  } catch {
    siteOrigin = '';
  }

  const scripts = $('script[src]').toArray();
  const blockingScripts = scripts.filter((el) => {
    const $el = $(el);
    const defer = $el.attr('defer') !== undefined;
    const async = $el.attr('async') !== undefined;
    const type = String($el.attr('type') || '').toLowerCase();
    if (defer || async || type === 'module' || type === 'speculationrules') return false;
    return true;
  });

  const images = $('img').toArray();
  const imagesWithoutLazy = images.filter((el) => !$(el).attr('loading'));
  const imagesWithoutAlt = images.filter((el) => !String($(el).attr('alt') || '').trim());

  const externalOrigins = new Set();
  $('script[src], link[href], img[src]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('href');
    if (!src || !/^https?:\/\//i.test(src)) return;
    try {
      const origin = new URL(src).origin;
      if (siteOrigin && origin !== siteOrigin) externalOrigins.add(origin);
    } catch {
      // skip
    }
  });

  const internalPaths = new Set(['/']);
  $('a[href]').each((_, el) => {
    const href = String($(el).attr('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const resolved = href.startsWith('http') ? new URL(href) : new URL(href, siteOrigin || url);
      if (!siteOrigin || resolved.origin === siteOrigin) internalPaths.add(resolved.pathname || '/');
    } catch {
      // skip
    }
  });

  return {
    hasCanonical: meta.hasCanonical || $('link[rel*="canonical"]').length > 0,
    hasDnsPrefetch: $('link[rel*="dns-prefetch"]').length > 0,
    hasPreconnect: $('link[rel*="preconnect"]').length > 0,
    blockingScriptCount: blockingScripts.length,
    hasSpeculationRules: $('script[type="speculationrules"]').length > 0,
    hasRobotsTxt: false,
    hasSitemap: false,
    hasSchema: parseHtmlSignals(html).hasSchema,
    imagesWithoutLazy: imagesWithoutLazy.length,
    imagesWithoutAlt: imagesWithoutAlt.length,
    externalOriginCount: externalOrigins.size,
    externalOrigins: [...externalOrigins],
    internalPaths: [...internalPaths].slice(0, 8),
  };
}

export function extractLighthouseRenderedSignals(lhr) {
  const audits = lhr?.audits || {};
  const score = (id) => audits[id]?.score;
  const passed = (id) => score(id) === 1;
  const failed = (id) => score(id) === 0;

  const renderBlockingItems = audits['render-blocking-resources']?.details?.items || [];

  return {
    lighthouseAvailable: true,
    hasTitle: passed('document-title'),
    hasDescription: passed('meta-description'),
    hasOgTitle: passed('meta-og:title') || passed('meta-og-title'),
    hasOgDescription: passed('meta-og:description') || passed('meta-og-description'),
    hasCanonical: passed('canonical'),
    hasViewport: passed('viewport'),
    hasSchema: passed('structured-data'),
    hasRenderBlocking: failed('render-blocking-resources'),
    renderBlockingCount: renderBlockingItems.length,
  };
}

export function mergeMetaTags(lighthouseMeta = {}, html = '', rendered = {}) {
  const parsed = parseMetaFromHtml(html);
  const lh = rendered.lighthouseAvailable ? rendered : null;

  const titlePresent =
    lighthouseMeta.title?.present ||
    parsed.hasTitle ||
    lh?.hasTitle ||
    false;

  const descriptionPresent =
    lighthouseMeta.description?.present ||
    parsed.hasDescription ||
    lh?.hasDescription ||
    false;

  const ogTitlePresent =
    lighthouseMeta.openGraph?.titlePresent ||
    parsed.hasOgTitle ||
    lh?.hasOgTitle ||
    false;

  const ogDescriptionPresent =
    lighthouseMeta.openGraph?.descriptionPresent ||
    parsed.hasOgDescription ||
    lh?.hasOgDescription ||
    false;

  return {
    title: {
      present: titlePresent,
      value: lighthouseMeta.title?.value || parsed.title || null,
      score: titlePresent ? 1 : 0,
    },
    description: {
      present: descriptionPresent,
      value: lighthouseMeta.description?.value || parsed.description || null,
      score: descriptionPresent ? 1 : 0,
    },
    openGraph: {
      titlePresent: ogTitlePresent,
      descriptionPresent: ogDescriptionPresent,
    },
  };
}

export function mergeHeadings(lighthouseHeadings = {}, html = '') {
  const parsed = parseHeadingsFromHtml(html);
  const lhCounts = lighthouseHeadings.counts || {};
  const lhHasData = Object.values(lhCounts).some((n) => n > 0);

  const counts = lhHasData
    ? lhCounts
    : parsed.counts;

  return {
    counts,
    hasH1: counts.h1 > 0,
    multipleH1: counts.h1 > 1,
    issues: lighthouseHeadings.issues || [],
  };
}

export function mergeHtmlSignals(rawSignals = {}, rendered = {}) {
  if (!rendered.lighthouseAvailable) return rawSignals;

  return {
    ...rawSignals,
    hasSchema: rawSignals.hasSchema || rendered.hasSchema,
    hasViewport: rawSignals.hasViewport || rendered.hasViewport,
    hasLazyLoading: rawSignals.hasLazyLoading || !rendered.hasRenderBlocking,
  };
}

export function mergeInfrastructureSignals(rawSignals = {}, rendered = {}, crawlerFiles = {}) {
  const merged = {
    ...rawSignals,
    ...crawlerFiles,
  };

  if (!rendered.lighthouseAvailable) return merged;

  return {
    ...merged,
    hasCanonical: rawSignals.hasCanonical || rendered.hasCanonical,
    hasSchema: rawSignals.hasSchema || rendered.hasSchema,
    blockingScriptCount:
      rendered.hasRenderBlocking === false ? 0 : rawSignals.blockingScriptCount,
  };
}

export function hasMetaInHtml(html, { name, property } = {}) {
  const $ = loadDocument(html);
  if (name) return Boolean(metaByName($, name));
  if (property) return Boolean(metaByProperty($, property));
  return false;
}

export function hasTitleInHtml(html) {
  return parseMetaFromHtml(html).hasTitle;
}
