/** Shared page generator — used by n8n snippet + local test scripts */

export const BRAND_MAP = {
  chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com', icon: '💬' },
  openai: { name: 'OpenAI', url: 'https://openai.com', icon: '🤖' },
  google: { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
  youtube: { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' },
  facebook: { name: 'Facebook', url: 'https://www.facebook.com', icon: '👤' },
  instagram: { name: 'Instagram', url: 'https://www.instagram.com', icon: '📷' },
  whatsapp: { name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: '💚' },
  amazon: { name: 'Amazon', url: 'https://www.amazon.in', icon: '🛒' },
  flipkart: { name: 'Flipkart', url: 'https://www.flipkart.com', icon: '🛍️' },
  netflix: { name: 'Netflix', url: 'https://www.netflix.com', icon: '🎬' },
  spotify: { name: 'Spotify', url: 'https://open.spotify.com', icon: '🎵' },
  gmail: { name: 'Gmail', url: 'https://mail.google.com', icon: '✉️' },
}

export const TOOL_PATTERNS = [
  { match: /calculator|calc\b/i, type: 'calculator', label: 'Calculator' },
  { match: /timer|stopwatch|countdown/i, type: 'timer', label: 'Timer' },
  { match: /notepad|notes|memo/i, type: 'notepad', label: 'Notepad' },
  { match: /todo|checklist|task list/i, type: 'todo', label: 'Todo List' },
  { match: /counter|tally/i, type: 'counter', label: 'Counter' },
  { match: /password|pass gen/i, type: 'password', label: 'Password Generator' },
  { match: /unit convert|converter/i, type: 'unit', label: 'Unit Converter' },
  { match: /bmi/i, type: 'bmi', label: 'BMI Calculator' },
  { match: /age calc|age calculator/i, type: 'age', label: 'Age Calculator' },
  { match: /qr code|qr generator/i, type: 'qr', label: 'QR Code' },
]

export function slugify(keyword) {
  return String(keyword || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'page'
}

export function classifyKeyword(keyword, serpTopUrl = '') {
  const kw = String(keyword || '').trim().toLowerCase()
  const serpHost = tryHost(serpTopUrl)

  for (const [key, brand] of Object.entries(BRAND_MAP)) {
    if (kw.includes(key) || serpHost.includes(key.replace(/\s/g, ''))) {
      return { pageType: 'brand', brandKey: key, ...brand, targetUrl: brand.url }
    }
  }

  for (const tool of TOOL_PATTERNS) {
    if (tool.match.test(kw)) {
      return { pageType: 'tool', toolType: tool.type, label: tool.label, targetUrl: null }
    }
  }

  if (serpTopUrl && serpHost && !serpHost.includes('lifesolvenow')) {
    return {
      pageType: 'brand',
      brandKey: slugify(serpHost.split('.')[0]),
      name: titleCase(serpHost.replace(/^www\./, '').split('.')[0]),
      url: serpTopUrl.startsWith('http') ? serpTopUrl : `https://${serpTopUrl}`,
      icon: '🌐',
      targetUrl: serpTopUrl.startsWith('http') ? serpTopUrl : `https://${serpTopUrl}`,
    }
  }

  return { pageType: 'tool', toolType: 'landing', label: titleCase(kw), targetUrl: null }
}

function tryHost(url) {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase()
  } catch {
    return ''
  }
}

function titleCase(s) {
  return String(s || '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function outLink(targetUrl, basePath = '/out/') {
  const enc = encodeURIComponent(targetUrl)
  return `${basePath}?to=${enc}`
}

function buildFaqSection(faqs = []) {
  if (!faqs.length) return ''
  return `
    <section class="card">
      <h2>Frequently asked questions</h2>
      <div class="faq-list">
        ${faqs
          .map(
            (faq) => `
          <details class="faq-item">
            <summary>${esc(faq.q)}</summary>
            <p>${esc(faq.a)}</p>
          </details>`
          )
          .join('')}
      </div>
    </section>`
}

function pageShell({ title, description, bodyHtml, keyword }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="keywords" content="${esc(keyword)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="https://shop.LifeSolveNow.com/pages/${slugify(keyword)}.html" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%),
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.12), transparent 24%);
      pointer-events: none;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 56px; position: relative; }
    .badge { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #94a3b8; margin-bottom: 12px; }
    h1 { font-size: clamp(32px, 5vw, 54px); line-height: 1.05; margin-bottom: 14px; color: #f8fafc; }
    .sub { color: #cbd5e1; line-height: 1.75; margin-bottom: 28px; font-size: 18px; max-width: 72ch; }
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: #22c55e; color: #052e16; font-weight: 600;
      padding: 14px 22px; border-radius: 10px; text-decoration: none;
      font-size: 16px; border: none; cursor: pointer;
    }
    .btn:hover { background: #16a34a; }
    .btn-secondary { background: #334155; color: #f1f5f9; margin-left: 10px; }
    .hero {
      display: grid;
      grid-template-columns: 1.35fr .95fr;
      gap: 24px;
      align-items: stretch;
      margin-bottom: 24px;
    }
    .hero-main, .hero-side, .card {
      background: rgba(30, 41, 59, 0.88);
      border: 1px solid #334155;
      border-radius: 18px;
      padding: 24px;
      backdrop-filter: blur(8px);
    }
    .hero-side {
      display: flex;
      flex-direction: column;
      gap: 14px;
      justify-content: center;
    }
    .card { margin-top: 24px; }
    .card h2 { font-size: 18px; margin-bottom: 10px; color: #f8fafc; }
    .card ul { padding-left: 18px; line-height: 1.7; color: #cbd5e1; }
    .hero-points, .metric-list, .steps-list, .feature-grid { margin-top: 18px; }
    .hero-points { display: grid; gap: 10px; }
    .hero-points li, .steps-list li { color: #cbd5e1; line-height: 1.6; }
    .metric-list {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .metric {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 14px;
    }
    .metric strong {
      display: block;
      color: #f8fafc;
      font-size: 18px;
      margin-bottom: 6px;
    }
    .metric span { color: #94a3b8; font-size: 14px; line-height: 1.5; }
    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .feature {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 14px;
      padding: 16px;
    }
    .feature h3 { font-size: 16px; margin-bottom: 8px; color: #f8fafc; }
    .feature p { color: #cbd5e1; line-height: 1.6; }
    .eyebrow {
      color: #38bdf8;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 10px;
    }
    .trust-note {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .faq-list { display: grid; gap: 12px; }
    .faq-item {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .faq-item summary {
      cursor: pointer;
      color: #f8fafc;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .faq-item p { color: #cbd5e1; line-height: 1.6; margin-top: 10px; }
    .tool-area { margin-top: 20px; }
    input, textarea, select, button { font: inherit; }
    input, textarea, select {
      width: 100%; padding: 10px 12px; border-radius: 8px;
      border: 1px solid #475569; background: #0f172a; color: #f8fafc;
    }
    .tool-stack { display: grid; gap: 12px; }
    .inline-note { margin-top: 10px; color: #94a3b8; font-size: 14px; }
    .footer { margin-top: 40px; font-size: 13px; color: #64748b; }
    .footer a { color: #38bdf8; }
    @media (max-width: 860px) {
      .hero { grid-template-columns: 1fr; }
      .metric-list { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    ${bodyHtml}
    <p class="footer">Powered by <a href="https://shop.LifeSolveNow.com">LifeSolveNow</a> · Keyword: ${esc(keyword)}</p>
  </div>
</body>
</html>`
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateBrandPage(keyword, meta = {}) {
  const name = meta.name || titleCase(keyword)
  const target = meta.targetUrl || meta.url || `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
  const icon = meta.icon || '🌐'
  const openHref = outLink(target)
  const faqs = [
    {
      q: `How do I open ${name} safely?`,
      a: `Use the main button on this page to continue to the official ${name} destination.`,
    },
    {
      q: `Is this page the official ${name} site?`,
      a: `No. This is a fast-access landing page that helps users reach the official ${name} website.`,
    },
    {
      q: `Why does this page exist?`,
      a: `It gives search visitors a clean, fast, mobile-friendly route to the destination they are looking for.`,
    },
  ]

  const bodyHtml = `
    <section class="hero">
      <div class="hero-main">
        <p class="badge">Official access page</p>
        <h1>${icon} Open ${esc(name)}</h1>
        <p class="sub">Looking for <strong>${esc(keyword)}</strong>? This page gives visitors a fast path to the official ${esc(name)} website with a clean mobile-first experience and clear redirect disclosure.</p>
        <a class="btn" href="${openHref}" rel="nofollow">Go to ${esc(name)} now</a>
        <a class="btn btn-secondary" href="https://shop.LifeSolveNow.com">Explore LifeSolveNow</a>
        <ul class="hero-points">
          <li>Direct path to the official destination</li>
          <li>Fast-loading static page built for mobile search traffic</li>
          <li>No account collection or login handling on this page</li>
        </ul>
      </div>
      <aside class="hero-side">
        <p class="eyebrow">Why this page performs</p>
        <div class="metric-list">
          <div class="metric">
            <strong>Intent match</strong>
            <span>Matches branded search demand for ${esc(keyword)}.</span>
          </div>
          <div class="metric">
            <strong>Fast UX</strong>
            <span>Static layout keeps the page light and quick to load.</span>
          </div>
          <div class="metric">
            <strong>Trust first</strong>
            <span>Clear redirect language helps users understand what happens next.</span>
          </div>
        </div>
        <p class="trust-note">LifeSolveNow maintains these branded access pages to help users reach the right site quickly without clutter, confusion, or misleading copy.</p>
      </aside>
    </section>
    <section class="card">
      <h2>About ${esc(name)}</h2>
      <div class="feature-grid">
        <div class="feature">
          <h3>Official destination</h3>
          <p>The main call to action points users toward the official ${esc(name)} site.</p>
        </div>
        <div class="feature">
          <h3>Clear intent</h3>
          <p>This page is written for users who want quick access to ${esc(name)} from search results.</p>
        </div>
        <div class="feature">
          <h3>Professional presentation</h3>
          <p>Structured sections, clean typography, and concise copy make the landing page feel polished.</p>
        </div>
      </div>
    </section>
    <section class="card">
      <h2>What to expect</h2>
      <ol class="steps-list">
        <li>Click the primary button to continue to the official destination.</li>
        <li>Review the site or sign in there if needed.</li>
        <li>Come back to LifeSolveNow to discover similar tools and pages.</li>
      </ol>
    </section>
    ${buildFaqSection(faqs)}`

  return pageShell({
    title: `Open ${name} Official Site | ${keyword}`,
    description: `Open the official ${name} website from this fast access page for ${keyword}. Clean redirect, mobile-friendly layout, and clear destination guidance.`,
    keyword,
    bodyHtml,
  })
}

function toolBody(toolType, keyword, label) {
  const map = {
    calculator: `
      <section class="hero">
        <div class="hero-main">
          <p class="badge">Free online calculator</p>
          <h1>🧮 ${esc(label)}</h1>
          <p class="sub">Use this fast browser-based ${esc(label.toLowerCase())} for quick calculations. No signup, no install, and works smoothly on mobile or desktop.</p>
          <div class="feature-grid">
            <div class="feature"><h3>Instant result</h3><p>Type an expression and calculate in one click.</p></div>
            <div class="feature"><h3>No setup</h3><p>Runs directly in the browser without account creation.</p></div>
            <div class="feature"><h3>Lightweight</h3><p>Optimized as a fast static page for search users.</p></div>
          </div>
        </div>
        <aside class="hero-side">
          <p class="eyebrow">Best for</p>
          <ul class="hero-points">
            <li>Quick math on any device</li>
            <li>Students, shoppers, and office use</li>
            <li>Visitors searching for ${esc(keyword)}</li>
          </ul>
        </aside>
      </section>
      <div class="tool-area card">
        <h2>Calculator</h2>
        <div class="tool-stack">
        <input id="expr" type="text" placeholder="e.g. 25 * 4 + 10" />
        <button class="btn" style="margin-top:12px" onclick="
          try { document.getElementById('out').textContent = eval(document.getElementById('expr').value) }
          catch(e) { document.getElementById('out').textContent = 'Invalid expression' }
        ">Calculate</button>
        <p id="out" style="margin-top:14px;font-size:24px;font-weight:700;color:#4ade80"></p>
        </div>
        <p class="inline-note">Tip: use +, -, *, / and brackets for longer expressions.</p>
      </div>
      ${buildFaqSection([
        { q: `Is this ${label} free to use?`, a: 'Yes. It is a free browser-based utility.' },
        { q: 'Does it store my calculations?', a: 'No. The calculator runs directly in the page.' },
      ])}`,
    timer: `
      <section class="hero">
        <div class="hero-main">
          <p class="badge">Free countdown timer</p>
          <h1>⏱️ ${esc(label)}</h1>
          <p class="sub">Set a quick countdown in your browser for study sessions, workouts, cooking, meetings, or focus sprints. Fast, simple, and mobile-friendly.</p>
        </div>
        <aside class="hero-side">
          <p class="eyebrow">Use cases</p>
          <ul class="hero-points">
            <li>Pomodoro focus blocks</li>
            <li>Workout or rest intervals</li>
            <li>Kitchen and break reminders</li>
          </ul>
        </aside>
      </section>
      <div class="tool-area card">
        <h2>Start timer</h2>
        <div class="tool-stack">
        <input id="secs" type="number" value="60" min="1" />
        <button class="btn" style="margin-top:12px" onclick="
          let s=+document.getElementById('secs').value||60;
          const el=document.getElementById('t'); clearInterval(window._t);
          window._t=setInterval(()=>{ el.textContent=s+'s'; if(--s<0) clearInterval(window._t); },1000);
        ">Start</button>
        <p id="t" style="margin-top:14px;font-size:32px;font-weight:700;color:#38bdf8">60s</p>
        </div>
      </div>`,
    notepad: `
      <p class="badge">Free tool</p>
      <h1>📝 ${esc(label)}</h1>
      <p class="sub">${esc(keyword)} — autosave notepad in your browser.</p>
      <div class="tool-area card">
        <textarea id="note" rows="10" placeholder="Type here…" oninput="localStorage.setItem('lsn-note',this.value)"></textarea>
        <script>document.getElementById('note').value=localStorage.getItem('lsn-note')||''</script>
      </div>`,
    todo: `
      <p class="badge">Free tool</p>
      <h1>✅ ${esc(label)}</h1>
      <p class="sub">${esc(keyword)} — simple todo list.</p>
      <div class="tool-area card">
        <input id="new" placeholder="Add task…" onkeydown="if(event.key==='Enter')add()" />
        <ul id="list" style="margin-top:12px;line-height:2"></ul>
        <script>
          let items=JSON.parse(localStorage.getItem('lsn-todo')||'[]');
          function render(){ document.getElementById('list').innerHTML=items.map((t,i)=>'<li><input type=checkbox '+(t.done?'checked':'')+' onchange=\'toggle('+i+')\'> '+t.text+'</li>').join(''); }
          function add(){ const v=document.getElementById('new'); if(!v.value.trim())return; items.push({text:v.value,done:false}); v.value=''; save(); render(); }
          function toggle(i){ items[i].done=!items[i].done; save(); render(); }
          function save(){ localStorage.setItem('lsn-todo',JSON.stringify(items)); }
          render();
        </script>
      </div>`,
    counter: `
      <p class="badge">Free tool</p>
      <h1>🔢 ${esc(label)}</h1>
      <p class="sub">${esc(keyword)} — tap counter.</p>
      <div class="tool-area card" style="text-align:center">
        <p id="c" style="font-size:48px;font-weight:700;color:#a78bfa">0</p>
        <button class="btn" onclick="n++;document.getElementById('c').textContent=n">+1</button>
        <button class="btn btn-secondary" onclick="n=0;document.getElementById('c').textContent=0">Reset</button>
        <script>let n=0</script>
      </div>`,
    password: `
      <p class="badge">Free tool</p>
      <h1>🔐 ${esc(label)}</h1>
      <p class="sub">${esc(keyword)} — random password generator.</p>
      <div class="tool-area card">
        <input id="pw" readonly />
        <button class="btn" style="margin-top:12px" onclick="
          const c='abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
          let p=''; for(let i=0;i<16;i++) p+=c[Math.floor(Math.random()*c.length)];
          document.getElementById('pw').value=p;
        ">Generate</button>
      </div>`,
    bmi: `
      <p class="badge">Free tool</p>
      <h1>⚖️ ${esc(label)}</h1>
      <p class="sub">${esc(keyword)} — BMI calculator.</p>
      <div class="tool-area card">
        <input id="kg" type="number" placeholder="Weight (kg)" />
        <input id="cm" type="number" placeholder="Height (cm)" style="margin-top:8px" />
        <button class="btn" style="margin-top:12px" onclick="
          const h=(+document.getElementById('cm').value)/100;
          const w=+document.getElementById('kg').value;
          const bmi=(w/(h*h)).toFixed(1);
          document.getElementById('bmi').textContent = h&&w ? 'BMI: '+bmi : 'Enter values';
        ">Calculate BMI</button>
        <p id="bmi" style="margin-top:14px;font-size:24px;font-weight:700;color:#4ade80"></p>
      </div>`,
    landing: `
      <section class="hero">
        <div class="hero-main">
          <p class="badge">Keyword landing page</p>
          <h1>📌 ${esc(label)}</h1>
          <p class="sub">This page is built around the user intent behind <strong>${esc(keyword)}</strong> with a clean layout, clear structure, and helpful supporting sections instead of filler text.</p>
          <div class="feature-grid">
            <div class="feature"><h3>Search intent focused</h3><p>The copy is shaped to answer what users are likely looking for first.</p></div>
            <div class="feature"><h3>Professional structure</h3><p>Hero, feature blocks, FAQs, and internal paths improve clarity.</p></div>
            <div class="feature"><h3>Ready for scaling</h3><p>Works as a starting template for high-volume keyword page generation.</p></div>
          </div>
        </div>
        <aside class="hero-side">
          <p class="eyebrow">Recommended next actions</p>
          <ul class="hero-points">
            <li>Add real comparison points or topical content for this keyword.</li>
            <li>Link related pages from the main hub and sitemap.</li>
            <li>Expand FAQs using search console and SERP data.</li>
          </ul>
        </aside>
      </section>
      <section class="card">
        <h2>Why users land here</h2>
        <p class="sub">Visitors searching for ${esc(keyword)} usually want a fast answer, clear next step, or a simple online tool. This page provides that in a lighter, cleaner format.</p>
      </section>
      ${buildFaqSection([
        { q: `What is this ${keyword} page for?`, a: `It is a lightweight landing page built around the keyword ${keyword}.` },
        { q: 'Can this page be expanded later?', a: 'Yes. You can add richer content, tool widgets, comparisons, or calls to action.' },
      ])}`,
  }
  return map[toolType] || map.landing
}

export function generateToolPage(keyword, meta = {}) {
  const label = meta.label || titleCase(keyword)
  const toolType = meta.toolType || 'landing'
  const bodyHtml = toolBody(toolType, keyword, label)
  return pageShell({
    title: `${label} Online | Free ${label} for ${keyword}`,
    description: `Use ${label} online for ${keyword}. Fast, professional, mobile-friendly, and free to use directly in your browser.`,
    keyword,
    bodyHtml,
  })
}

export function generatePage(keyword, classification, serpTopUrl = '') {
  const cls = classification || classifyKeyword(keyword, serpTopUrl)
  if (cls.pageType === 'brand') {
    return { html: generateBrandPage(keyword, cls), pageType: 'brand', slug: slugify(keyword), meta: cls }
  }
  return { html: generateToolPage(keyword, cls), pageType: 'tool', slug: slugify(keyword), meta: cls }
}
