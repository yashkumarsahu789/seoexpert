import { useEffect } from 'react'
import { buildFaqJsonLd, buildWebPageJsonLd } from '../../../lib/seo-trends.mjs'

function outHref(targetUrl) {
  if (!targetUrl) return '#'
  return `/out/?to=${encodeURIComponent(targetUrl)}`
}

function injectJsonLd(config) {
  const seo = config.seoContent || {}
  const schemas = [
    buildWebPageJsonLd({
      title: config.seo?.title || seo.h1,
      description: config.seo?.description || '',
      url: config.publicUrl || window.location.href,
      keyword: config.keyword,
      pageType: config.pageType,
    }),
  ]
  const faq = buildFaqJsonLd(seo.faqs)
  if (faq) schemas.push(faq)

  const id = 'kp-jsonld'
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas)
}

export default function PageShell({ config, hero }) {
  const t = config.theme
  const light = t.light === true
  const patternClass =
    t.pattern === 'grid'
      ? 'kp-page--grid'
      : t.pattern === 'pulse'
        ? 'kp-page--pulse'
        : t.pattern === 'lines'
          ? 'kp-page--lines'
          : ''

  useEffect(() => {
    document.title = config.seo?.title || config.seoContent?.h1 || config.keyword
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = config.seo?.description || ''
    injectJsonLd(config)
  }, [config])

  const seo = config.seoContent || {}

  return (
    <div
      className={`kp-page ${light ? 'kp-page--light' : ''} ${patternClass}`}
      style={{
        '--kp-bg': t.bg,
        '--kp-surface': t.surface,
        '--kp-accent': t.accent,
        '--kp-accent-text': t.accentText,
        '--kp-text': t.text,
        '--kp-muted': t.muted,
        '--kp-radius': t.radius || '12px',
        '--kp-font': t.font,
      }}
    >
      <header className="kp-page-head">
        <small>{config.pageType === 'brand' ? 'Official access' : config.label}</small>
        <a href="/">LifeSolveNow</a>
      </header>

      <div className="kp-page-scroll">
        <section className="kp-hero">
          <div className="kp-hero-head">
            {config.pageType === 'brand' && (
              <div className="kp-brand-icon">{t.icon || config.meta?.icon || '🌐'}</div>
            )}
            <h1>{seo.h1}</h1>
            {seo.h2 && <h2 className="kp-h2">{seo.h2}</h2>}
          </div>
          <div className="kp-hero-feature">{hero}</div>
        </section>

        <section className="kp-seo-bottom" aria-label="Page information">
          {seo.features?.length > 0 && (
            <div className="kp-seo-block">
              <h3>Key features</h3>
              <ul>
                {seo.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {seo.requirements?.length > 0 && (
            <div className="kp-seo-block">
              <h3>How to use</h3>
              <ol>
                {seo.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ol>
            </div>
          )}
          {seo.faqs?.length > 0 && (
            <div className="kp-seo-block">
              <h3>Common questions</h3>
              <div className="kp-faq-list">
                {seo.faqs.map((f) => (
                  <details key={f.q} className="kp-faq-item">
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
          <p className="kp-seo-note">
            {config.pageType === 'brand'
              ? `Transparent access page for “${config.keyword}”. Not affiliated with ${config.brandName} — redirects to official site.`
              : `Free tool page for “${config.keyword}”. Built by LifeSolveNow.`}
          </p>
        </section>
      </div>

      <footer className="kp-page-foot">
        <a href="/">LifeSolveNow</a> · {config.keyword}
      </footer>
    </div>
  )
}

export { outHref }
