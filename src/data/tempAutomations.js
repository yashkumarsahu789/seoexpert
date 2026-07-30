/**
 * /temp automation boxes — tum bataoge kaunsa banana hai, yahan entry add hogi.
 * Har box = apna page + logic. 3 AI keys sirf automation chalte waqt use hoti hain.
 */

export const TEMP_AUTOMATIONS = [
  {
    id: 'models-limits',
    path: '/temp/models',
    name: 'AI models and limits',
    icon: '📋',
    accent: '#0ea5e9',
    description: 'Kaunse Gemini models hain, limits, aur kis kaam ke liye',
    primary: true,
    kind: 'catalog',
  },
]

export function getTempAutomation(id) {
  return TEMP_AUTOMATIONS.find((a) => a.id === id) || null
}
