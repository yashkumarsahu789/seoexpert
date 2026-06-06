function attrEquals(value, expected) {
  return String(value || '').trim().toLowerCase() === expected.toLowerCase();
}

function metaByName(doc, name) {
  for (const el of doc.querySelectorAll('head meta')) {
    if (attrEquals(el.getAttribute('name'), name)) return el;
  }
  return null;
}

function metaByProperty(doc, property) {
  for (const el of doc.querySelectorAll('head meta')) {
    if (attrEquals(el.getAttribute('property'), property)) return el;
  }
  return null;
}

export function parseMetaFromDocument(doc) {
  const title = doc.querySelector('head title')?.textContent?.trim() || '';
  const description = metaByName(doc, 'description')?.getAttribute('content')?.trim() || '';
  const ogTitle = metaByProperty(doc, 'og:title')?.getAttribute('content')?.trim() || '';
  const ogDescription = metaByProperty(doc, 'og:description')?.getAttribute('content')?.trim() || '';

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    hasTitle: Boolean(title),
    hasDescription: Boolean(description),
    hasOgTitle: Boolean(ogTitle),
    hasOgDescription: Boolean(ogDescription),
  };
}

export function parseMetaFromHtml(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseMetaFromDocument(doc);
}
