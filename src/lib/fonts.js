const weightNames = [
  ['Thin', 100],
  ['Light', 300],
  ['Regular', 400],
  ['Medium', 500],
  ['Bold', 700],
  ['Black', 900],
]

const canelaFamilies = [
  { label: 'Canela', prefix: 'Canela', dir: '' },
  { label: 'Canela Condensed', prefix: 'CanelaCondensed', dir: '' },
  { label: 'Canela Deck', prefix: 'CanelaDeck', dir: '' },
  { label: 'Canela Text', prefix: 'CanelaText', dir: '' },
]

const canelaOptions = canelaFamilies.flatMap((family) =>
  weightNames.flatMap(([weightName, weight]) => {
    const baseFile = `${family.prefix}-${weightName}-Trial.otf`
    const italicFile = `${family.prefix}-${weightName}Italic-Trial.otf`
    return [
      {
        label: `${family.label} ${weightName}`,
        value: `${family.label} ${weightName}`,
        file: baseFile,
        weight,
        style: 'normal',
      },
      {
        label: `${family.label} ${weightName} Italic`,
        value: `${family.label} ${weightName} Italic`,
        file: italicFile,
        weight,
        style: 'italic',
      },
    ]
  })
)

const canelaTextNo2Options = [
  {
    label: 'Canela Text Regular No2',
    value: 'Canela Text Regular No2',
    file: 'CanelaText-RegularNo2-Trial.otf',
    weight: 400,
    style: 'normal',
  },
  {
    label: 'Canela Text Regular No2 Italic',
    value: 'Canela Text Regular No2 Italic',
    file: 'CanelaText-RegularNo2Italic-Trial.otf',
    weight: 400,
    style: 'italic',
  },
]

const GENERIC_FONT_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'])
const EMOJI_FALLBACK_FAMILIES = ['Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI Symbol', 'Arial', 'sans-serif']

export const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial', weight: 400, style: 'normal' },
  { label: 'Helvetica', value: 'Helvetica', weight: 400, style: 'normal' },
  { label: 'Georgia', value: 'Georgia', weight: 400, style: 'normal' },
  { label: 'Times New Roman', value: 'Times New Roman', weight: 400, style: 'normal' },
  ...canelaOptions,
  ...canelaTextNo2Options,
]

export const getFontOption = (value) =>
  FONT_OPTIONS.find((font) => font.value === value || font.file === value) || null

export const normalizeFontStyle = (style = 'normal') => {
  const lower = String(style).toLowerCase()
  if (lower.includes('bold') && lower.includes('italic')) return 'bold italic'
  if (lower.includes('bold')) return 'bold'
  if (lower.includes('italic')) return 'italic'
  return 'normal'
}

const normalizeFontToken = (value = '') => String(value || '').trim().replace(/^['"]|['"]$/g, '')

const cssFontToken = (value = '') => {
  const token = normalizeFontToken(value)
  if (!token) return ''
  if (GENERIC_FONT_FAMILIES.has(token.toLowerCase())) return token
  return `"${token.replace(/"/g, '\\"')}"`
}

export const fontFamilyWithEmojiFallback = (family = 'Arial') => {
  const merged = []
  for (const token of [...String(family || 'Arial').split(','), ...EMOJI_FALLBACK_FAMILIES]) {
    const normalized = normalizeFontToken(token)
    if (!normalized) continue
    if (merged.some((value) => value.toLowerCase() === normalized.toLowerCase())) continue
    merged.push(normalized)
  }
  return merged.map(cssFontToken).filter(Boolean).join(', ')
}

export const ensureFontFaces = () => {
  if (typeof document === 'undefined' || document.getElementById('beatific-canela-fonts')) return
  const css = [...canelaOptions, ...canelaTextNo2Options]
    .map((font) => `
@font-face {
  font-family: '${font.value}';
  src: url('/fonts/canela/${font.file}') format('opentype');
  font-weight: ${font.weight};
  font-style: ${font.style};
  font-display: swap;
}`)
    .join('\n')
  const style = document.createElement('style')
  style.id = 'beatific-canela-fonts'
  style.textContent = css
  document.head.appendChild(style)
}
