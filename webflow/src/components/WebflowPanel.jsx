import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  WEBFLOW_EXAMPLE_REQUIREMENT,
  mockWebflowPayload,
} from '../data/webflow'
import { SUNLU_PROMO } from '../data/sunluPromoDemo'
import {
  isWebflowAutomationReady,
  listWebflowSites,
  spawnWebflowSite,
} from '../services/webflowService'

const EXAMPLES = [
  'Sunlu coupon site — code KANNY, 10% off on products',
  'Create a coupon site for Notion AI with 30% off',
  'Make a promo page for Jasper AI — code JASPER50, 50% discount',
]

export default function WebflowPanel() {
  const [requirement, setRequirement] = useState('')
  const [loading, setLoading] = useState(false)
  const [dryRun, setDryRun] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const ready = isWebflowAutomationReady()
  const localPreview = useMemo(
    () => (requirement.trim() ? mockWebflowPayload(requirement) : null),
    [requirement]
  )

  const loadHistory = useCallback(async () => {
    try {
      const rows = await listWebflowSites()
      setHistory(rows)
    } catch {
      /* optional supabase */
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleBuild = async () => {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await spawnWebflowSite(requirement, { dryRun })
      setResult(data)
      if (!dryRun) await loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ai-panel wf-panel">
      <header className="ai-panel-header">
        <h2>Webflow — mujhe batao, main bana dunga</h2>
        <p>
          Simple Hindi/English me likho kya chahiye — coupon site, brand name, discount, affiliate link.
          System AI se content banayega aur <strong>webflow.com</strong> par publish karega.
        </p>
        <div className="ai-panel-meta">
          <span>Live: KANNY · 10% off</span>
          <a href={SUNLU_PROMO.liveWebflowUrl} target="_blank" rel="noreferrer" className="wf-demo-link">
            demosite-57cbb8.webflow.io →
          </a>
          <Link to="/demo" className="wf-demo-link">
            Local preview →
          </Link>
        </div>
      </header>

      <section className="aic-card wf-live-banner wf-free-plan">
        <h3>Free plan? Embed kaam nahi karega — ye karo</h3>
        <p className="aic-muted">
          Webflow <strong>Starter (free)</strong> par Code Embed / custom HTML <strong>paid plan</strong> pe hai.
          Isliye HTML paste blank hi rahega.
        </p>
        <p>
          <strong>Best fix — full page host karo (free):</strong>
        </p>
        <ol className="wf-steps">
          <li>
            <code>npm run webflow:export</code> → <code>npm run webflow:host</code> (webflow/ folder se)
          </li>
          <li>
            Git push → page live:{' '}
            <a href={SUNLU_PROMO.hostedPromoUrl} target="_blank" rel="noreferrer">
              {SUNLU_PROMO.hostedPromoUrl}
            </a>
          </li>
          <li>
            Webflow Designer → Home → native elements only: <strong>Heading</strong> + <strong>Paragraph</strong> +{' '}
            <strong>Button</strong> → button link = hosted URL upar wala
          </li>
          <li>Publish Webflow (sirf landing / redirect ke liye)</li>
        </ol>
        <p className="aic-muted wf-copy-block">
          Home page copy: H1 = <em>Sunlu Promo Code KANNY — 10% OFF</em> · Button = <em>View promo page</em>
        </p>
      </section>

      <section className="aic-card ai-card-muted wf-blank-fix">
        <h3>Paid plan ho to Embed</h3>
        <p className="aic-muted">
          Basic plan ($14/mo) se Embed chalega. Tab <code>coupon-sites/webflow-home-embed.html</code> paste
          karo.
        </p>
        <p className="aic-muted">
          Ya <Link to="/demo">/demo</Link> jaisa design native elements se copy karo (free plan).
        </p>
      </section>

      <section className="aic-card wf-live-banner">
        <h3>Links</h3>
        <p>
          Webflow:{' '}
          <a href={SUNLU_PROMO.liveWebflowUrl} target="_blank" rel="noreferrer">
            {SUNLU_PROMO.liveWebflowUrl}
          </a>
          {' · '}
          Full promo (hosted):{' '}
          <a href={SUNLU_PROMO.hostedPromoUrl} target="_blank" rel="noreferrer">
            {SUNLU_PROMO.hostedPromoUrl}
          </a>
        </p>
      </section>

      <section className="aic-card aic-card-hero wf-manual-path">
        <h3>Pehli baar setup / API issues?</h3>
        <p className="aic-muted">
          Agar token banate waqt sirf <strong>name + Generate</strong> dikhe aur CMS/Sites ki koi row na ho, to API se
          auto-publish <strong>abhi possible nahi</strong>. Usually iska matlab: aap <strong>Site Administrator</strong>{' '}
          nahi ho, ya token <strong>Workspace</strong> se bana (site settings se nahi).
        </p>
        <p className="aic-muted">
          <strong>Abhi ke liye (API ke bina) — 3 minute me live:</strong>
        </p>
        <ol className="wf-steps">
          <li>
            <Link to="/demo">Local preview kholo</Link> — poora Sunlu KANNY page (gummysearch style)
          </li>
          <li>
            Webflow Designer → <code>demosite-57cbb8</code> → naya page → sections copy karo (hero, code box, FAQ)
          </li>
          <li>
            Ya terminal: <code>npm run webflow:export</code> → file{' '}
            <code>webflow/coupon-sites/sunlu-kanny-promo.html</code> browser me kholo, content copy karo
          </li>
          <li>
            Publish → <code>https://demosite-57cbb8.webflow.io/sunlu-kanny</code> (ya jo slug chaho)
          </li>
        </ol>
        <p className="aic-muted wf-copy-block">
          <strong>Copy-paste text (Webflow me):</strong>
          <br />
          H1: Sunlu Promo Code &quot;KANNY&quot; — Get 10% OFF On Your Products
          <br />
          Code: <strong>KANNY</strong> · Discount: <strong>10% OFF</strong>
          <br />
          CTA link: shop checkout URL
        </p>
      </section>

      <section className="aic-card ai-card-muted">
        <h3>Baad me API chahiye ho to (optional)</h3>
        <p className="aic-muted">
          Site owner se <strong>Site Administrator</strong> role lo. Phir: gear icon → Site settings → Apps &amp;
          integrations → neeche scroll → <strong>API access</strong> → Generate — tab CMS/Sites table dikhegi.
        </p>
        <ol className="wf-steps">
          <li>CMS = Read and write · Sites = Read and write</li>
          <li>Site ID = General → Overview (24-char hex, subdomain nahi)</li>
          <li>
            <code>npm run webflow:token</code> → sab ✅ → <code>npm run webflow:publish</code>
          </li>
        </ol>
      </section>

      {!ready && (
        <p className="ai-alert ai-alert-error">
          VITE_N8N_WEBFLOW_WEBHOOK_URL set karo aur n8n me workflow push karo:{' '}
          <code>npm run n8n:push -- webflow_site_spawn</code>
        </p>
      )}

      <section className="aic-card aic-card-hero">
        <h3>Kya banana hai?</h3>
        <textarea
          className="ai-input-textarea wf-requirement"
          rows={6}
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder={`Example:\n${WEBFLOW_EXAMPLE_REQUIREMENT}`}
          disabled={loading}
        />

        <div className="wf-examples">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              className="ai-btn-secondary ai-btn-sm"
              onClick={() => setRequirement(ex)}
              disabled={loading}
            >
              {ex.slice(0, 42)}…
            </button>
          ))}
        </div>

        <label className="aic-toggle">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={loading} />
          Dry run only (Webflow API call skip — sirf AI JSON preview)
        </label>

        <div className="ai-actions">
          <button
            type="button"
            className="ai-btn-primary wf-build-btn"
            onClick={handleBuild}
            disabled={loading || !requirement.trim()}
          >
            {loading ? 'Ban raha hai…' : dryRun ? 'Preview JSON' : 'Webflow par site banao'}
          </button>
        </div>

        {localPreview && !result && (
          <p className="aic-muted">
            Local preview subdomain:{' '}
            <strong>https://{localPreview.siteConfiguration.subdomainSlug}.webflow.io</strong>
          </p>
        )}
      </section>

      {error && <p className="ai-alert ai-alert-error">{error}</p>}

      {result && (
        <section className="aic-card wf-result">
          <h3>{result.dryRun ? 'Preview ready' : 'Site ban gayi'}</h3>
          {result.siteUrl && (
            <p className="wf-live-url">
              <a href={result.siteUrl} target="_blank" rel="noreferrer">
                {result.siteUrl}
              </a>
            </p>
          )}
          {result.message && <p className="aic-muted">{result.message}</p>}
          {result.steps?.length > 0 && (
            <ul className="ai-limits-list">
              {result.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          <details>
            <summary>Generated payload</summary>
            <pre className="ai-raw-out">{JSON.stringify(result.payload, null, 2)}</pre>
          </details>
        </section>
      )}

      {history.length > 0 && (
        <section className="aic-card">
          <h3>Pehle banayi hui sites</h3>
          <ul className="wf-history">
            {history.map((row) => (
              <li key={row.id}>
                <strong>{row.site_name || row.subdomain_slug}</strong>
                <span className={`badge badge-${row.status === 'published' ? 'ok' : 'warn'}`}>{row.status}</span>
                {row.site_url && (
                  <a href={row.site_url} target="_blank" rel="noreferrer">
                    open
                  </a>
                )}
                <p className="aic-muted">{row.requirement}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="ai-more">
        <summary>Setup (ek baar)</summary>
        <ol className="wf-steps">
          <li>
            <strong>Webflow</strong> — master coupon template banao, API token + site ID lo
          </li>
          <li>
            <strong>n8n Render env</strong> — WEBFLOW_API_TOKEN, WEBFLOW_MASTER_SITE_ID, WEBFLOW_COUPON_COLLECTION_ID
          </li>
          <li>
            <strong>Supabase</strong> — <code>supabase db push</code> (migration 016)
          </li>
          <li>
            <strong>Push workflow</strong> — <code>npm run n8n:push -- webflow_site_spawn</code>
          </li>
        </ol>
      </details>
    </div>
  )
}
