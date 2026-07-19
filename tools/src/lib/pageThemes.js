/** Per-tool and per-brand themes — har page type alag look */

const BASE = {
  font: 'system-ui, -apple-system, Segoe UI, sans-serif',
  radius: '12px',
}

export const TOOL_THEMES = {
  calculator: {
    id: 'calculator',
    label: 'Calculator',
    light: true,
    bg: '#f8fafc',
    surface: '#ffffff',
    accent: '#2563eb',
    accentText: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    pattern: 'grid',
    ...BASE,
  },
  timer: {
    id: 'timer',
    label: 'Timer',
    light: true,
    bg: '#fff7ed',
    surface: '#ffffff',
    accent: '#ea580c',
    accentText: '#ffffff',
    text: '#431407',
    muted: '#9a3412',
    pattern: 'pulse',
    ...BASE,
  },
  bmi: {
    id: 'bmi',
    label: 'BMI',
    light: true,
    bg: '#f0fdf4',
    surface: '#ffffff',
    accent: '#16a34a',
    accentText: '#ffffff',
    text: '#14532d',
    muted: '#4b5563',
    pattern: 'soft',
    ...BASE,
  },
  password: {
    id: 'password',
    label: 'Password',
    light: true,
    bg: '#faf5ff',
    surface: '#ffffff',
    accent: '#7c3aed',
    accentText: '#ffffff',
    text: '#1e1b4b',
    muted: '#6b7280',
    pattern: 'dots',
    ...BASE,
  },
  notepad: {
    id: 'notepad',
    label: 'Notepad',
    light: true,
    bg: '#fffbeb',
    surface: '#ffffff',
    accent: '#d97706',
    accentText: '#ffffff',
    text: '#292524',
    muted: '#78716c',
    pattern: 'lines',
    ...BASE,
  },
  todo: {
    id: 'todo',
    label: 'Todo',
    light: true,
    bg: '#eef2ff',
    surface: '#ffffff',
    accent: '#4f46e5',
    accentText: '#ffffff',
    text: '#1e1b4b',
    muted: '#6366f1',
    pattern: 'check',
    ...BASE,
  },
  counter: {
    id: 'counter',
    label: 'Counter',
    light: true,
    bg: '#ecfeff',
    surface: '#ffffff',
    accent: '#0891b2',
    accentText: '#ffffff',
    text: '#164e63',
    muted: '#0e7490',
    pattern: 'grid',
    ...BASE,
  },
  landing: {
    id: 'landing',
    label: 'Landing',
    light: true,
    bg: '#ffffff',
    surface: '#f1f5f9',
    accent: '#0f766e',
    accentText: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
    pattern: 'soft',
    ...BASE,
  },
}

export const BRAND_THEMES = {
  chatgpt: {
    id: 'chatgpt',
    bg: '#0d0d0d',
    surface: '#1a1a1a',
    accent: '#10a37f',
    accentText: '#ffffff',
    text: '#ececec',
    muted: '#8e8ea0',
    icon: '💬',
    pattern: 'soft',
    ...BASE,
  },
  openai: {
    id: 'openai',
    bg: '#0b0f14',
    surface: '#161b22',
    accent: '#10a37f',
    accentText: '#fff',
    text: '#e6edf3',
    muted: '#8b949e',
    icon: '🤖',
    pattern: 'soft',
    ...BASE,
  },
  youtube: {
    id: 'youtube',
    bg: '#0f0f0f',
    surface: '#212121',
    accent: '#ff0000',
    accentText: '#ffffff',
    text: '#ffffff',
    muted: '#aaaaaa',
    icon: '▶️',
    pattern: 'soft',
    ...BASE,
  },
  google: {
    id: 'google',
    bg: '#ffffff',
    surface: '#f8f9fa',
    accent: '#4285f4',
    accentText: '#ffffff',
    text: '#202124',
    muted: '#5f6368',
    icon: '🔍',
    pattern: 'soft',
    ...BASE,
  },
  amazon: {
    id: 'amazon',
    bg: '#131921',
    surface: '#232f3e',
    accent: '#ff9900',
    accentText: '#131921',
    text: '#ffffff',
    muted: '#cccccc',
    icon: '🛒',
    pattern: 'soft',
    ...BASE,
  },
  flipkart: {
    id: 'flipkart',
    bg: '#2874f0',
    surface: '#ffffff',
    accent: '#ffe500',
    accentText: '#2874f0',
    text: '#212121',
    muted: '#878787',
    icon: '🛍️',
    pattern: 'soft',
    ...BASE,
  },
  netflix: {
    id: 'netflix',
    bg: '#000000',
    surface: '#141414',
    accent: '#e50914',
    accentText: '#ffffff',
    text: '#ffffff',
    muted: '#b3b3b3',
    icon: '🎬',
    pattern: 'soft',
    ...BASE,
  },
  spotify: {
    id: 'spotify',
    bg: '#121212',
    surface: '#181818',
    accent: '#1db954',
    accentText: '#000000',
    text: '#ffffff',
    muted: '#b3b3b3',
    icon: '🎵',
    pattern: 'soft',
    ...BASE,
  },
  whatsapp: {
    id: 'whatsapp',
    bg: '#0b141a',
    surface: '#111b21',
    accent: '#25d366',
    accentText: '#ffffff',
    text: '#e9edef',
    muted: '#8696a0',
    icon: '💚',
    pattern: 'soft',
    ...BASE,
  },
  gmail: {
    id: 'gmail',
    bg: '#f6f8fc',
    surface: '#ffffff',
    accent: '#ea4335',
    accentText: '#ffffff',
    text: '#1f1f1f',
    muted: '#5f6368',
    icon: '✉️',
    pattern: 'soft',
    ...BASE,
  },
  instagram: {
    id: 'instagram',
    bg: '#0f0f12',
    surface: '#1a1a22',
    accent: '#e1306c',
    accentText: '#ffffff',
    text: '#fafafa',
    muted: '#a8a8a8',
    icon: '📷',
    pattern: 'soft',
    ...BASE,
  },
  facebook: {
    id: 'facebook',
    bg: '#18191a',
    surface: '#242526',
    accent: '#1877f2',
    accentText: '#ffffff',
    text: '#e4e6eb',
    muted: '#b0b3b8',
    icon: '👤',
    pattern: 'soft',
    ...BASE,
  },
}

const FALLBACK_BRAND_PALETTES = [
  { accent: '#2563eb', bg: '#ffffff', surface: '#f8fafc', text: '#0f172a', muted: '#64748b', light: true },
  { accent: '#0d9488', bg: '#f0fdfa', surface: '#ffffff', text: '#134e4a', muted: '#5f6b6a', light: true },
  { accent: '#dc2626', bg: '#ffffff', surface: '#fef2f2', text: '#1f2937', muted: '#6b7280', light: true },
  { accent: '#7c3aed', bg: '#faf5ff', surface: '#ffffff', text: '#1e1b4b', muted: '#6b7280', light: true },
]

function hashHost(host) {
  let h = 0
  for (let i = 0; i < host.length; i += 1) h = (h * 31 + host.charCodeAt(i)) >>> 0
  return h
}

export function themeFromHostname(hostname) {
  const host = String(hostname || 'site').replace(/^www\./, '').toLowerCase()
  const name = host.split('.')[0]
  const palette = FALLBACK_BRAND_PALETTES[hashHost(host) % FALLBACK_BRAND_PALETTES.length]
  return {
    id: `brand-${name}`,
    bg: palette.bg,
    surface: palette.surface,
    accent: palette.accent,
    accentText: '#ffffff',
    text: palette.text || '#0f172a',
    muted: palette.muted || '#64748b',
    light: palette.light === true,
    icon: '🌐',
    pattern: 'soft',
    ...BASE,
  }
}

export function resolveTheme(cls, serpTopUrl = '') {
  if (cls.pageType === 'brand') {
    const key = cls.brandKey
    if (key && BRAND_THEMES[key]) return { ...BRAND_THEMES[key] }
    try {
      const host = new URL(cls.targetUrl || cls.url || serpTopUrl).hostname
      return themeFromHostname(host)
    } catch {
      return themeFromHostname(cls.name || 'site')
    }
  }
  const toolType = cls.toolType || 'landing'
  return { ...(TOOL_THEMES[toolType] || TOOL_THEMES.landing) }
}
