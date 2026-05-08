export const FONT_OPTIONS = [
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Canela', value: 'Canela' },
  { label: 'Canela Deck', value: 'Canela Deck' },
  { label: 'Canela Text', value: 'Canela Text' },
]

export const normalizeFontStyle = (style = 'normal') => {
  const lower = String(style).toLowerCase()
  if (lower.includes('bold') && lower.includes('italic')) return 'bold italic'
  if (lower.includes('bold')) return 'bold'
  if (lower.includes('italic')) return 'italic'
  return 'normal'
}
