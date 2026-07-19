#!/usr/bin/env node
/**
 * Transform gummysearch reference HTML → Sunlu KANNY promo page (same layout).
 * Output: coupon-sites/sunlu-gummy-page.html + chunks for Webflow MCP whtml_builder
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { loadEnv, WEBFLOW_ROOT } from './load-env.mjs'

loadEnv()

const root = WEBFLOW_ROOT
const shopUrl = process.env.VITE_SHOP_BASE_URL || 'https://shop.LifeSolveNow.com'
const siteUrl = `https://${process.env.WEBFLOW_SITE_SHORT_NAME || 'sunlu-promo-hub'}.webflow.io`

const PROMO = {
  brand: 'Sunlu',
  code: 'KANNY',
  discount: '10%',
  siteName: 'SunluPromoCodes',
}

function transform(html) {
  let out = html
  const pairs = [
    [/https:\/\/gummysearchpromocodes\.webflow\.io/g, siteUrl],
    [/gummysearchpromocodes\.webflow\.io/g, siteUrl.replace(/^https:\/\//, '')],
    [/https:\/\/gummysearch\.com\/\?via=AVA/g, shopUrl],
    [/gummysearch\.com\/\?via=AVA/g, shopUrl.replace(/^https:\/\//, '')],
    [/GummySearchPromoCodes/g, 'SunluPromoCodes'],
    [/GummySearch Review/g, 'Products'],
    [/Why GummySearch/g, 'Why Sunlu'],
    [/why-gummysearch/g, 'why-sunlu'],
    [/gummysearch-review/g, 'products'],
    [/GummySearch/g, PROMO.brand],
    [/gummysearch/g, 'sunlu'],
    [/\bAVA\b/g, PROMO.code],
    [/Get 10% Discount On Plans/g, 'Get 10% Discount On Your Products'],
    [/Flat 10% Off On Plans/g, 'Flat 10% Off On Your Products'],
    [/discount on plans/gi, 'discount on your products'],
    [/on plans/gi, 'on your products'],
    [/On Plans/g, 'On Your Products'],
    [/plan discount/gi, 'product discount'],
    [/plan purchase/gi, 'product purchase'],
    [/subscription plans/gi, 'products'],
    [/audience research/gi, '3D printing'],
    [/Reddit/g, 'Sunlu'],
    [/research journey/gi, 'shopping experience'],
    [/research tools/gi, 'printing products'],
    [/niche exploration/gi, '3D printing'],
    [/content research/gi, '3D printing'],
    [/content creation/gi, '3D printing projects'],
    [/Starter at \$29\/month or higher/g, 'your favorite filaments and accessories'],
    [/Sign up for free/g, 'Shop now'],
    [/registration page/gi, 'Sunlu store'],
    [/Verify Your Account/gi, 'Review Your Cart'],
    [/no credit card needed for the free tier/gi, 'no account needed to browse'],
    [/Start Researching/gi, 'Complete Checkout'],
    [/dive into Reddit insights/gi, 'enjoy your discounted Sunlu products'],
    [/Kick Off Your Research Adventure/gi, 'Kick Off Your Shopping Adventure'],
    [/Research Game/gi, 'Shopping Experience'],
    [/researchers/gi, 'shoppers'],
    [/research experience/gi, 'shopping experience'],
    [/Refer-a-Friend Program/gi, 'Share & Save Program'],
    [/© 2025/g, `© ${new Date().getFullYear()}`],
    // Sunlu-specific hero copy (human-written, not generic AI)
    [
      /Are you ready to dive into the world of (audience research|3D printing)[\s\S]*?tailored for success\./,
      `Ready to upgrade your 3D printing setup without overspending? Sunlu delivers premium filaments, resins, and printer accessories trusted by makers worldwide. Use promo code <strong>${PROMO.code}</strong> at checkout for a flat <strong>${PROMO.discount}</strong> discount on your products — quality materials, real savings, delivered to your door.`,
    ],
    [/Get Started with Sunlu and Save 10% Today/g, 'Shop Sunlu Products — Save 10% with KANNY'],
    [/Claim Your 10% Discount Now – Sign Up Here/g, 'Claim Your 10% Discount — Shop Now'],
    [/Sign Up Now/g, 'Shop Now'],
    [/Sign Up and Save/g, 'Shop and Save'],
    [/Join Sunlu/g, 'Shop Sunlu'],
    [/Sunlu Review/g, 'Products'],
  ]
  for (const [from, to] of pairs) out = out.replace(from, to)
  out = out.replace(
    /<p class="paragraph-24">[\s\S]*?<\/p>/,
    `<p class="paragraph-24">✅ <strong>Premium Filaments</strong> – PLA, PETG, ABS, and specialty materials engineered for smooth prints and consistent results.<br/>‍<br/>✅ <strong>Wide Product Range</strong> – From starter spools to bulk packs — find the right Sunlu product for every project.<br/>‍<br/>✅ <strong>Trusted by Makers</strong> – Thousands of 3D printing enthusiasts rely on Sunlu for reliable, affordable supplies.<br/>‍<br/>✅ <strong>Instant Savings</strong> – Code <strong>${PROMO.code}</strong> knocks <strong>${PROMO.discount}</strong> off your order at checkout.<br/>‍<br/>✅ <strong>Fast Checkout</strong> – Copy the code, paste at payment, and your discount applies automatically.<br/>‍<br/>✅ <strong>Customer Support</strong> – Questions about your order? Sunlu's support team is ready to help.<br/>‍</p>`
  )
  out = out.replace(/https:\/\/https:\/\//g, 'https://')
  out = out.replace(/Sunlu Sunlu/g, 'Sunlu')
  out = out.replace(/subscription your products/g, 'products')
  out = out.replace(/Add your favorite filaments and accessories\)/g, 'Add your favorite filaments and accessories')
  return out
}

const refPath = resolve(root, 'coupon-sites/reference-gummy.html')
const ref = readFileSync(refPath, 'utf8')

// Extract body inner (between <body...> and </body>)
const bodyMatch = ref.match(/<body[^>]*>([\s\S]*)<\/body>/i)
if (!bodyMatch) {
  console.error('Could not parse reference HTML body')
  process.exit(1)
}

const transformed = transform(bodyMatch[1])

// Split into logical sections for MCP (max ~8k chars each)
const sectionMarkers = [
  { name: 'navbar', start: '<div class="navbar-logo-left">' },
  { name: 'hero', start: '<section class="hero-section">' },
  { name: 'slider', start: '<section class="team-slider">' },
  { name: 'how-image', start: '<section class="section-2">' },
  { name: 'how-steps', start: '<section><section><section>' },
  { name: 'video-rich', start: '<section class="section-3">' },
  { name: 'faq', start: '<h3 class="heading-13"></h3><div class="w-layout-blockcontainer w-container"><div class="rich-text-block-4' },
  { name: 'footer', start: '<section class="footer-dark">' },
]

const chunks = []
for (let i = 0; i < sectionMarkers.length; i++) {
  const startIdx = transformed.indexOf(sectionMarkers[i].start)
  const endIdx =
    i < sectionMarkers.length - 1
      ? transformed.indexOf(sectionMarkers[i + 1].start)
      : transformed.length
  if (startIdx === -1) continue
  const html = transformed.slice(startIdx, endIdx === -1 ? undefined : endIdx).trim()
  if (html) chunks.push({ name: sectionMarkers[i].name, html, chars: html.length })
}

const headLinks = `<link href="https://cdn.prod.website-files.com/67dba71ac8e801b28e37d78b/css/gummysearchpromocodes.webflow.f0e392e4b.css" rel="stylesheet" type="text/css"/>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="anonymous"/>
<script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"></script>
<script>WebFont.load({google:{families:["Lato:100,100italic,300,300italic,400,400italic,700,700italic,900,900italic","Droid Sans:400,700","PT Serif:400,400italic,700,700italic"]}});</script>`

const fullPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Sunlu Promo Code "KANNY" Flat 10% Off On Your Products.</title>
<meta name="description" content="Use Sunlu promo code KANNY for 10% discount on your products. Shop Sunlu 3D printing filaments and save today."/>
${headLinks}
</head>
<body class="body-copy">
${transformed}
</body>
</html>`

const outHtml = resolve(root, 'coupon-sites/sunlu-gummy-page.html')
const outChunks = resolve(root, 'coupon-sites/sunlu-gummy-chunks.json')

writeFileSync(outHtml, fullPage, 'utf8')
writeFileSync(outChunks, JSON.stringify({ headLinks, chunks, promo: PROMO, shopUrl, siteUrl }, null, 2), 'utf8')

console.log('✅ Sunlu gummy-clone generated')
console.log(`   Full page: ${outHtml}`)
console.log(`   Chunks: ${chunks.length} sections`)
chunks.forEach((c) => console.log(`     • ${c.name}: ${c.chars} chars`))
