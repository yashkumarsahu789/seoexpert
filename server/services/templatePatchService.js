import {
  applyInfrastructureOptimizations,
  generateRobotsTxt,
  generateSitemapXml,
  listInfrastructureFixes,
} from './infrastructurePatchService.js';

export function deriveSiteName(url) {
  const hostname = new URL(url).hostname.replace(/^www\./i, '');
  const base = hostname.split('.')[0];

  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function escapeAttr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildSeoTemplates(url, seoContent = {}) {
  const siteName = deriveSiteName(url);
  const title =
    seoContent.customTitle?.trim() ||
    seoContent.title?.trim() ||
    `Welcome to ${siteName}`;
  const description =
    seoContent.customDescription?.trim() ||
    seoContent.description?.trim() ||
    `Explore updates, services, and official platform features on ${siteName}.`;

  return {
    siteName,
    title: escapeAttr(title),
    description: escapeAttr(description),
    rawTitle: title,
    rawDescription: description,
  };
}

function hasMetaTag(html, pattern) {
  return pattern.test(html);
}

export function applySeoTemplates(html, auditData) {
  const { title, description } = buildSeoTemplates(auditData.url, auditData.seoContent);
  const { metaTags } = auditData.lighthouse;
  let result = html;
  const insertions = [];

  if (!metaTags.title.present) {
    if (hasMetaTag(result, /<title[^>]*>[\s\S]*?<\/title>/i)) {
      result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    } else {
      insertions.push(`<title>${title}</title>`);
    }
  } else if (auditData.seoContent?.customTitle?.trim()) {
    result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  }

  if (!metaTags.description.present && !hasMetaTag(result, /<meta[^>]+name=["']description["']/i)) {
    insertions.push(`<meta name="description" content="${description}" />`);
  } else if (auditData.seoContent?.customDescription?.trim()) {
    if (hasMetaTag(result, /<meta[^>]+name=["']description["']/i)) {
      result = result.replace(
        /<meta[^>]+name=["']description["'][^>]*>/i,
        `<meta name="description" content="${description}" />`
      );
    } else {
      insertions.push(`<meta name="description" content="${description}" />`);
    }
  }

  if (!metaTags.openGraph.titlePresent && !hasMetaTag(result, /<meta[^>]+property=["']og:title["']/i)) {
    insertions.push(`<meta property="og:title" content="${title}" />`);
  } else if (auditData.seoContent?.customTitle?.trim()) {
    insertions.push(`<meta property="og:title" content="${title}" />`);
  }

  if (!metaTags.openGraph.descriptionPresent && !hasMetaTag(result, /<meta[^>]+property=["']og:description["']/i)) {
    insertions.push(`<meta property="og:description" content="${description}" />`);
  } else if (auditData.seoContent?.customDescription?.trim()) {
    insertions.push(`<meta property="og:description" content="${description}" />`);
  }

  if (!hasMetaTag(result, /<meta[^>]+property=["']og:type["']/i)) {
    insertions.push('<meta property="og:type" content="website" />');
  }

  if (insertions.length > 0) {
    result = result.replace(/<head([^>]*)>/i, (match) => `${match}\n    ${insertions.join('\n    ')}`);
  }

  const infra = applyInfrastructureOptimizations(result, auditData);
  return infra.html;
}

function listFixableIssues(auditData) {
  const issues = [];
  const { metaTags } = auditData.lighthouse;
  const hasCustomContent =
    auditData.seoContent?.customTitle?.trim() || auditData.seoContent?.customDescription?.trim();

  if (!metaTags.title.present || hasCustomContent) issues.push('title');
  if (!metaTags.description.present || hasCustomContent) issues.push('meta description');
  if (!metaTags.openGraph.titlePresent || auditData.seoContent?.customTitle?.trim()) {
    issues.push('og:title');
  }
  if (!metaTags.openGraph.descriptionPresent || auditData.seoContent?.customDescription?.trim()) {
    issues.push('og:description');
  }

  return [...new Set(issues)];
}

const DEFAULT_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body></body>
</html>`;

export function generateSeoPatches(auditData) {
  if (!auditData.seoContent?.customTitle?.trim()) {
    throw new Error('Custom website title is required for SEO patch');
  }
  if (!auditData.seoContent?.customDescription?.trim()) {
    throw new Error('Custom meta description is required for SEO patch');
  }

  const fixable = listFixableIssues(auditData);
  const { siteName, rawTitle } = buildSeoTemplates(auditData.url, auditData.seoContent);
  const infraPreview = applyInfrastructureOptimizations(DEFAULT_HTML, auditData);
  const infraFixes = listInfrastructureFixes(
    auditData.infrastructure || infraPreview.signals,
    auditData.seoContent?.businessInfo
  );

  const patches = [
    {
      path: 'index.html',
      mode: 'template',
      auditData,
      fallbackContent: applySeoTemplates(DEFAULT_HTML, auditData),
    },
  ];

  const signals = auditData.infrastructure || infraPreview.signals;
  if (!signals.hasRobotsTxt) {
    patches.push({
      path: 'robots.txt',
      mode: 'content',
      content: generateRobotsTxt(auditData.url),
    });
  }

  if (!signals.hasSitemap) {
    patches.push({
      path: 'sitemap.xml',
      mode: 'content',
      content: generateSitemapXml(auditData.url, signals.internalPaths || ['/']),
    });
  }

  patches.push(
    {
      path: 'vercel.json',
      mode: 'security-headers',
      configType: 'vercel',
    },
    {
      path: 'firebase.json',
      mode: 'security-headers',
      configType: 'firebase',
    }
  );

  const allFixes = [...fixable, ...infraFixes];

  return {
    patches,
    infrastructureFixes: infraPreview.fixes,
    summary: `Autonomous SEO surgery for ${siteName}: "${rawTitle}" → ${allFixes.join(', ') || 'meta tags'}`,
  };
}
