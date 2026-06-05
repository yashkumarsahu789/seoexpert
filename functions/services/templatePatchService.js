export function deriveSiteName(url) {
  const hostname = new URL(url).hostname.replace(/^www\./i, '');
  const base = hostname.split('.')[0];

  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

export function buildSeoTemplates(url) {
  const siteName = deriveSiteName(url);
  const title = `Welcome to ${siteName}`;
  const description = `Explore updates, services, and official platform features on ${siteName}.`;

  return { siteName, title, description };
}

function hasMetaTag(html, pattern) {
  return pattern.test(html);
}

export function applySeoTemplates(html, auditData) {
  const { title, description, siteName } = buildSeoTemplates(auditData.url);
  const { metaTags } = auditData.lighthouse;
  let result = html;
  const insertions = [];

  if (!metaTags.title.present) {
    if (hasMetaTag(result, /<title[^>]*>[\s\S]*?<\/title>/i)) {
      result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
    } else {
      insertions.push(`<title>${title}</title>`);
    }
  }

  if (!metaTags.description.present && !hasMetaTag(result, /<meta[^>]+name=["']description["']/i)) {
    insertions.push(`<meta name="description" content="${description}" />`);
  }

  if (!metaTags.openGraph.titlePresent && !hasMetaTag(result, /<meta[^>]+property=["']og:title["']/i)) {
    insertions.push(`<meta property="og:title" content="${title}" />`);
  }

  if (!metaTags.openGraph.descriptionPresent && !hasMetaTag(result, /<meta[^>]+property=["']og:description["']/i)) {
    insertions.push(`<meta property="og:description" content="${description}" />`);
  }

  if (!hasMetaTag(result, /<meta[^>]+property=["']og:type["']/i)) {
    insertions.push('<meta property="og:type" content="website" />');
  }

  if (insertions.length > 0) {
    result = result.replace(/<head([^>]*)>/i, (match) => `${match}\n    ${insertions.join('\n    ')}`);
  }

  return result;
}

function listFixableIssues(auditData) {
  const issues = [];
  const { metaTags } = auditData.lighthouse;

  if (!metaTags.title.present) issues.push('title');
  if (!metaTags.description.present) issues.push('meta description');
  if (!metaTags.openGraph.titlePresent) issues.push('og:title');
  if (!metaTags.openGraph.descriptionPresent) issues.push('og:description');

  return issues;
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
  const fixable = listFixableIssues(auditData);

  if (fixable.length === 0) {
    return {
      patches: [],
      summary: 'No missing meta tags — template fixes not required.',
    };
  }

  const { siteName } = buildSeoTemplates(auditData.url);

  return {
    patches: [
      {
        path: 'index.html',
        mode: 'template',
        auditData,
        fallbackContent: applySeoTemplates(DEFAULT_HTML, auditData),
      },
    ],
    summary: `Instant template fixes for ${siteName}: ${fixable.join(', ')}`,
  };
}
