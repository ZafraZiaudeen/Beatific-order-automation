import { fontFamilyWithEmojiFallback } from './fonts'

export const DEFAULT_MIN_FONT_SIZE = 8
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
  ctx.font = `${style} ${weight} ${size}px ${fontFamilyWithEmojiFallback(family)}`
}

const measure = (ctx, value) => ctx.measureText(String(value || '')).width

const splitLongToken = (ctx, token, maxWidth) => {
  const chunks = []
  let current = ''
  for (const char of String(token || '')) {
    const next = `${current}${char}`
    if (current && measure(ctx, next) > maxWidth) {
      chunks.push(current)
      current = char
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks.length ? chunks : [String(token || '')]
}

const wrapParagraph = (ctx, paragraph, maxWidth) => {
  if (!paragraph) return { lines: [''], brokeLongWord: false }

  const lines = []
  let current = ''
  let brokeLongWord = false
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
      brokeLongWord = brokeLongWord || chunks.length > 1
      lines.push(...chunks.slice(0, -1))
      current = chunks[chunks.length - 1] || ''
    } else {
      current = isSpace ? '' : token.trimStart()
    }
  }

  if (current.trim() || !lines.length) lines.push(current.trimEnd())
  return { lines, brokeLongWord }
}

const wrapText = (ctx, text, maxWidth, maxLines) => {
  const rawLines = String(text || '').split(/\r?\n/)
  if (maxLines <= 1) {
    return {
      lines: rawLines.length ? rawLines : [''],
      brokeLongWord: false,
    }
  }

  const wrapped = []
  let brokeLongWord = false
  for (const paragraph of rawLines) {
    const result = wrapParagraph(ctx, paragraph, maxWidth)
    wrapped.push(...result.lines)
    brokeLongWord = brokeLongWord || result.brokeLongWord
  }
  return { lines: wrapped.length ? wrapped : [''], brokeLongWord }
}

const resolveMaxLines = (value) => Math.max(1, Math.min(MAX_CONFIGURED_LINES, Math.floor(positiveNumber(value, 1))))

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

export const getFieldMinFontSize = (field = {}) => {
  const configuredFontSize = positiveNumber(field.fontSize, 12)
  const configuredMinimum = positiveNumber(field.minFontSize, DEFAULT_MIN_FONT_SIZE)
  return Math.max(4, Math.min(configuredFontSize, configuredMinimum))
}

const measureFit = ({
  ctx,
  text,
  width,
  height,
  fontSize,
  fontFamily,
  fontStyle,
  fontWeight,
  lineHeight,
  maxLines,
  preserveFontSizeOnWrap,
  wrapLineLimit,
}) => {
  setCanvasFont(ctx, fontSize, fontFamily, fontStyle, fontWeight)
  const { lines, brokeLongWord } = wrapText(ctx, text, Math.max(1, width), wrapLineLimit || maxLines)
  const widest = lines.reduce((max, line) => Math.max(max, measure(ctx, line)), 0)
  const lineCount = Math.max(1, lines.length)
  const textHeight = lineCount * fontSize * lineHeight
  const effectiveHeight = preserveFontSizeOnWrap && maxLines > 1
    ? Math.max(height, fontSize * lineHeight * maxLines)
    : height
  const fits = lineCount <= maxLines && widest <= width + 0.5 && textHeight <= effectiveHeight + 0.5

  return {
    fits,
    lines,
    lineCount,
    brokeLongWord,
    widest,
    textHeight,
    availableWidth: width,
    availableHeight: effectiveHeight,
  }
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
  shrinkToFit = true,
  minFontSize = DEFAULT_MIN_FONT_SIZE,
}) => {
  const ctx = getMeasureContext()
  const boxWidth = positiveNumber(width, 1)
  const boxHeight = positiveNumber(height, 1)
  const startSize = positiveNumber(fontSize, 12)
  const resolvedLineHeight = positiveNumber(lineHeight, 1.2)
  const resolvedMaxLines = resolveMaxLines(maxLines)
  const resolvedMinSize = Math.max(4, Math.min(startSize, positiveNumber(minFontSize, DEFAULT_MIN_FONT_SIZE)))

  if (!ctx) {
    const fallbackLines = String(text || '').split(/\r?\n/)
    return {
      fontSize: startSize,
      minFontSize: resolvedMinSize,
      fits: true,
      reduced: false,
      belowMinimum: false,
      lines: fallbackLines.length ? fallbackLines : [''],
      lineCount: Math.max(1, fallbackLines.length),
      brokeLongWord: false,
      wrap: resolvedMaxLines <= 1 ? 'none' : 'word',
    }
  }

  if (preserveFontSizeOnWrap || !shrinkToFit) {
    const metrics = measureFit({
      ctx,
      text,
      width: boxWidth,
      height: boxHeight,
      fontSize: startSize,
      fontFamily,
      fontStyle,
      fontWeight,
      lineHeight: resolvedLineHeight,
      maxLines: resolvedMaxLines,
      preserveFontSizeOnWrap,
      wrapLineLimit: shrinkToFit ? resolvedMaxLines : MAX_CONFIGURED_LINES,
    })
    const wrapMode = metrics.brokeLongWord ? 'char' : (!shrinkToFit ? 'word' : (resolvedMaxLines <= 1 ? 'none' : 'word'))
    return {
      ...metrics,
      fontSize: startSize,
      minFontSize: resolvedMinSize,
      reduced: false,
      belowMinimum: !metrics.fits,
      wrap: wrapMode,
    }
  }

  let best = null
  let low = resolvedMinSize
  let high = startSize

  for (let i = 0; i < 14; i += 1) {
    const candidate = Math.round(((low + high) / 2) * 1000) / 1000
    const metrics = measureFit({
      ctx,
      text,
      width: boxWidth,
      height: boxHeight,
      fontSize: candidate,
      fontFamily,
      fontStyle,
      fontWeight,
      lineHeight: resolvedLineHeight,
      maxLines: resolvedMaxLines,
      preserveFontSizeOnWrap,
      wrapLineLimit: resolvedMaxLines,
    })

    if (metrics.fits) {
      best = { ...metrics, fontSize: candidate }
      low = candidate
    } else {
      high = candidate
    }
  }

  if (best) {
    const fittedSize = Math.min(startSize, Math.floor(best.fontSize * 100) / 100)
    const finalMetrics = measureFit({
      ctx,
      text,
      width: boxWidth,
      height: boxHeight,
      fontSize: fittedSize,
      fontFamily,
      fontStyle,
      fontWeight,
      lineHeight: resolvedLineHeight,
      maxLines: resolvedMaxLines,
      preserveFontSizeOnWrap,
      wrapLineLimit: resolvedMaxLines,
    })
    return {
      ...finalMetrics,
      fontSize: fittedSize,
      minFontSize: resolvedMinSize,
      reduced: fittedSize < startSize - 0.01,
      belowMinimum: false,
      wrap: finalMetrics.brokeLongWord ? 'char' : (resolvedMaxLines <= 1 ? 'none' : 'word'),
    }
  }

  const metrics = measureFit({
    ctx,
    text,
    width: boxWidth,
    height: boxHeight,
    fontSize: resolvedMinSize,
    fontFamily,
    fontStyle,
    fontWeight,
    lineHeight: resolvedLineHeight,
    maxLines: resolvedMaxLines,
    preserveFontSizeOnWrap,
    wrapLineLimit: resolvedMaxLines,
  })

  return {
    ...metrics,
    fontSize: Math.round(resolvedMinSize * 100) / 100,
    minFontSize: resolvedMinSize,
    reduced: resolvedMinSize < startSize - 0.01,
    belowMinimum: true,
    wrap: metrics.brokeLongWord ? 'char' : (resolvedMaxLines <= 1 ? 'none' : 'word'),
  }
}

export const getFittedTextProps = (field, text, { paddingX = 0, paddingY = 0 } = {}) => {
  const shrinkToFit = field?.shrinkToFit !== false
  const maxLines = getFieldMaxLines(field)
  const configuredFontSize = positiveNumber(field?.fontSize, 12)
  const lineHeight = positiveNumber(field?.lineHeight, 1.2)
  const boxHeight = Math.max(1, positiveNumber(field?.height, 1) - paddingY)
  const boxWidth = Math.max(1, positiveNumber(field?.width, 1) - paddingX)
  const preserveFontSizeOnWrap = Boolean(field?.preserveFontSizeOnWrap)
  const minFontSize = getFieldMinFontSize(field)
  const fit = fitTextToBox({
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
    shrinkToFit,
    minFontSize,
  })

  return {
    ...fit,
    height: preserveFontSizeOnWrap && maxLines > 1
      ? Math.max(boxHeight, fit.lineCount * fit.fontSize * lineHeight)
      : boxHeight,
    maxLines,
    lineHeight,
    renderText: (fit.lines || [String(text || '')]).join('\n'),
  }
}
