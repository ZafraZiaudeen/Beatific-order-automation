import React from 'react'
import { Group, Line, Rect, Text } from 'react-konva'
import { getLuluGeometryPoints } from './luluGeometryUtils'

const POINTS_PER_INCH = 72

const num = (value, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const formatDistance = (points, unit) => {
  if (unit === 'pt') return `${Math.round(points)} pt`
  return `${(points / POINTS_PER_INCH).toFixed(2)} in`
}

const centerOf = (box) => ({
  x: num(box?.x) + num(box?.width) / 2,
  y: num(box?.y) + num(box?.height) / 2,
})

const containsPoint = (box, point) => (
  point.x >= box.x &&
  point.x <= box.x + box.width &&
  point.y >= box.y &&
  point.y <= box.y + box.height
)

function LuluGeometryOverlay({
  geometry,
  page,
  selectedBox = null,
  showGuides = true,
  showRulers = true,
  unit = 'in',
}) {
  const points = getLuluGeometryPoints(geometry)
  if (!points) return null

  const pageWidth = num(page?.pageWidth ?? page?.width, num(points.document?.width, 612))
  const pageHeight = num(page?.pageHeight ?? page?.height, num(points.document?.height, 792))
  const documentWidth = num(points.document?.width, pageWidth) || pageWidth
  const documentHeight = num(points.document?.height, pageHeight) || pageHeight
  const sx = pageWidth / documentWidth
  const sy = pageHeight / documentHeight
  const scaleBox = (box) => ({
    x: num(box?.x) * sx,
    y: num(box?.y) * sy,
    width: num(box?.width) * sx,
    height: num(box?.height) * sy,
  })
  const docBox = { x: 0, y: 0, width: pageWidth, height: pageHeight }
  const panelEntries = [
    ['back', 'Back cover', '#2563EB'],
    ['spine', 'Spine', '#EF4444'],
    ['front', 'Front cover', '#2563EB'],
  ].filter(([key]) => points.panels?.[key])
  const safeEntries = [
    ['back', 'Back safe', '#16A34A'],
    ['front', 'Front safe', '#16A34A'],
  ].filter(([key]) => points.safeZones?.[key])
  const panels = panelEntries.map(([key, label, color]) => ({ key, label, color, box: scaleBox(points.panels[key]) }))
  const safeZones = safeEntries.map(([key, label, color]) => ({ key, label, color, box: scaleBox(points.safeZones[key]) }))
  const selected = selectedBox && num(selectedBox.width) && num(selectedBox.height)
    ? {
        x: num(selectedBox.x),
        y: num(selectedBox.y),
        width: num(selectedBox.width),
        height: num(selectedBox.height),
      }
    : null
  const selectedCenter = selected ? centerOf(selected) : null
  const measureBox = selectedCenter
    ? panels.find((item) => containsPoint(item.box, selectedCenter))?.box || docBox
    : docBox

  const drawDistance = (key, x1, y1, x2, y2, value, horizontal = true) => {
    if (!selected || value < 4) return null
    const label = formatDistance(value / (horizontal ? sx : sy), unit)
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    return (
      <Group key={key} listening={false}>
        <Line points={[x1, y1, x2, y2]} stroke="#0F172A" strokeWidth={0.8} dash={[4, 4]} />
        <Text
          x={horizontal ? midX - 22 : midX + 5}
          y={horizontal ? midY - 12 : midY - 6}
          text={label}
          fontSize={8}
          fill="#0F172A"
          width={52}
          align="center"
          listening={false}
        />
      </Group>
    )
  }

  const rulerTicks = []
  if (showRulers) {
    for (let x = 0; x <= documentWidth + 0.1; x += POINTS_PER_INCH) {
      const px = x * sx
      rulerTicks.push(
        <Group key={`rx-${x}`} listening={false}>
          <Line points={[px, 0, px, 10]} stroke="#475569" strokeWidth={0.6} />
          {x > 0 && <Text x={px + 2} y={2} text={`${Math.round(x / POINTS_PER_INCH)}`} fontSize={7} fill="#475569" />}
        </Group>
      )
    }
    for (let y = 0; y <= documentHeight + 0.1; y += POINTS_PER_INCH) {
      const py = y * sy
      rulerTicks.push(
        <Group key={`ry-${y}`} listening={false}>
          <Line points={[0, py, 10, py]} stroke="#475569" strokeWidth={0.6} />
          {y > 0 && <Text x={2} y={py + 2} text={`${Math.round(y / POINTS_PER_INCH)}`} fontSize={7} fill="#475569" />}
        </Group>
      )
    }
  }

  return (
    <Group listening={false} name="lulu-geometry-overlay">
      {showRulers && (
        <Group listening={false}>
          <Rect x={0} y={0} width={pageWidth} height={14} fill="rgba(255,255,255,0.72)" />
          <Rect x={0} y={0} width={14} height={pageHeight} fill="rgba(255,255,255,0.72)" />
          {rulerTicks}
        </Group>
      )}

      {showGuides && (
        <Group listening={false}>
          <Rect x={0} y={0} width={pageWidth} height={pageHeight} stroke="#EF4444" strokeWidth={1} dash={[8, 4]} />
          {panels.map(({ key, label, color, box }) => (
            <Group key={key} listening={false}>
              <Rect {...box} stroke={color} strokeWidth={key === 'spine' ? 1.4 : 1} dash={key === 'spine' ? [] : [7, 4]} fill="rgba(255,255,255,0)" />
              <Text x={box.x + 5} y={box.y + 5} text={label} fontSize={9} fill={color} fontStyle="bold" />
            </Group>
          ))}
          {safeZones.map(({ key, label, color, box }) => (
            <Group key={`safe-${key}`} listening={false}>
              <Rect {...box} stroke={color} strokeWidth={0.85} dash={[3, 3]} fill="rgba(22, 163, 74, 0.025)" />
              <Text x={box.x + 5} y={box.y + 18} text={label} fontSize={8} fill={color} />
            </Group>
          ))}
        </Group>
      )}

      {selected && (
        <Group listening={false}>
          {drawDistance('left', measureBox.x, selected.y + selected.height / 2, selected.x, selected.y + selected.height / 2, selected.x - measureBox.x, true)}
          {drawDistance('right', selected.x + selected.width, selected.y + selected.height / 2, measureBox.x + measureBox.width, selected.y + selected.height / 2, measureBox.x + measureBox.width - selected.x - selected.width, true)}
          {drawDistance('top', selected.x + selected.width / 2, measureBox.y, selected.x + selected.width / 2, selected.y, selected.y - measureBox.y, false)}
          {drawDistance('bottom', selected.x + selected.width / 2, selected.y + selected.height, selected.x + selected.width / 2, measureBox.y + measureBox.height, measureBox.y + measureBox.height - selected.y - selected.height, false)}
        </Group>
      )}
    </Group>
  )
}

export default LuluGeometryOverlay
