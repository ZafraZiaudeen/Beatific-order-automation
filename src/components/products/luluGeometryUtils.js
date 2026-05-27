const num = (value, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

export const getLuluGeometryPoints = (value) => {
  let current = value
  for (let index = 0; index < 5 && current; index += 1) {
    if (current.points?.document) return current.points
    current = current.geometry
  }
  return null
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
