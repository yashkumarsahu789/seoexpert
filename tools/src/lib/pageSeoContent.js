/** SEO copy — sirf hero me H1+H2; baaki sab niche section me */

export function buildSeoContent({ keyword, pageType, toolType, label, brandName, seo = null, intelligence = null }) {
  const name = brandName || label || keyword
  const brief = intelligence?.brief

  if (pageType === 'brand') {
    return {
      h1: seo?.h1 || `Open ${name}`,
      h2: seo?.h2 || brief?.user_expectation || `Fast, secure access to ${name} for “${keyword}”`,
      features: seo?.features?.length
        ? seo.features
        : seo?.bullets?.length
          ? seo.bullets
          : [
              `Direct path to the official ${name} website`,
              brief?.differentiator || 'Mobile-friendly page built for search intent',
              'Clear redirect — no login stored on this page',
            ],
      requirements: seo?.requirements?.length
        ? seo.requirements
        : [
            'Tap the primary button to continue to the official destination',
            'Use a modern browser (Chrome, Safari, Edge, Firefox)',
            'Stable internet connection recommended',
          ],
      faqs: seo?.faqs?.length
        ? seo.faqs
        : [
            {
              q: `Is this the official ${name} website?`,
              a: `No. This is a LifeSolveNow access page that helps you reach the official ${name} site quickly and transparently.`,
            },
            {
              q: `Why does this page exist for “${keyword}”?`,
              a: brief?.purpose || `Many users search for “${keyword}” — this page matches that intent with a clean layout and one-tap access.`,
            },
            {
              q: 'Is my data collected here?',
              a: 'We do not ask for login or payment on this page. You continue to the official site when you tap Open.',
            },
          ],
    }
  }

  const toolCopy = TOOL_SEO[toolType] || TOOL_SEO.landing
  return {
    h1: seo?.h1 || toolCopy.h1(keyword, label),
    h2: seo?.h2 || brief?.user_expectation || toolCopy.h2(keyword, label),
    features: seo?.features?.length ? seo.features : seo?.bullets?.length ? seo.bullets : toolCopy.features(keyword, label),
    requirements: seo?.requirements?.length ? seo.requirements : toolCopy.requirements(keyword, label),
    faqs: seo?.faqs?.length ? seo.faqs : toolCopy.faqs(keyword, label),
  }
}

const TOOL_SEO = {
  calculator: {
    h1: (kw, label) => `${label || 'Calculator'} — ${kw}`,
    h2: (kw) => `Free online calculator for “${kw}” — instant results in your browser`,
    features: () => [
      'Basic arithmetic: +, −, ×, ÷ and brackets',
      'Works on phone, tablet, and desktop',
      'No signup, no install — private in-browser use',
    ],
    requirements: () => [
      'Enter a valid math expression (e.g. 25 * 4 + 10)',
      'Press Calculate or hit Enter',
      'Use decimal points for fractional numbers',
    ],
    faqs: (kw, label) => [
      { q: `Is this ${label || 'calculator'} free?`, a: 'Yes. It runs entirely in your browser at no cost.' },
      { q: 'Are my calculations saved?', a: 'No. Nothing is sent to a server unless you choose to save elsewhere.' },
      { q: `Who is this page for?`, a: `Anyone searching for “${kw}” who needs a quick, reliable calculator.` },
    ],
  },
  timer: {
    h1: (kw, label) => `${label || 'Timer'} — ${kw}`,
    h2: (kw) => `Countdown timer for “${kw}” — focus, workouts, and reminders`,
    features: () => ['Set seconds and start instantly', 'Large readable countdown', 'Stop anytime — runs locally'],
    requirements: () => ['Enter duration in seconds', 'Tap Start — keep this tab open while timing'],
    faqs: (kw) => [
      { q: 'Does the timer work in the background?', a: 'Keep this browser tab active for accurate countdown.' },
      { q: `Is “${kw}” timer free?`, a: 'Yes — no account required.' },
    ],
  },
  bmi: {
    h1: (kw, label) => `${label || 'BMI Calculator'} — ${kw}`,
    h2: (kw) => `Check body mass index for “${kw}” — weight and height in metric units`,
    features: () => [
      'Metric input: kilograms and centimetres',
      'Instant BMI result on screen',
      'Educational use — not medical advice',
    ],
    requirements: () => [
      'Enter weight in kg and height in cm',
      'Tap Get BMI for your result',
      'Consult a professional for health decisions',
    ],
    faqs: (kw) => [
      { q: 'Is BMI accurate for everyone?', a: 'BMI is a general guide; athletes and some body types may need other metrics.' },
      { q: `Why use this for “${kw}”?`, a: 'Fast, private BMI check without installing an app.' },
    ],
  },
  landing: {
    h1: (kw, label) => label || kw,
    h2: (kw) => `Everything you need for “${kw}” — clear, helpful, mobile-ready`,
    features: (kw) => [
      `Content structured around “${kw}” search intent`,
      'Clean professional layout',
      'Fast loading static experience',
    ],
    requirements: (kw) => [`Read the overview below “${kw}”`, 'Use primary actions above the fold first'],
    faqs: (kw) => [
      { q: `What is this page about?`, a: `A focused landing page for the keyword “${kw}”.` },
      { q: 'Can I share this page?', a: 'Yes — share the URL with anyone looking for the same topic.' },
    ],
  },
}
