function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function deriveSiteName(url) {
  const hostname = new URL(url).hostname.replace(/^www\./i, '');
  const base = hostname.split('.')[0];
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

async function fetchHtml(url) {
  const targets = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  let lastError = 'Could not fetch website';

  for (const proxyUrl of targets) {
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;
      const html = await res.text();
      if (html && html.length > 100) return html;
    } catch (err) {
      lastError = err.message || lastError;
    }
  }

  throw new Error(lastError);
}

function detectTechnologies(html, url) {
  const technologies = [];
  const haystack = html.toLowerCase();
  const host = new URL(url).hostname.toLowerCase();

  const rules = [
    { name: 'React', match: () => haystack.includes('react') || haystack.includes('_next/static') },
    { name: 'Next.js', match: () => haystack.includes('_next/static') || haystack.includes('__next') },
    { name: 'Vue.js', match: () => haystack.includes('vue') || haystack.includes('data-v-') },
    { name: 'Angular', match: () => haystack.includes('ng-version') || haystack.includes('angular') },
    { name: 'WordPress', match: () => haystack.includes('wp-content') || haystack.includes('wordpress') },
    { name: 'Shopify', match: () => haystack.includes('cdn.shopify.com') || host.includes('myshopify') },
    { name: 'Bootstrap', match: () => haystack.includes('bootstrap') },
    { name: 'Tailwind CSS', match: () => haystack.includes('tailwind') },
    { name: 'jQuery', match: () => haystack.includes('jquery') },
    { name: 'Google Analytics', match: () => haystack.includes('google-analytics') || haystack.includes('gtag') },
    { name: 'Cloudflare', match: () => haystack.includes('cloudflare') },
  ];

  for (const rule of rules) {
    if (rule.match()) {
      technologies.push({
        name: rule.name,
        categories: ['Detected from HTML'],
        confidence: 80,
        version: null,
      });
    }
  }

  return technologies;
}

function parseAuditFromHtml(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc.querySelector('title')?.textContent?.trim() || '';
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
  const ogTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || '';
  const ogDescription =
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';

  const headings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  for (let i = 1; i <= 6; i += 1) {
    headings[`h${i}`] = doc.querySelectorAll(`h${i}`).length;
  }

  const metaTags = {
    title: { present: Boolean(title), value: title || null, score: title ? 1 : 0 },
    description: { present: Boolean(description), value: description || null, score: description ? 1 : 0 },
    openGraph: {
      titlePresent: Boolean(ogTitle || doc.querySelector('meta[property="og:title"]')),
      descriptionPresent: Boolean(ogDescription || doc.querySelector('meta[property="og:description"]')),
    },
  };

  const seoIssues = [];
  if (!metaTags.title.present) seoIssues.push('Missing Title Tag');
  if (!metaTags.description.present) seoIssues.push('Missing Meta Description');
  if (!metaTags.openGraph.titlePresent) seoIssues.push('Missing OpenGraph Title');
  if (!metaTags.openGraph.descriptionPresent) seoIssues.push('Missing OpenGraph Description');
  if (headings.h1 === 0) seoIssues.push('Missing H1 on Homepage');
  if (headings.h1 > 1) seoIssues.push('Multiple H1 tags on page');

  const technologies = detectTechnologies(html, url);

  return {
    url,
    timestamp: new Date().toISOString(),
    mode: 'client',
    techStack: { technologies, error: null },
    lighthouse: {
      scores: { performance: null, accessibility: null, seo: null },
      metaTags,
      headings: {
        counts: headings,
        hasH1: headings.h1 > 0,
        multipleH1: headings.h1 > 1,
        issues: seoIssues.filter((i) => i.includes('H1')),
      },
      error: null,
      note: 'Lighthouse scores require Firebase Blaze backend. Meta tags and tech stack analyzed in browser.',
    },
    seoIssues,
    success: true,
    siteName: deriveSiteName(url),
  };
}

export async function auditWebsiteClient(urlInput) {
  const url = normalizeUrl(urlInput);
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  const html = await fetchHtml(url);
  return parseAuditFromHtml(html, url);
}

export function shouldUseClientAudit() {
  if (import.meta.env.VITE_FORCE_CLIENT_AUDIT === 'true') return true;
  if (import.meta.env.DEV) return false;
  return window.location.hostname.endsWith('github.io');
}
