import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SUNLU_BENEFITS,
  SUNLU_FAQ,
  SUNLU_NAV,
  SUNLU_PROMO,
  SUNLU_STEPS,
} from '../data/sunluPromoDemo'

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function SunluPromoLanding({ showAdminBar = true }) {
  const [copied, setCopied] = useState(false)
  const p = SUNLU_PROMO

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(p.promoCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* fallback */
    }
  }

  return (
    <div className="sunlu-promo">
      {showAdminBar && (
        <div className="sunlu-admin-bar">
          <Link to="/">← Webflow builder</Link>
          <a href={p.hostedPromoUrl} target="_blank" rel="noreferrer" className="sunlu-live-link">
            Live promo page →
          </a>
        </div>
      )}

      <header className="sunlu-nav">
        <div className="sunlu-nav-inner">
          <a href="#home" className="sunlu-logo" onClick={(e) => { e.preventDefault(); scrollTo('home') }}>
            {p.siteName}
          </a>
          <nav className="sunlu-nav-links">
            {SUNLU_NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollTo(item.id)
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <section id="home" className="sunlu-hero">
        <div className="sunlu-hero-inner">
          <p className="sunlu-eyebrow">Exclusive coupon · Limited time</p>
          <h1>
            {p.brand} Promo Code <span className="sunlu-code-inline">&quot;{p.promoCode}&quot;</span>
            <br />
            Get {p.discountLabel} On Your Products
          </h1>
          <p className="sunlu-hero-sub">
            Ready to save on {p.brand}? Use promo code <strong>{p.promoCode}</strong> at checkout for a flat{' '}
            {p.discount} discount — fast, simple, and built for shoppers who want the best deal.
          </p>

          <div className="sunlu-code-box">
            <span className="sunlu-code-label">Your code</span>
            <strong className="sunlu-code-value">{p.promoCode}</strong>
            <button type="button" className="sunlu-btn sunlu-btn-copy" onClick={copyCode}>
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>

          <div className="sunlu-hero-cta">
            <a className="sunlu-btn sunlu-btn-primary" href={p.shopUrl} target="_blank" rel="noreferrer">
              Shop now — save {p.discount}
            </a>
            <button type="button" className="sunlu-btn sunlu-btn-ghost" onClick={copyCode}>
              Copy &quot;{p.promoCode}&quot;
            </button>
          </div>
        </div>
      </section>

      <section id="why" className="sunlu-section sunlu-section-alt">
        <div className="sunlu-container">
          <h2>Use Promo Code: {p.promoCode}</h2>
          <ul className="sunlu-benefits">
            {SUNLU_BENEFITS.map((b) => (
              <li key={b.title}>
                <span className="sunlu-check">✅</span>
                <div>
                  <strong>{b.title}</strong>
                  <p>{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <a className="sunlu-btn sunlu-btn-primary sunlu-btn-center" href={p.shopUrl} target="_blank" rel="noreferrer">
            Claim {p.discountLabel} with {p.promoCode}
          </a>
        </div>
      </section>

      <section id="review" className="sunlu-section">
        <div className="sunlu-container sunlu-split">
          <div>
            <h2>Why shoppers choose {p.brand}</h2>
            <p>
              From everyday makers to professional studios, {p.brand} products are known for consistent quality and
              value. This landing page helps you grab the latest deal — enter <strong>{p.promoCode}</strong> and save{' '}
              {p.discount} on your order.
            </p>
          </div>
          <div className="sunlu-stat-card">
            <p className="sunlu-stat-big">{p.discount}</p>
            <p className="sunlu-stat-label">off with code {p.promoCode}</p>
            <p className="sunlu-stat-note">Valid on eligible products at checkout</p>
          </div>
        </div>
      </section>

      <section id="how" className="sunlu-section sunlu-section-alt">
        <div className="sunlu-container">
          <h2>How to get your {p.brand} discount?</h2>
          <ol className="sunlu-steps">
            {SUNLU_STEPS.map((s) => (
              <li key={s.step}>
                <span className="sunlu-step-num">{s.step}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="sunlu-cta-line">
            Get started today with promo code <strong>{p.promoCode}</strong> and enjoy {p.discountLabel} on your
            products.
          </p>
          <a className="sunlu-btn sunlu-btn-primary sunlu-btn-center" href={p.shopUrl} target="_blank" rel="noreferrer">
            Click here to shop &amp; save with {p.promoCode}
          </a>
        </div>
      </section>

      <section id="faq" className="sunlu-section">
        <div className="sunlu-container">
          <h2>Frequently asked questions</h2>
          <div className="sunlu-faq">
            {SUNLU_FAQ.map((f) => (
              <details key={f.q} className="sunlu-faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="sunlu-footer">
        <div className="sunlu-container sunlu-footer-grid">
          <div>
            <strong>{p.siteName}</strong>
            <p>
              Independent promo page for {p.brand} discount code <strong>{p.promoCode}</strong>. Save {p.discount} on
              your products.
            </p>
          </div>
          <div>
            <strong>Quick links</strong>
            <ul>
              {SUNLU_NAV.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} onClick={(e) => { e.preventDefault(); scrollTo(item.id) }}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="sunlu-copy">© {p.year} {p.siteName.toLowerCase().replace(/\s/g, '')} · Demo layout</p>
      </footer>
    </div>
  )
}
