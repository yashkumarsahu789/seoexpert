#!/usr/bin/env node
/** Export Sunlu KANNY promo HTML — Webflow Home page Embed ke liye */
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

const root = WEBFLOW_ROOT
const outDir = resolve(root, 'coupon-sites')
mkdirSync(outDir, { recursive: true })

loadEnv()

const shopUrl = process.env.VITE_SHOP_BASE_URL || 'https://shop.LifeSolveNow.com'
const code = 'KANNY'
const discount = '10% OFF'
const discountPct = '10%'
const brand = 'Sunlu'
const year = new Date().getFullYear()

const embedBody = `
<style>
.sf{--a:#e85d04;--bg:#faf9f7;--t:#1a1a1a;--m:#5c5c5c;--b:#e8e4df;font-family:system-ui,sans-serif;color:var(--t);background:var(--bg);line-height:1.6}
.sf *{box-sizing:border-box}
.sf a{color:inherit}
.sf-nav{background:#fff;border-bottom:1px solid var(--b);position:sticky;top:0;z-index:10}
.sf-nav-in{max-width:960px;margin:0 auto;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.sf-logo{font-weight:800;font-size:1.1rem}
.sf-links{display:flex;gap:16px;flex-wrap:wrap}
.sf-links a{color:var(--m);text-decoration:none;font-size:.9rem}
.sf-links a:hover{color:var(--a)}
.sf-hero{background:linear-gradient(180deg,#fff,var(--bg));padding:48px 20px 56px}
.sf-in{max-width:960px;margin:0 auto}
.sf-eyebrow{color:var(--a);font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:.08em}
.sf h1{font-size:clamp(1.75rem,5vw,2.5rem);line-height:1.15;margin:12px 0 16px}
.sf-code{color:var(--a)}
.sf-sub{color:var(--m);font-size:1.05rem;max-width:640px;margin-bottom:20px}
.sf-box{display:inline-flex;align-items:center;gap:16px;flex-wrap:wrap;background:#fff;border:2px dashed var(--a);border-radius:12px;padding:16px 20px;margin:8px 0 20px}
.sf-box strong{font-size:2rem;letter-spacing:.12em;color:var(--a)}
.sf-btn{display:inline-block;background:var(--a);color:#fff!important;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600;border:none;cursor:pointer;font-size:1rem}
.sf-btn:hover{background:#c44d00}
.sf-btn-o{background:transparent;color:var(--t)!important;border:1px solid var(--b)}
.sf-cta{display:flex;gap:12px;flex-wrap:wrap}
.sf-sec{padding:48px 20px}
.sf-alt{background:#fff}
.sf-sec h2{font-size:1.6rem;margin-bottom:20px}
.sf-ben{list-style:none;display:grid;gap:16px}
.sf-ben li{display:flex;gap:12px;align-items:flex-start}
.sf-ben p{color:var(--m);margin-top:4px;font-size:.95rem}
.sf-split{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:center}
@media(max-width:700px){.sf-split{grid-template-columns:1fr}}
.sf-card{background:linear-gradient(135deg,var(--a),#f48c06);color:#fff;border-radius:16px;padding:28px;text-align:center}
.sf-card strong{font-size:3rem;display:block}
.sf-steps{list-style:none;counter-reset:st;display:grid;gap:16px}
.sf-steps li{display:flex;gap:14px;align-items:flex-start}
.sf-num{width:32px;height:32px;border-radius:50%;background:var(--a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0}
.sf-steps p{color:var(--m);font-size:.95rem;margin-top:4px}
.sf-faq details{border:1px solid var(--b);border-radius:10px;padding:14px 16px;margin-bottom:10px;background:#fff}
.sf-faq summary{font-weight:600;cursor:pointer}
.sf-faq p{color:var(--m);margin-top:10px;font-size:.95rem}
.sf-foot{background:#1a1a1a;color:#ccc;padding:32px 20px;font-size:.9rem}
.sf-foot a{color:#fff}
.sf-copy{text-align:center;margin-top:20px;font-size:.8rem;color:#888}
</style>
<div class="sf">
  <header class="sf-nav"><div class="sf-nav-in">
    <div class="sf-logo">${brand} Promo Codes</div>
    <nav class="sf-links">
      <a href="#home">Home</a><a href="#why">Why ${brand}</a><a href="#how">How to Use</a><a href="#faq">FAQ</a>
    </nav>
  </div></header>
  <section id="home" class="sf-hero"><div class="sf-in">
    <p class="sf-eyebrow">Exclusive coupon · Limited time</p>
    <h1>${brand} Promo Code <span class="sf-code">"${code}"</span><br>Get ${discount} On Your Products</h1>
    <p class="sf-sub">Use promo code <strong>${code}</strong> at checkout for a flat <strong>${discountPct}</strong> discount on eligible ${brand} products.</p>
    <div class="sf-box"><span>Your code</span><strong>${code}</strong></div>
    <div class="sf-cta">
      <a class="sf-btn" href="${shopUrl}">Shop now — save ${discountPct}</a>
    </div>
  </div></section>
  <section id="why" class="sf-sec sf-alt"><div class="sf-in">
    <h2>Use Promo Code: ${code}</h2>
    <ul class="sf-ben">
      <li><span>✅</span><div><strong>Instant savings</strong><p>Apply ${code} at checkout for ${discount} on your order.</p></div></li>
      <li><span>✅</span><div><strong>Quality products</strong><p>${brand} filaments and accessories trusted by makers worldwide.</p></div></li>
      <li><span>✅</span><div><strong>Easy checkout</strong><p>Copy ${code}, paste at payment — discount applies automatically.</p></div></li>
    </ul>
    <p style="margin-top:24px"><a class="sf-btn" href="${shopUrl}">Claim ${discount} with ${code}</a></p>
  </div></section>
  <section id="review" class="sf-sec"><div class="sf-in sf-split">
    <div>
      <h2>Why shoppers choose ${brand}</h2>
      <p style="color:var(--m)">Enter <strong>${code}</strong> and save ${discountPct} on your order at checkout.</p>
    </div>
    <div class="sf-card"><strong>${discountPct}</strong><span>off with code ${code}</span></div>
  </div></section>
  <section id="how" class="sf-sec sf-alt"><div class="sf-in">
    <h2>How to get your ${brand} discount</h2>
    <ol class="sf-steps">
      <li><span class="sf-num">1</span><div><strong>Visit the shop</strong><p>Open the store using the button above.</p></div></li>
      <li><span class="sf-num">2</span><div><strong>Add to cart</strong><p>Pick products you want to buy.</p></div></li>
      <li><span class="sf-num">3</span><div><strong>Enter ${code}</strong><p>Paste code in the coupon field at checkout.</p></div></li>
      <li><span class="sf-num">4</span><div><strong>Complete purchase</strong><p>Enjoy discounted ${brand} products.</p></div></li>
    </ol>
    <p style="margin:24px 0;color:var(--m)">Get started with <strong>${code}</strong> — ${discount} on your products.</p>
    <a class="sf-btn" href="${shopUrl}">Shop &amp; save with ${code}</a>
  </div></section>
  <section id="faq" class="sf-sec"><div class="sf-in">
    <h2>Frequently asked questions</h2>
    <div class="sf-faq">
      <details><summary>What is the ${brand} promo code ${code}?</summary><p>${code} gives you ${discount} on eligible ${brand} products at checkout.</p></details>
      <details><summary>How do I use code ${code}?</summary><p>Add items to cart, enter ${code} in the promo box, apply before payment.</p></details>
      <details><summary>Does ${code} work on all products?</summary><p>Applies to eligible items; some bundles may be excluded.</p></details>
    </div>
  </div></section>
  <footer class="sf-foot"><div class="sf-in">
    <strong>${brand} Promo Codes</strong> — Save ${discountPct} with code <strong>${code}</strong>
    <p class="sf-copy">© ${year} ${brand.toLowerCase()}promocodes</p>
  </div></footer>
</div>`

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand} Promo Code ${code} — ${discount}</title>
  <meta name="description" content="Use ${brand} promo code ${code} for ${discount} on your products." />
</head>
<body>
${embedBody}
</body>
</html>`

const embedPath = resolve(outDir, 'webflow-home-embed.html')
const fullPath = resolve(outDir, 'sunlu-kanny-promo.html')
writeFileSync(embedPath, embedBody.trim(), 'utf8')
writeFileSync(fullPath, fullHtml, 'utf8')

console.log('Exported to coupon-sites/:')
console.log('  • webflow-home-embed.html  (paid Webflow Embed only)')
console.log('  • sunlu-kanny-promo.html   (hosted full page — free plan)')
console.log('')
console.log('Next: npm run webflow:host  → updates index.json')
console.log('Deploy: git push (coupon-sites/ → GitHub Pages /coupon-sites/)')
