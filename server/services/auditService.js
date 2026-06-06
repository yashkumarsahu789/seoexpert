import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import Wappalyzer from 'wappalyzer';
import { generateExpertSuggestions } from './seoExpertMatrix.js';
import { buildInfrastructureSignals } from './infrastructurePatchService.js';

const AUDIT_TIMEOUT_MS = 120000;

async function fetchPageHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SEOExpertBot/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

async function checkCrawlerFiles(url) {
  const origin = new URL(url).origin;
  const [robotsRes, sitemapRes] = await Promise.allSettled([
    fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(8000) }),
    fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(8000) }),
  ]);

  return {
    hasRobotsTxt: robotsRes.status === 'fulfilled' && robotsRes.value.ok,
    hasSitemap: sitemapRes.status === 'fulfilled' && sitemapRes.value.ok,
  };
}

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function extractMetaTags(lhr) {
  const audits = lhr.audits || {};
  const titleAudit = audits['document-title'];
  const descAudit = audits['meta-description'];
  const ogTitle = audits['meta-og:title'] || audits['meta-og-title'];
  const ogDesc = audits['meta-og:description'] || audits['meta-og-description'];

  return {
    title: {
      present: titleAudit?.score === 1,
      value: titleAudit?.details?.items?.[0]?.node?.nodeLabel || null,
      score: titleAudit?.score ?? null,
    },
    description: {
      present: descAudit?.score === 1,
      value: descAudit?.details?.items?.[0]?.node?.nodeLabel || null,
      score: descAudit?.score ?? null,
    },
    openGraph: {
      titlePresent: ogTitle?.score === 1,
      descriptionPresent: ogDesc?.score === 1,
    },
  };
}

function extractHeadingHierarchy(lhr) {
  const headings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const headingsAudit = lhr.audits?.['heading-order'];
  const items = headingsAudit?.details?.items || [];

  for (const item of items) {
    const tag = item.node?.snippet?.match(/^<h([1-6])/i)?.[1];
    if (tag) {
      headings[`h${tag}`] = (headings[`h${tag}`] || 0) + 1;
    }
  }

  if (Object.values(headings).every((v) => v === 0)) {
    const domSize = lhr.audits?.['dom-size']?.details?.items || [];
    for (const item of domSize) {
      const match = item.statistic?.match(/^h([1-6])$/i);
      if (match) {
        headings[`h${match[1].toLowerCase()}`] = parseInt(item.value, 10) || 0;
      }
    }
  }

  return {
    counts: headings,
    hasH1: headings.h1 > 0,
    multipleH1: headings.h1 > 1,
    issues: buildHeadingIssues(headings),
  };
}

function buildHeadingIssues(headings) {
  const issues = [];
  if (headings.h1 === 0) issues.push('Missing H1 tag');
  if (headings.h1 > 1) issues.push('Multiple H1 tags detected');
  return issues;
}

function buildSeoIssues(scores, metaTags, headings) {
  const issues = [];

  if (!metaTags.title.present) issues.push('Missing Title Tag');
  if (!metaTags.description.present) issues.push('Missing Meta Description');
  if (!metaTags.openGraph.titlePresent) issues.push('Missing OpenGraph Title');
  if (!metaTags.openGraph.descriptionPresent) issues.push('Missing OpenGraph Description');
  if (headings.counts.h1 === 0) issues.push('Missing H1 on Homepage');
  if (headings.multipleH1) issues.push('Multiple H1 tags on page');

  if (scores.performance !== null && scores.performance < 50) {
    issues.push('Low Performance Score');
  }
  if (scores.performance !== null && scores.performance < 70) {
    issues.push('Low Mobile Speed Score');
  }
  if (scores.accessibility !== null && scores.accessibility < 80) {
    issues.push('Low Accessibility Score');
  }
  if (scores.seo !== null && scores.seo < 80) {
    issues.push('Low SEO Score');
  }

  return [...new Set(issues)];
}

async function detectTechStack(url) {
  const wappalyzer = new Wappalyzer({ debug: false, maxDepth: 1, maxUrls: 1 });
  try {
    await wappalyzer.init();
    const site = await wappalyzer.open(url);
    const results = await site.analyze();
    await site.destroy();
    await wappalyzer.destroy();

    const technologies = (results || []).map((tech) => ({
      name: tech.name,
      categories: tech.categories?.map((c) => c.name) || [],
      confidence: tech.confidence,
      version: tech.version || null,
    }));

    return { technologies, error: null };
  } catch (err) {
    try {
      await wappalyzer.destroy();
    } catch {
      /* ignore cleanup errors */
    }
    return {
      technologies: [],
      error: err.message || 'Tech stack detection failed',
    };
  }
}

async function runLighthouseAudit(url) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    const options = {
      logLevel: 'error',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'seo'],
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 375, height: 667, deviceScaleFactor: 2 },
    };

    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;

    const scores = {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
      seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
    };

    const metaTags = extractMetaTags(lhr);
    const headings = extractHeadingHierarchy(lhr);
    const seoIssues = buildSeoIssues(scores, metaTags, headings);

    return {
      scores,
      metaTags,
      headings,
      seoIssues,
      error: null,
    };
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

export async function auditWebsite(rawUrl) {
  const url = normalizeUrl(rawUrl);

  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Audit timed out — website may be blocking scrapers')), AUDIT_TIMEOUT_MS);
  });

  const auditPromise = (async () => {
    const [techStack, lighthouseResult] = await Promise.allSettled([
      detectTechStack(url),
      runLighthouseAudit(url),
    ]);

    const tech =
      techStack.status === 'fulfilled'
        ? techStack.value
        : { technologies: [], error: techStack.reason?.message || 'Tech detection failed' };

    const lighthouseData =
      lighthouseResult.status === 'fulfilled'
        ? lighthouseResult.value
        : {
            scores: { performance: null, accessibility: null, seo: null },
            metaTags: {
              title: { present: false, value: null, score: null },
              description: { present: false, value: null, score: null },
              openGraph: { titlePresent: false, descriptionPresent: false },
            },
            headings: {
              counts: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
              hasH1: false,
              multipleH1: false,
              issues: [],
            },
            seoIssues: ['Lighthouse audit failed'],
            error: lighthouseResult.reason?.message || 'Lighthouse audit failed',
          };

    const combinedIssues = [
      ...new Set([
        ...(lighthouseData.seoIssues || []),
        ...(tech.error ? [`Tech detection: ${tech.error}`] : []),
        ...(lighthouseData.error ? [`Audit: ${lighthouseData.error}`] : []),
      ]),
    ];

    const baseResult = {
      url,
      timestamp: new Date().toISOString(),
      techStack: {
        technologies: tech.technologies,
        error: tech.error,
      },
      lighthouse: {
        scores: lighthouseData.scores,
        metaTags: lighthouseData.metaTags,
        headings: lighthouseData.headings,
        error: lighthouseData.error,
      },
      seoIssues: combinedIssues,
      success: !lighthouseData.error || tech.technologies.length > 0,
    };

    const [html, crawlerFiles] = await Promise.all([fetchPageHtml(url), checkCrawlerFiles(url)]);
    const infrastructure = {
      ...buildInfrastructureSignals(html, url),
      ...crawlerFiles,
    };
    const expert = generateExpertSuggestions({ ...baseResult, infrastructure }, html);

    return {
      ...baseResult,
      infrastructure,
      seoIssues: expert.seoIssues,
      expert,
    };
  })();

  return Promise.race([auditPromise, timeoutPromise]);
}
