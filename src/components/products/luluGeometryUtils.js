export const POINTS_PER_INCH = 72

export const num = (value, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export const pointsToInches = (points) => num(points) / POINTS_PER_INCH

export const inchesToPoints = (inches) => num(inches) * POINTS_PER_INCH

export const formatMeasurement = (points, unit = 'in', precision = 2) => {
  const value = num(points)
  if (unit === 'pt') return `${Number(value.toFixed(2))} pt`
  return `${pointsToInches(value).toFixed(precision)} in`
}

export const formatDimensions = (width, height, unit = 'in') =>
  `${formatMeasurement(width, unit)} x ${formatMeasurement(height, unit)}`

export const formatDualDimensions = (width, height) =>
  `${formatDimensions(width, height, 'in')} / ${formatDimensions(width, height, 'pt')}`

export const getLuluGeometryPoints = (value) => {
  let current = value
  for (let index = 0; index < 5 && current; index += 1) {
    if (current.points?.document) return current.points
    current = current.geometry
  }
  return null
}

export const getPageDimensions = (page, geometry = null) => {
  const points = getLuluGeometryPoints(geometry)
  return {
    width: num(page?.pageWidth ?? page?.width, num(points?.document?.width, 612)),
    height: num(page?.pageHeight ?? page?.height, num(points?.document?.height, 792)),
  }
}

export const getDocumentDimensions = (geometry, page = null) => {
  const points = getLuluGeometryPoints(geometry)
  const pageDimensions = getPageDimensions(page, geometry)
  return {
    width: num(points?.document?.width, pageDimensions.width),
    height: num(points?.document?.height, pageDimensions.height),
  }
}

export const getGeometryMismatch = (geometry, page, tolerance = 1) => {
  const points = getLuluGeometryPoints(geometry)
  if (!points) return null
  const pageDimensions = getPageDimensions(page, geometry)
  const documentDimensions = getDocumentDimensions(geometry, page)
  const widthDelta = Math.abs(pageDimensions.width - documentDimensions.width)
  const heightDelta = Math.abs(pageDimensions.height - documentDimensions.height)
  if (widthDelta <= tolerance && heightDelta <= tolerance) return null
  return {
    page: pageDimensions,
    expected: documentDimensions,
    widthDelta,
    heightDelta,
  }
}

export const getGeometryPanelSummaries = (geometry) => {
  const points = getLuluGeometryPoints(geometry)
  if (!points) return []
  const panels = points.panels || {}
  const safeZones = points.safeZones || {}
  return [
    ['Back', panels.back],
    ['Spine', panels.spine],
    ['Front', panels.front],
    ['Back safe', safeZones.back],
    ['Front safe', safeZones.front],
  ].filter(([, box]) => box?.width && box?.height)
}

export const getLuluGeometryBox = (geometry, page, key = 'document') => {
  const points = getLuluGeometryPoints(geometry)
  if (!points) return null
  const pageWidth = num(page?.pageWidth ?? page?.width, num(points.document?.width, 612))
  const pageHeight = num(page?.pageHeight ?? page?.height, num(points.document?.height, 792))
  const documentWidth = num(points.document?.width, pageWidth) || pageWidth
  const documentHeight = num(points.document?.height, pageHeight) || pageHeight
  const sx = pageWidth / documentWidth
  const sy = pageHeight / documentHeight
  const source = key === 'document'
    ? { x: 0, y: 0, width: documentWidth, height: documentHeight }
    : points.panels?.[key] || points.safeZones?.[key] || null

  if (!source) return null
  return {
    x: num(source.x) * sx,
    y: num(source.y) * sy,
    width: num(source.width) * sx,
    height: num(source.height) * sy,
    sx,
    sy,
  }
}
