export function formatAuditForAI(auditData) {
  const lines = [];
  const { url, lighthouse, techStack, seoIssues } = auditData;

  lines.push(`Website URL: ${url}`);
  lines.push('');
  lines.push('=== SEO ISSUES ===');
  if (seoIssues?.length) {
    seoIssues.forEach((issue) => lines.push(`- ${issue}`));
  } else {
    lines.push('- No critical issues detected');
  }

  lines.push('');
  lines.push('=== LIGHTHOUSE SCORES ===');
  lines.push(`Performance: ${lighthouse.scores.performance ?? 'N/A'}/100`);
  lines.push(`Accessibility: ${lighthouse.scores.accessibility ?? 'N/A'}/100`);
  lines.push(`SEO: ${lighthouse.scores.seo ?? 'N/A'}/100`);

  lines.push('');
  lines.push('=== META TAGS ===');
  lines.push(`Title present: ${lighthouse.metaTags.title.present ? 'Yes' : 'No — Missing Title Tag on Homepage'}`);
  lines.push(`Meta description present: ${lighthouse.metaTags.description.present ? 'Yes' : 'No — Missing Meta Description'}`);
  lines.push(`OpenGraph title: ${lighthouse.metaTags.openGraph.titlePresent ? 'Yes' : 'No'}`);
  lines.push(`OpenGraph description: ${lighthouse.metaTags.openGraph.descriptionPresent ? 'Yes' : 'No'}`);

  lines.push('');
  lines.push('=== HEADING HIERARCHY ===');
  const h = lighthouse.headings.counts;
  lines.push(`H1: ${h.h1}, H2: ${h.h2}, H3: ${h.h3}, H4: ${h.h4}, H5: ${h.h5}, H6: ${h.h6}`);
  if (h.h1 === 0) lines.push('- Missing H1 tag');
  if (h.h1 > 1) lines.push('- Multiple H1 tags');

  if (techStack?.technologies?.length) {
    lines.push('');
    lines.push('=== DETECTED TECH STACK ===');
    techStack.technologies.slice(0, 15).forEach((tech) => {
      lines.push(`- ${tech.name}${tech.version ? ` v${tech.version}` : ''} (${tech.categories.join(', ')})`);
    });
  }

  return lines.join('\n');
}
