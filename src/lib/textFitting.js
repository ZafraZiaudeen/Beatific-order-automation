const DEFAULT_MIN_FONT_SIZE = 6
const MAX_CONFIGURED_LINES = 12

let measureCanvas = null

const getMeasureContext = () => {
  if (typeof document === 'undefined') return null
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  return measureCanvas.getContext('2d')
}

const positiveNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const fontParts = (fontStyle = 'normal', fontWeight = 400) => {
  const style = String(fontStyle || 'normal').toLowerCase()
  const resolvedStyle = style.includes('italic') ? 'italic' : 'normal'
  const resolvedWeight = style.includes('bold') ? 700 : positiveNumber(fontWeight, 400)
  return { style: resolvedStyle, weight: resolvedWeight }
}

const setCanvasFont = (ctx, size, family, fontStyle, fontWeight) => {
  const { style, weight } = fontParts(fontStyle, fontWeight)
  const safeFamily = String(family || 'Arial').replace(/"/g, '')
  ctx.font = `${style} ${weight} ${size}px "${safeFamily}", Arial, sans-serif`
}

const measure = (ctx, value) => ctx.measureText(String(value || '')).width

const splitLongToken = (ctx, token, maxWidth) => {
  const chunks = []
  let current = ''
  for (const char of token) {
    const next = `${current}${char}`
    if (current && measure(ctx, next) > maxWidth) {
      chunks.push(current)
      current = char
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks
}

const wrapParagraph = (ctx, paragraph, maxWidth) => {
  if (!paragraph) return ['']

  const lines = []
  let current = ''
  const tokens = String(paragraph).split(/(\s+)/)

  for (const token of tokens) {
    if (!token) continue
    const isSpace = /^\s+$/.test(token)
    if (isSpace && !current) continue

    const next = `${current}${token}`
    if (measure(ctx, next) <= maxWidth) {
      current = next
      continue
    }

    if (current.trim()) lines.push(current.trimEnd())

    if (!isSpace && measure(ctx, token) > maxWidth) {
      const chunks = splitLongToken(ctx, token, maxWidth)
      lines.push(...chunks.slice(0, -1))
      current = chunks[chunks.length - 1] || ''
    } else {
      current = isSpace ? '' : token.trimStart()
    }
  }

  if (current.trim() || !lines.length) lines.push(current.trimEnd())
  return lines
}

const wrapText = (ctx, text, maxWidth, maxLines) => {
  if (maxLines <= 1) return String(text || '').split(/\r?\n/)
  return String(text || '')
    .split(/\r?\n/)
    .flatMap((paragraph) => wrapParagraph(ctx, paragraph, maxWidth))
}

const getRenderedLineCount = ({ text, width, fontSize, fontFamily, fontStyle, fontWeight, maxLines }) => {
  const ctx = getMeasureContext()
  if (!ctx) return Math.max(1, String(text || '').split(/\r?\n/).length)

  setCanvasFont(ctx, fontSize, fontFamily, fontStyle, fontWeight)
  return Math.max(1, wrapText(ctx, text, Math.max(1, width), maxLines).length)
}

export const getFieldMaxLines = (field = {}) => {
  const explicit = Number(field.maxLines)
  if (Number.isFinite(explicit) && explicit >= 1) {
    return Math.min(MAX_CONFIGURED_LINES, Math.floor(explicit))
  }

  const fontSize = positiveNumber(field.fontSize, 12)
  const lineHeight = positiveNumber(field.lineHeight, 1.2)
  const height = positiveNumber(field.height, fontSize * lineHeight)
  return Math.max(1, Math.min(MAX_CONFIGURED_LINES, Math.floor(height / (fontSize * lineHeight))))
}

export const fitTextToBox = ({
  text,
  width,
  height,
  fontSize,
  fontFamily,
  fontStyle,
  fontWeight,
  lineHeight,
  maxLines,
  preserveFontSizeOnWrap = false,
  minFontSize = DEFAULT_MIN_FONT_SIZE,
}) => {
  const ctx = getMeasureContext()
  const boxWidth = positiveNumber(width, 1)
  const boxHeight = positiveNumber(height, 1)
  const startSize = positiveNumber(fontSize, 12)
  const resolvedLineHeight = positiveNumber(lineHeight, 1.2)
  const resolvedMaxLines = Math.max(1, Math.min(MAX_CONFIGURED_LINES, Math.floor(positiveNumber(maxLines, 1))))
  const effectiveHeight = preserveFontSizeOnWrap && resolvedMaxLines > 1
    ? Math.max(boxHeight, startSize * resolvedLineHeight * resolvedMaxLines)
    : boxHeight

  if (!ctx) return startSize

  let size = startSize
  while (size >= minFontSize - 0.01) {
    setCanvasFont(ctx, size, fontFamily, fontStyle, fontWeight)
    const lines = wrapText(ctx, text, boxWidth, resolvedMaxLines)
    const widest = lines.reduce((max, line) => Math.max(max, measure(ctx, line)), 0)
    const textHeight = lines.length * size * resolvedLineHeight

    if (lines.length <= resolvedMaxLines && widest <= boxWidth + 0.5 && textHeight <= effectiveHeight + 0.5) {
      return Math.round(size * 100) / 100
    }

    size -= 0.5
  }

  return minFontSize
}

export const getFittedTextProps = (field, text, { paddingX = 0, paddingY = 0 } = {}) => {
  const maxLines = getFieldMaxLines(field)
  const configuredFontSize = positiveNumber(field?.fontSize, 12)
  const lineHeight = positiveNumber(field?.lineHeight, 1.2)
  const boxHeight = Math.max(1, positiveNumber(field?.height, 1) - paddingY)
  const boxWidth = Math.max(1, positiveNumber(field?.width, 1) - paddingX)
  const preserveFontSizeOnWrap = Boolean(field?.preserveFontSizeOnWrap)
  const wrap = maxLines <= 1 ? 'none' : 'word'

  if (maxLines <= 1) {
    return {
      fontSize: configuredFontSize,
      height: boxHeight,
      maxLines,
      wrap,
    }
  }

  if (preserveFontSizeOnWrap) {
    const renderedLines = getRenderedLineCount({
      text,
      width: boxWidth,
      fontSize: configuredFontSize,
      fontFamily: field?.fontFamily,
      fontStyle: field?.fontStyle,
      fontWeight: field?.fontWeight,
      maxLines,
    })

    return {
      fontSize: configuredFontSize,
      height: Math.max(boxHeight, renderedLines * configuredFontSize * lineHeight),
      maxLines,
      wrap,
    }
  }

  const fontSize = fitTextToBox({
    text,
    width: boxWidth,
    height: boxHeight,
    fontSize: configuredFontSize,
    fontFamily: field?.fontFamily,
    fontStyle: field?.fontStyle,
    fontWeight: field?.fontWeight,
    lineHeight,
    maxLines,
    preserveFontSizeOnWrap,
  })

  return {
    fontSize,
    height: boxHeight,
    maxLines,
    wrap,
  }
}
