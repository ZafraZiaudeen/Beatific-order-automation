import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Switch from '@mui/material/Switch'
import Slider from '@mui/material/Slider'
import FormControlLabel from '@mui/material/FormControlLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UploadFileIcon from '@mui/icons-material/CloudUploadOutlined'
import SaveIcon from '@mui/icons-material/SaveOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ZoomInIcon from '@mui/icons-material/ZoomInOutlined'
import ZoomOutIcon from '@mui/icons-material/ZoomOutOutlined'
import FitScreenIcon from '@mui/icons-material/FitScreenOutlined'
import TextFieldsIcon from '@mui/icons-material/TextFieldsOutlined'
import LayersIcon from '@mui/icons-material/LayersOutlined'
import StraightenIcon from '@mui/icons-material/StraightenOutlined'
import GridOnIcon from '@mui/icons-material/GridOnOutlined'
import OpacityIcon from '@mui/icons-material/OpacityOutlined'
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer } from 'react-konva'
import { v4 as uuidv4 } from 'uuid'
import api from '../../lib/api'
import { FONT_OPTIONS, getFontOption, normalizeFontStyle } from '../../lib/fonts'
import { FIXED_PERSONALIZATION_FIELDS, getFixedPersonalizationField } from '../../lib/fixedPersonalizationFields'
import { getFieldMaxLines, getFittedTextProps } from '../../lib/textFitting'
import LuluGeometryOverlay from './LuluGeometryOverlay'
import {
  formatDimensions,
  formatDualDimensions,
  getGeometryMismatch,
  getGeometryPanelSummaries,
  getLuluGeometryBox,
} from './luluGeometryUtils'

const DEFAULT_TEMPLATE_KEY = 'default'
const DEFAULT_TEMPLATE_POLICY = { cover: 'inherit', interior: 'inherit', fields: 'inherit' }
const CANVAS_GUTTER = 72

const TARGETS = {
  cover: { label: 'Cover', productKey: 'cover', policyKey: 'cover' },
  interiorFirstPage: { label: 'Inside First Page', productKey: 'interior', policyKey: 'interior' },
}

const HEX_COLOR_RE = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i
const REPLACEMENT_FILL_PRESETS = ['#FFFFFF', '#F8E7D6', '#26343A', '#172126', '#000000']

const normalizeHexColor = (value) => {
  const trimmed = String(value || '').trim()
  const match = trimmed.match(HEX_COLOR_RE)
  if (!match) return null
  const hex = match[1]
  const expanded = hex.length === 3 ? hex.split('').map((char) => `${char}${char}`).join('') : hex
  return `#${expanded.toUpperCase()}`
}

const defaultReplacementFill = () => 'transparent'

const getReplacementFill = (field) => normalizeHexColor(field?.replacementFill) || '#FFFFFF'

const pageFromLibraryItem = (item) => {
  if (!item?.pageWidth || !item?.pageHeight) return null
  return {
    sourcePdfUrl: item.pdfUrl || item.sourceUrl || null,
    previewImageUrl: item.imageUrl || null,
    textlessPreviewImageUrl: item.textlessPreviewImageUrl || null,
    pageWidth: item.pageWidth || 0,
    pageHeight: item.pageHeight || 0,
    pageCount: item.pageCount || 0,
    extractedText: item.extractedText || [],
    extractedImages: item.extractedImages || [],
  }
}

const uniqueAssets = (assets = []) => {
  const seen = new Set()
  return assets.filter((asset) => {
    if (!asset?._id || seen.has(asset._id)) return false
    seen.add(asset._id)
    return true
  })
}

const poolAssetsFromProduct = (product, poolKey) =>
  uniqueAssets((product?.[poolKey] || []).map((entry) => entry.asset).filter(Boolean))

const geometryBatchesFromProduct = (product) =>
  (product?.assetBatches || []).filter((batch) =>
    batch &&
    batch.enabled !== false &&
    !batch.virtual &&
    batch.coverAssetId &&
    batch.insidePageAssetId
  )

const productFromLibraryItem = (item) => {
  const isCover = item?.category === 'cover'
  return {
    _id: item?._id,
    title: item?.title || 'Library asset',
    listingId: item?.coverColor || item?.subcategory || item?.category || 'library-asset',
    variants: [],
    printTemplate: {
      cover: isCover ? pageFromLibraryItem(item) : null,
      interior: isCover ? null : pageFromLibraryItem(item),
      fields: item?.templateFields || [],
      sampleOutputs: {},
    },
  }
}

const slugify = (value) =>
  String(value || 'field')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'field'

const uniqueKey = (base, fields) => {
  const root = slugify(base)
  let key = root
  let i = 2
  while (fields.some((field) => field.key === key)) {
    key = `${root}_${i}`
    i += 1
  }
  return key
}

const draftMaxLines = (draft) => {
  const fontSize = Number(draft.fontSize) || 24
  const lineHeight = Number(draft.lineHeight) || 1.2
  const height = Number(draft.height) || fontSize * lineHeight
  return Math.max(1, Math.min(12, Math.floor(height / (fontSize * lineHeight)) || 1))
}

const rectFromText = (text) => ({
  x: Number(text?.x) || 0,
  y: Number(text?.y) || 0,
  width: Math.max(1, Number(text?.width) || 1),
  height: Math.max(1, Number(text?.height) || 1),
})

const textInsideSelection = (text, rect) => {
  const box = rectFromText(text)
  const x1 = box.x + box.width
  const y1 = box.y + box.height
  const rectX1 = rect.x + rect.width
  const rectY1 = rect.y + rect.height
  const overlapX = Math.max(0, Math.min(x1, rectX1) - Math.max(box.x, rect.x))
  const overlapY = Math.max(0, Math.min(y1, rectY1) - Math.max(box.y, rect.y))
  const overlapRatio = (overlapX * overlapY) / (box.width * box.height)
  const overlapXRatio = overlapX / box.width
  const overlapYRatio = overlapY / box.height
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  const centerInside = centerX >= rect.x && centerX <= rectX1 && centerY >= rect.y && centerY <= rectY1
  return (centerInside && overlapXRatio >= 0.45 && overlapYRatio >= 0.55) || overlapRatio >= 0.75
}

const textBounds = (texts) => {
  const boxes = texts.map(rectFromText)
  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

const joinLineWords = (words) =>
  words.reduce((line, word) => {
    const value = String(word?.text || '').trim()
    if (!value) return line
    if (!line) return value
    if (/^[,.;:!?)]/.test(value) || /[(]$/.test(line)) return `${line}${value}`
    return `${line} ${value}`
  }, '')

const groupTextIntoLines = (texts) => {
  const sorted = [...texts].sort((a, b) => {
    const ay = (Number(a.y) || 0) + Math.max(1, Number(a.height) || 1) / 2
    const by = (Number(b.y) || 0) + Math.max(1, Number(b.height) || 1) / 2
    return ay === by ? (Number(a.x) || 0) - (Number(b.x) || 0) : ay - by
  })
  const avgHeight = sorted.reduce((sum, text) => sum + Math.max(1, Number(text.height) || 1), 0) / Math.max(1, sorted.length)
  const lineTolerance = Math.max(2, avgHeight * 0.55)
  const lines = []

  for (const text of sorted) {
    const centerY = (Number(text.y) || 0) + Math.max(1, Number(text.height) || 1) / 2
    const current = lines[lines.length - 1]
    if (current && Math.abs(centerY - current.centerY) <= lineTolerance) {
      current.items.push(text)
      current.centerY = (current.centerY * (current.items.length - 1) + centerY) / current.items.length
    } else {
      lines.push({ centerY, items: [text] })
    }
  }

  return lines
    .map((line) => joinLineWords(line.items.sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0))))
    .filter(Boolean)
}

const groupAlign = (texts, bounds) => {
  const explicit = texts.map((text) => text.align).find((align) => ['left', 'center', 'right'].includes(align))
  if (explicit && explicit !== 'left') return explicit
  if (!bounds?.width) return explicit || 'left'
  const lines = groupTextIntoLines(texts)
  if (lines.length <= 1) return explicit || 'left'
  const grouped = []
  for (const text of [...texts].sort((a, b) => ((Number(a.y) || 0) === (Number(b.y) || 0) ? (Number(a.x) || 0) - (Number(b.x) || 0) : (Number(a.y) || 0) - (Number(b.y) || 0)))) {
    const centerY = (Number(text.y) || 0) + Math.max(1, Number(text.height) || 1) / 2
    const current = grouped[grouped.length - 1]
    if (current && Math.abs(centerY - current.centerY) <= Math.max(2, (Number(text.height) || 1) * 0.55)) {
      current.items.push(text)
    } else {
      grouped.push({ centerY, items: [text] })
    }
  }
  const centeredLines = grouped.filter((line) => {
    const lineBounds = textBounds(line.items)
    const leftGap = lineBounds.x - bounds.x
    const rightGap = bounds.x + bounds.width - (lineBounds.x + lineBounds.width)
    return Math.abs(leftGap - rightGap) <= Math.max(4, bounds.width * 0.08)
  })
  return centeredLines.length >= Math.ceil(grouped.length * 0.6) ? 'center' : (explicit || 'left')
}

const lineCountForText = (value) => Math.max(1, String(value || '').split(/\r?\n/).filter(Boolean).length)

const variantId = (variant) => String(variant?._id || variant?.id || '')
const normalizePolicy = (policy) => ({ ...DEFAULT_TEMPLATE_POLICY, ...(policy || {}) })
const emptyTemplate = () => ({ cover: null, interior: null, fields: [] })

const cloneFields = (fields = []) =>
  fields.map((field) => ({
    ...field,
    id: uuidv4(),
    replacementBox: field.replacementBox ? { ...field.replacementBox } : null,
    replacementFill: field.replacementFill || (field.replacementBox ? defaultReplacementFill() : null),
    replacementFillMode: field.replacementFillMode || (field.replacementBox ? 'transparent' : undefined),
    forceReplacementFill: Boolean(field.forceReplacementFill),
  }))

const getVariant = (product, templateKey) => {
  if (!product || templateKey === DEFAULT_TEMPLATE_KEY) return null
  return (product.variants || []).find((variant) => variantId(variant) === templateKey) || null
}

const resolveEffectiveTemplate = (product, templateKey) => {
  const base = product?.printTemplate || emptyTemplate()
  const variant = getVariant(product, templateKey)
  const policy = normalizePolicy(variant?.templatePolicy)
  const override = variant?.printTemplate || emptyTemplate()

  return {
    variant,
    policy,
    template: {
      cover: variant && policy.cover === 'override' && override.cover?.sourcePdfUrl ? override.cover : base.cover || null,
      interior: variant && policy.interior === 'override' && override.interior?.sourcePdfUrl ? override.interior : base.interior || null,
      fields: variant && policy.fields === 'override' ? override.fields || [] : base.fields || [],
      sampleOutputs: variant ? override.sampleOutputs : base.sampleOutputs,
    },
  }
}

const buttonRailSx = (active = false) => ({
  width: 56,
  minWidth: 56,
  height: 54,
  borderRadius: 2,
  color: active ? 'common.white' : 'text.secondary',
  bgcolor: active ? 'primary.main' : 'transparent',
  '&:hover': {
    bgcolor: active ? 'primary.dark' : 'action.hover',
    color: active ? 'common.white' : 'text.primary',
  },
})

const safeFileName = (value = 'sample-pdf') => String(value || 'sample-pdf')
  .trim()
  .replace(/[\\/:*?"<>|]+/g, '-')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase() || 'sample-pdf'

function downloadUrl(url, filename) {
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function imagePdfDataUrl(jpegDataUrl, pageWidth, pageHeight) {
  const jpegBinary = atob(jpegDataUrl.split(',')[1] || '')
  const jpegBytes = new Uint8Array(jpegBinary.length)
  for (let i = 0; i < jpegBinary.length; i += 1) jpegBytes[i] = jpegBinary.charCodeAt(i)

  const mediaWidth = Number(Number(pageWidth || 0).toFixed(2))
  const mediaHeight = Number(Number(pageHeight || 0).toFixed(2))
  const imageWidth = Math.max(1, Math.round(mediaWidth * 2))
  const imageHeight = Math.max(1, Math.round(mediaHeight * 2))
  const content = `q\n${mediaWidth} 0 0 ${mediaHeight} 0 0 cm\n/Im0 Do\nQ\n`
  const enc = new TextEncoder()
  const parts = []
  const offsets = [0]
  let offset = 0
  const pushBytes = (bytes) => {
    parts.push(bytes)
    offset += bytes.length
  }
  const pushText = (text) => pushBytes(enc.encode(text))
  const mark = () => offsets.push(offset)

  pushText('%PDF-1.3\n')
  mark(); pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  mark(); pushText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  mark(); pushText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${mediaWidth} ${mediaHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
  mark(); pushText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
  pushBytes(jpegBytes)
  pushText('\nendstream\nendobj\n')
  mark(); pushText(`5 0 obj\n<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`)
  const xref = offset
  pushText(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((item) => `${String(item).padStart(10, '0')} 00000 n `).join('\n')}\n`)
  pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)
  return new Blob(parts, { type: 'application/pdf' })
}

function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob)
  downloadUrl(blobUrl, filename)
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0)
}

function MeasurementStatusStrip({ page, geometry, zoom, unit = 'in', target = 'cover', mismatch = null, luluPrintSpec = null, resolvedFrom = '' }) {
  if (!page) return null
  const width = page.pageWidth || page.width || 0
  const height = page.pageHeight || page.height || 0
  const panels = target === 'cover' && !mismatch ? getGeometryPanelSummaries(geometry) : []
  const expectedTrim = luluPrintSpec?.trimSizeKey || ''
  const expectedSource = resolvedFrom === 'order'
    ? 'order match'
    : resolvedFrom === 'assetPair'
      ? 'asset pair'
      : resolvedFrom === 'productFallback'
        ? 'fallback package'
        : 'Lulu package'

  return (
    <Box sx={{ flexShrink: 0, px: 1.5, py: 0.85, bgcolor: 'background.paper', borderBottom: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Chip size="small" label={`Actual PDF MediaBox ${formatDualDimensions(width, height)}`} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
      <Chip size="small" variant="outlined" label={`Preview zoom ${Math.round(zoom * 100)}%`} />
      {target === 'cover' && mismatch && (
        <Chip
          size="small"
          color="warning"
          variant="outlined"
          label={`Expected ${expectedTrim ? `${expectedTrim} ` : ''}${formatDimensions(mismatch.expected.width, mismatch.expected.height, 'pt')}`}
        />
      )}
      {panels.map(([label, box]) => (
        <Chip key={label} size="small" variant="outlined" label={`${label} ${formatDimensions(box.width, box.height, unit)}`} />
      ))}
      {mismatch && (
        <Alert severity="warning" sx={{ py: 0, minHeight: 30, alignItems: 'center' }}>
          Actual PDF is {formatDimensions(mismatch.page.width, mismatch.page.height, 'pt')}; {expectedSource} expects {formatDimensions(mismatch.expected.width, mismatch.expected.height, 'pt')}. Cover guides are hidden until the PDF and expected package match.
        </Alert>
      )}
    </Box>
  )
}

function SamplePdfDownloads({ assets, compact = false }) {
  if (!assets.length) return null

  if (compact) {
    return (
      <>
        {assets.map((asset) => (
          <Tooltip key={asset.key} title={`Download ${asset.label}`} placement="right">
            <IconButton sx={buttonRailSx(false)} onClick={() => downloadUrl(asset.url, asset.fileName)}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        ))}
      </>
    )
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      {assets.map((asset) => (
        <Button
          key={asset.key}
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => downloadUrl(asset.url, asset.fileName)}
          sx={{ textTransform: 'none', fontWeight: 800 }}
        >
          {asset.label}
        </Button>
      ))}
    </Stack>
  )
}

function useLoadedImage(src) {
  const [image, setImage] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!src) {
      queueMicrotask(() => {
        if (!cancelled) setImage(null)
      })
      return
    }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!cancelled) setImage(img)
    }
    img.onerror = () => {
      if (!cancelled) setImage(null)
    }
    img.src = src
    return () => { cancelled = true }
  }, [src])

  return image
}

function TemplateStage({
  page,
  target,
  fields,
  selectedId,
  fieldsEditable,
  previewModes,
  onSelect,
  onCreateFromText,
  onCreateFromTextGroup,
  onCreateBlank,
  onChange,
  zoom,
  viewportRef,
  geometry,
  showGuides,
  showRulers,
  measurementUnit,
  alignmentImageUrl,
  showAlignment,
  alignmentOpacity = 0.62,
  backgroundOpacity = 1,
  stageRef: externalStageRef = null,
}) {
  const image = useLoadedImage(page?.previewImageUrl)
  const textlessImage = useLoadedImage(page?.textlessPreviewImageUrl)
  const alignmentImage = useLoadedImage(alignmentImageUrl)
  const localStageRef = useRef(null)
  const stageRef = externalStageRef || localStageRef
  const transformerRef = useRef(null)
  const selectionStartRef = useRef(null)
  const selectionRectRef = useRef(null)
  const selectionDragRef = useRef(false)
  const [selectionRect, setSelectionRect] = useState(null)
  const pageWidth = page?.pageWidth || 612
  const pageHeight = page?.pageHeight || 792
  const luluMismatch = target === 'cover' ? getGeometryMismatch(geometry, { pageWidth, pageHeight }) : null
  const activeFields = fields.filter((field) => field.target === target)
  const selectedField = fields.find((field) => field.id === selectedId) || null
  const selectedLocked = Boolean(selectedField?.locked)
  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const node = selectedId && fieldsEditable && !selectedLocked ? stage.findOne(`#${selectedId}`) : null
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedId, fields, target, fieldsEditable, selectedLocked, stageRef])

  const pointer = () => {
    const stage = stageRef.current
    const pos = stage?.getPointerPosition()
    if (!stage || !pos) return { x: 0, y: 0 }
    return { x: pos.x / zoom, y: pos.y / zoom }
  }

  const startSelection = (event) => {
    if (!fieldsEditable || !(page?.extractedText || []).length) return
    const stage = stageRef.current
    if (!stage) return
    const isStage = event.target === stage
    const isTextHighlight = event.target?.name?.() === 'extracted-text'
    if (!isStage && !isTextHighlight) return
    const start = pointer()
    selectionStartRef.current = start
    selectionDragRef.current = false
    selectionRectRef.current = { x: start.x, y: start.y, width: 0, height: 0 }
    setSelectionRect(selectionRectRef.current)
  }

  const updateSelection = () => {
    if (!selectionStartRef.current) return
    const pos = pointer()
    const start = selectionStartRef.current
    const next = {
      x: Math.min(start.x, pos.x),
      y: Math.min(start.y, pos.y),
      width: Math.abs(pos.x - start.x),
      height: Math.abs(pos.y - start.y),
    }
    if (next.width > 3 || next.height > 3) selectionDragRef.current = true
    selectionRectRef.current = next
    setSelectionRect(next)
  }

  const finishSelection = () => {
    if (!selectionStartRef.current) return
    const rect = selectionRectRef.current
    const dragged = selectionDragRef.current
    selectionStartRef.current = null

    if (!dragged || !rect || rect.width < 4 || rect.height < 4) {
      selectionRectRef.current = null
      setSelectionRect(null)
      selectionDragRef.current = false
      return
    }

    const normalizedRect = {
      x: Math.max(0, Math.min(pageWidth, rect.x)),
      y: Math.max(0, Math.min(pageHeight, rect.y)),
      width: Math.max(1, Math.min(pageWidth - Math.max(0, rect.x), rect.width)),
      height: Math.max(1, Math.min(pageHeight - Math.max(0, rect.y), rect.height)),
    }

    const hits = (page?.extractedText || [])
      .filter((text) => textInsideSelection(text, normalizedRect))
      .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))

    if (hits.length === 1) {
      onCreateFromText(hits[0])
    } else if (hits.length > 1) {
      onCreateFromTextGroup(hits, normalizedRect)
    }

    selectionRectRef.current = null
    setSelectionRect(null)
    window.setTimeout(() => {
      selectionDragRef.current = false
    }, 0)
  }

  return (
    <Box
      ref={viewportRef}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        backgroundColor: '#F4F6F8',
        backgroundImage: 'radial-gradient(circle, rgba(145, 158, 171, 0.24) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <Box
        sx={{
          minWidth: `max(100%, ${pageWidth * zoom + CANVAS_GUTTER * 2}px)`,
          minHeight: `max(100%, ${pageHeight * zoom + CANVAS_GUTTER * 2}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: `${CANVAS_GUTTER}px`,
        }}
      >
        <Box
          sx={{
            width: pageWidth * zoom,
            height: pageHeight * zoom,
            bgcolor: 'common.white',
            boxShadow: 'none',
            outline: 'none',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <Stage
            ref={stageRef}
            width={pageWidth * zoom}
            height={pageHeight * zoom}
            scaleX={zoom}
            scaleY={zoom}
            onMouseDown={(event) => {
              if (event.target === stageRef.current) onSelect(null)
              startSelection(event)
            }}
            onMouseMove={updateSelection}
            onMouseUp={finishSelection}
            onTouchStart={startSelection}
            onTouchMove={updateSelection}
            onTouchEnd={finishSelection}
            onDblClick={(event) => {
              if (fieldsEditable && event.target === stageRef.current) onCreateBlank(pointer())
            }}
            style={{ display: 'block' }}
          >
            <Layer>
              <Rect x={0} y={0} width={pageWidth} height={pageHeight} fill="#ffffff" listening={false} />
              {showAlignment && alignmentImage && (
                <KonvaImage image={alignmentImage} x={0} y={0} width={pageWidth} height={pageHeight} opacity={alignmentOpacity} listening={false} />
              )}
              {image && (
                <KonvaImage image={image} x={0} y={0} width={pageWidth} height={pageHeight} opacity={backgroundOpacity} listening={false} />
              )}

              {(page?.extractedText || []).map((text) => (
                <Rect
                  key={text.id}
                  x={text.x}
                  y={text.y}
                  width={Math.max(4, text.width)}
                  height={Math.max(4, text.height)}
                  fill="rgba(14, 165, 233, 0.025)"
                  stroke="rgba(14, 165, 233, 0.22)"
                  strokeWidth={0.5}
                  listening={fieldsEditable}
                  name="extracted-text"
                  onClick={(event) => {
                    event.cancelBubble = true
                    if (fieldsEditable && !selectionDragRef.current) onCreateFromText(text)
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true
                    if (fieldsEditable && !selectionDragRef.current) onCreateFromText(text)
                  }}
                />
              ))}

              <LuluGeometryOverlay
                geometry={geometry}
                page={{ pageWidth, pageHeight }}
                selectedBox={selectedField}
                showGuides={showGuides && target === 'cover' && !luluMismatch}
                showRulers={showRulers && target === 'cover'}
                unit={measurementUnit}
              />

              {activeFields.map((field) => {
                const selected = selectedId === field.id
                const fieldLocked = Boolean(field.locked)
                const previewMode = previewModes[field.id] || 'sample'
                const showSample = previewMode !== 'original'
                const maskOriginal = previewMode === 'sample' && field.replacementBox
                const maskBox = field.replacementBox || field
                const hasTextlessPreview = Boolean(page?.textlessPreviewImageUrl)
                const sampleText = field.sampleValue || field.label
                const fittedSample = getFittedTextProps(field, sampleText, { paddingX: 6, paddingY: 4 })
                const replacementFill = getReplacementFill(field)
                const textlessCrop = textlessImage && maskOriginal
                  ? {
                      x: (maskBox.x / pageWidth) * textlessImage.width,
                      y: (maskBox.y / pageHeight) * textlessImage.height,
                      width: (Math.max(1, maskBox.width) / pageWidth) * textlessImage.width,
                      height: (Math.max(1, maskBox.height) / pageHeight) * textlessImage.height,
                    }
                  : null
                return (
                  <React.Fragment key={field.id}>
                    {maskOriginal && textlessCrop && (
                      <KonvaImage
                        image={textlessImage}
                        x={maskBox.x}
                        y={maskBox.y}
                        width={Math.max(1, maskBox.width)}
                        height={Math.max(1, maskBox.height)}
                        crop={textlessCrop}
                        opacity={backgroundOpacity}
                        listening={false}
                      />
                    )}
                    {maskOriginal && !hasTextlessPreview && !textlessCrop && (
                      <Rect
                        x={maskBox.x}
                        y={maskBox.y}
                        width={Math.max(1, maskBox.width)}
                        height={Math.max(1, maskBox.height)}
                        fill={replacementFill}
                        listening={false}
                      />
                    )}
                    <Rect
                      id={field.id}
                      x={field.x}
                      y={field.y}
                      width={field.width}
                      height={field.height}
                      rotation={field.rotation || 0}
                      fill={selected ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.04)'}
                      stroke={selected ? '#F97316' : 'rgba(249, 115, 22, 0.74)'}
                      strokeWidth={selected ? 1.5 : 1}
                      dash={selected ? [] : [4, 3]}
                      draggable={fieldsEditable && !fieldLocked}
                      onClick={(event) => {
                        event.cancelBubble = true
                        onSelect(field.id)
                      }}
                      onTap={(event) => {
                        event.cancelBubble = true
                        onSelect(field.id)
                      }}
                      onDragEnd={(event) => {
                        if (!fieldsEditable || fieldLocked) return
                        onChange(field.id, { x: event.target.x(), y: event.target.y() })
                      }}
                      onTransformEnd={(event) => {
                        if (!fieldsEditable || fieldLocked) return
                        const node = event.target
                        const scaleX = node.scaleX()
                        const scaleY = node.scaleY()
                        node.scaleX(1)
                        node.scaleY(1)
                        const nextHeight = Math.max(8, field.height * scaleY)
                        onChange(field.id, {
                          x: node.x(),
                          y: node.y(),
                          width: Math.max(8, field.width * scaleX),
                          height: nextHeight,
                          maxLines: draftMaxLines({ ...field, height: nextHeight }),
                        })
                      }}
                    />
                    {showSample && (
                      <Text
                        x={field.x + 3}
                        y={field.y + 2}
                        width={Math.max(4, field.width - 6)}
                        height={Math.max(4, fittedSample.height)}
                        listening={false}
                        text={sampleText}
                        fontSize={fittedSample.fontSize}
                        fontFamily={field.fontFamily}
                        fontStyle={normalizeFontStyle(field.fontStyle)}
                        fill={field.fill}
                        align={field.align}
                        lineHeight={field.lineHeight}
                        wrap={fittedSample.wrap}
                        rotation={field.rotation || 0}
                        opacity={0.96}
                      />
                    )}
                  </React.Fragment>
                )
              })}

              {selectionRect && selectionRect.width > 0 && selectionRect.height > 0 && (
                <Rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="rgba(37, 99, 235, 0.08)"
                  stroke="rgba(37, 99, 235, 0.85)"
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
              )}

              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                keepRatio={false}
                anchorSize={8}
                borderStroke="#F97316"
                borderDash={[4, 2]}
                anchorStroke="#F97316"
                anchorFill="#ffffff"
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 6 || newBox.height < 6) return oldBox
                  return newBox
                }}
              />
            </Layer>
          </Stage>
        </Box>
      </Box>
    </Box>
  )
}

function EmptyCanvas({ target, onImport, inherited }) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 4,
        bgcolor: '#F4F6F8',
        backgroundImage: 'radial-gradient(circle, rgba(145, 158, 171, 0.24) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <Box sx={{ maxWidth: 390 }}>
        <PictureAsPdfIcon sx={{ fontSize: 58, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Import the {TARGETS[target].label.toLowerCase()} PDF
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2 }}>
          {inherited
            ? 'This variant currently inherits the default PDF. Switch this page to override before importing a variant-specific file.'
            : 'The PDF becomes the locked print background. You will place labeled editable fields on top.'}
        </Typography>
        <Button variant="contained" startIcon={<UploadFileIcon />} onClick={onImport} disabled={inherited}>
          Import PDF
        </Button>
      </Box>
    </Box>
  )
}

function ColorField({ label, value, disabled, onChange }) {
  const pickerValue = normalizeHexColor(value) || '#000000'
  const handleTextChange = (event) => {
    const nextValue = event.target.value
    const normalized = normalizeHexColor(nextValue)
    onChange(normalized || nextValue)
  }
  const handleBlur = () => {
    const normalized = normalizeHexColor(value)
    if (normalized) onChange(normalized)
  }

  return (
    <TextField
      disabled={disabled}
      label={label}
      size="small"
      value={value || ''}
      onChange={handleTextChange}
      onBlur={handleBlur}
      slotProps={{
        input: {
          startAdornment: (
            <Box
              component="input"
              type="color"
              value={pickerValue}
              disabled={disabled}
              onChange={(event) => onChange(normalizeHexColor(event.target.value) || event.target.value)}
              sx={{
                width: 34,
                height: 32,
                border: 0,
                p: 0,
                mr: 1,
                bgcolor: 'transparent',
                cursor: disabled ? 'default' : 'pointer',
              }}
            />
          ),
        },
      }}
    />
  )
}

function ReplacementFillPicker({ value, mode = 'transparent', disabled, onChange, onModeChange }) {
  const selectedColor = normalizeHexColor(value) || '#FFFFFF'
  const solid = mode === 'solid'

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            disabled={disabled}
            checked={solid}
            onChange={(event) => onModeChange(event.target.checked ? 'solid' : 'transparent')}
          />
        }
        label="Solid background replacement"
        sx={{ mb: 0.5 }}
      />
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 0.75 }}>
        Cover patch colour
      </Typography>
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
        {REPLACEMENT_FILL_PRESETS.map((color) => {
          const active = selectedColor === color
          return (
            <Tooltip key={color} title={color}>
              <Box
                component="button"
                type="button"
                disabled={disabled || !solid}
                aria-label={`Use ${color}`}
                onClick={() => onChange(color)}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: active ? '2px solid #F97316' : '1px solid rgba(145, 158, 171, 0.45)',
                  bgcolor: color,
                  cursor: disabled ? 'default' : 'pointer',
                  boxShadow: active ? '0 0 0 2px rgba(249, 115, 22, 0.16)' : 'none',
                }}
              />
            </Tooltip>
          )
        })}
      </Stack>
      <ColorField label="Custom patch" value={selectedColor} disabled={disabled || !solid} onChange={onChange} />
    </Box>
  )
}

function FieldPanel({
  selected,
  fields,
  selectedId,
  target,
  fieldsEditable,
  selectedPreviewMode,
  onPreviewModeChange,
  setTarget,
  setSelectedId,
  updateField,
  deleteSelected,
  sampleOutputs,
  centerSelected,
  coverGeometryAvailable,
}) {
  const targetFields = fields.filter((field) => field.target === target)

  if (!selected) {
    return (
      <Box sx={{ width: 64, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1.5, gap: 1, transition: 'width 180ms ease', overflow: 'hidden' }}>
        <Tooltip title="Template fields" placement="left">
          <IconButton sx={{ width: 46, height: 46 }}>
            <LayersIcon />
          </IconButton>
        </Tooltip>
        <Chip label={fields.length} size="small" sx={{ fontWeight: 800 }} />
        <Divider flexItem sx={{ my: 0.5 }} />
        <Tooltip title="Select a field on the canvas to edit its sample data, font, and coordinates." placement="left">
          <Box sx={{ writingMode: 'vertical-rl', textOrientation: 'mixed', color: 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: 0, mt: 1 }}>
            Properties
          </Box>
        </Tooltip>
      </Box>
    )
  }

  const selectedFontOption = getFontOption(selected.fontFile || selected.fontFamily)
  const selectedFixedField = getFixedPersonalizationField(selected.key)
  const selectedLocked = Boolean(selected?.locked)
  const oneLineHeight = Math.max(1, Math.round((Number(selected.fontSize) || 12) * (Number(selected.lineHeight) || 1.2) * 100) / 100)
  const selectedMaxLines = getFieldMaxLines(selected)
  const keepSizeOnWrap = Boolean(selected.preserveFontSizeOnWrap)
  const selectedReplacementFill = getReplacementFill(selected)
  const updateMaxLines = (value) => {
    const maxLines = Math.max(1, Math.min(12, Number(value) || 1))
    updateField(selected.id, {
      maxLines,
      ...(keepSizeOnWrap && maxLines > 1 ? { height: Math.max(selected.height, oneLineHeight * maxLines) } : {}),
    })
  }
  const toggleKeepSizeOnWrap = (checked) => {
    const maxLines = checked ? Math.max(2, selectedMaxLines) : selectedMaxLines
    updateField(selected.id, {
      preserveFontSizeOnWrap: checked,
      maxLines,
      ...(checked ? { height: Math.max(selected.height, oneLineHeight * maxLines) } : {}),
    })
  }

  return (
    <Box sx={{ width: { xs: 320, md: 372 }, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', transition: 'width 180ms ease', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Template Fields</Typography>
            <Typography variant="caption" color="text.secondary">{targetFields.length} on this page</Typography>
          </Box>
          <Tooltip title={selectedLocked ? 'Unlock field' : 'Lock field'}>
            <span>
              <IconButton
                size="small"
                color={selectedLocked ? 'primary' : 'default'}
                onClick={() => updateField(selected.id, { locked: !selectedLocked })}
                disabled={!fieldsEditable}
              >
                {selectedLocked ? <LockOutlinedIcon fontSize="small" /> : <LockOpenOutlinedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Delete field">
            <span>
              <IconButton size="small" color="error" onClick={deleteSelected} disabled={!fieldsEditable}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {targetFields.length > 0 && (
          <Stack spacing={0.75} sx={{ mt: 1.25, maxHeight: 120, overflowY: 'auto' }}>
            {targetFields.map((field) => (
              <Button
                key={field.id}
                size="small"
                variant={field.id === selectedId ? 'contained' : 'outlined'}
                color={field.id === selectedId ? 'primary' : 'inherit'}
                onClick={() => setSelectedId(field.id)}
                sx={{ justifyContent: 'flex-start', textTransform: 'none', minHeight: 32 }}
              >
                <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {field.label}
                </Box>
              </Button>
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        <Stack spacing={1.35}>
          {!fieldsEditable && (
            <Alert severity="info">This variant is using default fields. Choose "Customize fields" to edit positions or sample data.</Alert>
          )}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, display: 'block', mb: 0.75 }}>
              Preview mode
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={selectedPreviewMode}
              onChange={(_, value) => value && onPreviewModeChange(value)}
              fullWidth
            >
              <ToggleButton value="sample">Sample</ToggleButton>
              <ToggleButton value="original">Original</ToggleButton>
              <ToggleButton value="both">Both</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <TextField
            disabled={!fieldsEditable}
            select
            label="Email key"
            size="small"
            value={selectedFixedField?.key || ''}
            onChange={(e) => {
              const fixedField = getFixedPersonalizationField(e.target.value)
              if (!fixedField) return
              const shouldDefaultRotation = typeof fixedField.defaultRotation === 'number' && !(selected.rotation || 0)
              updateField(selected.id, {
                key: fixedField.key,
                label: fixedField.label,
                target: fixedField.target,
                sampleValue: selected.sampleValue || fixedField.sampleValue,
                rotation: shouldDefaultRotation ? fixedField.defaultRotation : selected.rotation,
              })
              setTarget(fixedField.target)
            }}
            helperText={selectedFixedField?.prompt || 'Select the matching fixed email field'}
          >
            {!selectedFixedField && <MenuItem value="">{selected.key ? `Custom: ${selected.key}` : 'Select field'}</MenuItem>}
            {FIXED_PERSONALIZATION_FIELDS.map((field) => (
              <MenuItem key={field.key} value={field.key}>{field.label}</MenuItem>
            ))}
          </TextField>
          <TextField disabled={!fieldsEditable} label="Form label" size="small" value={selected.label} onChange={(e) => updateField(selected.id, { label: e.target.value })} />
          <TextField disabled={!fieldsEditable} label="Form key" size="small" value={selected.key} InputProps={{ readOnly: Boolean(selectedFixedField) }} onChange={(e) => updateField(selected.id, { key: slugify(e.target.value) })} />
          <TextField disabled={!fieldsEditable} label="Sample value" size="small" value={selected.sampleValue} onChange={(e) => updateField(selected.id, { sampleValue: e.target.value })} multiline minRows={2} />
          <TextField
            disabled={!fieldsEditable}
            select
            label="Page"
            size="small"
            value={selected.target}
            onChange={(e) => {
              updateField(selected.id, { target: e.target.value })
              setTarget(e.target.value)
            }}
          >
            {Object.entries(TARGETS).map(([value, item]) => <MenuItem key={value} value={value}>{item.label}</MenuItem>)}
          </TextField>

          <Divider />

          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase' }}>
            Exact PDF coordinates
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField disabled={!fieldsEditable} label="X" size="small" type="number" value={Math.round(selected.x * 100) / 100} onChange={(e) => updateField(selected.id, { x: Number(e.target.value) })} />
            <TextField disabled={!fieldsEditable} label="Y" size="small" type="number" value={Math.round(selected.y * 100) / 100} onChange={(e) => updateField(selected.id, { y: Number(e.target.value) })} />
            <TextField disabled={!fieldsEditable} label="Width" size="small" type="number" value={Math.round(selected.width * 100) / 100} onChange={(e) => updateField(selected.id, { width: Number(e.target.value) })} />
            <TextField
              disabled={!fieldsEditable}
              label="Height"
              size="small"
              type="number"
              value={Math.round(selected.height * 100) / 100}
              onChange={(e) => {
                const height = Number(e.target.value)
                updateField(selected.id, { height, maxLines: draftMaxLines({ ...selected, height }) })
              }}
            />
            <TextField disabled={!fieldsEditable} label="Rotation (deg)" size="small" type="number" value={Math.round((selected.rotation || 0) * 100) / 100} onChange={(e) => updateField(selected.id, { rotation: Number(e.target.value) })} />
          </Box>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" disabled={!fieldsEditable} onClick={() => centerSelected?.('document')}>
              Center page
            </Button>
            {target === 'cover' && (
              <>
                <Button size="small" variant="outlined" disabled={!fieldsEditable || !coverGeometryAvailable} onClick={() => centerSelected?.('front')}>
                  Center front
                </Button>
                <Button size="small" variant="outlined" disabled={!fieldsEditable || !coverGeometryAvailable} onClick={() => centerSelected?.('back')}>
                  Center back
                </Button>
                <Button size="small" variant="outlined" disabled={!fieldsEditable || !coverGeometryAvailable} onClick={() => centerSelected?.('spine')}>
                  Center spine
                </Button>
              </>
            )}
          </Stack>

          <Divider />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField disabled={!fieldsEditable} label="Font size" size="small" type="number" value={selected.fontSize} onChange={(e) => updateField(selected.id, { fontSize: Number(e.target.value) })} />
            <TextField
              disabled={!fieldsEditable}
              label="Max lines"
              size="small"
              type="number"
              value={selectedMaxLines}
              onChange={(e) => updateMaxLines(e.target.value)}
              inputProps={{ step: 1, min: 1, max: 12 }}
            />
          </Box>
          <FormControlLabel
            control={<Switch disabled={!fieldsEditable} checked={keepSizeOnWrap} onChange={(e) => toggleKeepSizeOnWrap(e.target.checked)} />}
            label="Keep font size when wrapped"
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <TextField
              disabled={!fieldsEditable}
              label="Line width"
              size="small"
              type="number"
              value={Math.round(selected.width * 100) / 100}
              onChange={(e) => updateField(selected.id, { width: Number(e.target.value) })}
              inputProps={{ step: 1, min: 1 }}
              helperText="Wraps after this width"
            />
            <Button
              disabled={!fieldsEditable}
              variant="outlined"
              onClick={() => updateField(selected.id, { height: oneLineHeight, maxLines: 1, preserveFontSizeOnWrap: false })}
              sx={{ minHeight: 40, textTransform: 'none' }}
            >
              Set 1-line height
            </Button>
          </Box>
          <TextField
            disabled={!fieldsEditable}
            select
            label="Font family"
            size="small"
            value={selectedFontOption?.value || selected.fontFamily}
            onChange={(e) => {
              const font = getFontOption(e.target.value)
              updateField(selected.id, {
                fontFamily: font?.value || e.target.value,
                fontFile: font?.file || null,
                fontWeight: font?.weight || 400,
                fontStyle: font?.style || normalizeFontStyle(selected.fontStyle),
              })
            }}
          >
            {!selectedFontOption && selected.fontFamily && <MenuItem value={selected.fontFamily}>{selected.fontFamily}</MenuItem>}
            {FONT_OPTIONS.map((font) => <MenuItem key={font.value} value={font.value}>{font.label}</MenuItem>)}
          </TextField>
          <TextField disabled={!fieldsEditable} select label="Style" size="small" value={normalizeFontStyle(selected.fontStyle)} onChange={(e) => updateField(selected.id, { fontStyle: e.target.value })}>
            {['normal', 'bold', 'italic', 'bold italic'].map((style) => <MenuItem key={style} value={style}>{style}</MenuItem>)}
          </TextField>
          <TextField disabled={!fieldsEditable} select label="Align" size="small" value={selected.align} onChange={(e) => updateField(selected.id, { align: e.target.value })}>
            {['left', 'center', 'right'].map((align) => <MenuItem key={align} value={align}>{align}</MenuItem>)}
          </TextField>
          <ColorField label="Text colour" value={selected.fill} disabled={!fieldsEditable} onChange={(fill) => updateField(selected.id, { fill })} />
          {selected.replacementBox && (
            <ReplacementFillPicker
              value={selectedReplacementFill}
              mode={selected.replacementFillMode || 'transparent'}
              disabled={!fieldsEditable}
              onChange={(replacementFill) => updateField(selected.id, { replacementFill, replacementFillMode: 'solid' })}
              onModeChange={(replacementFillMode) => updateField(selected.id, {
                replacementFillMode,
                replacementFill: replacementFillMode === 'solid' ? selectedReplacementFill : 'transparent',
                forceReplacementFill: false,
              })}
            />
          )}
          <FormControlLabel
            control={<Switch disabled={!fieldsEditable} checked={selected.required} onChange={(e) => updateField(selected.id, { required: e.target.checked })} />}
            label="Required before final PDF"
          />
          {selected.replacementBox && (
            <Alert severity="success">This field replaces the clicked source PDF text during generation.</Alert>
          )}

          {sampleOutputs && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Latest Sample</Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {sampleOutputs.coverPdfUrl && (
                  <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadUrl(sampleOutputs.coverPdfUrl, 'cover-sample.pdf')}>Download cover PDF</Button>
                )}
                {sampleOutputs.interiorPdfUrl && (
                  <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadUrl(sampleOutputs.interiorPdfUrl, 'inside-sample.pdf')}>Download inside PDF</Button>
                )}
                {sampleOutputs.coverPdfUrl && (
                  <Button size="small" variant="text" endIcon={<OpenInNewIcon />} onClick={() => window.open(sampleOutputs.coverPdfUrl, '_blank')}>Open cover</Button>
                )}
                {sampleOutputs.interiorPdfUrl && (
                  <Button size="small" variant="text" endIcon={<OpenInNewIcon />} onClick={() => window.open(sampleOutputs.interiorPdfUrl, '_blank')}>Open inside</Button>
                )}
              </Stack>
              {sampleOutputs.warnings?.length > 0 && (
                <Alert severity="warning">{sampleOutputs.warnings.join('; ')}</Alert>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
}

export default function ProductTemplateEditor({ product, onBack, onSaved, libraryItem = null, productBatchId = '' }) {
  const libraryMode = Boolean(libraryItem)
  const libraryTarget = libraryItem?.category === 'cover' ? 'cover' : 'interiorFirstPage'
  const initialProduct = libraryMode ? productFromLibraryItem(libraryItem) : product
  const [localProduct, setLocalProduct] = useState(initialProduct)
  const [templateKey, setTemplateKey] = useState(DEFAULT_TEMPLATE_KEY)
  const [target, setTarget] = useState('cover')
  const [fields, setFields] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [previewModes, setPreviewModes] = useState({})
  const [zoom, setZoom] = useState(1)
  const [showGuides, setShowGuides] = useState(true)
  const [showRulers, setShowRulers] = useState(true)
  const [showAlignment, setShowAlignment] = useState(true)
  const [measurementUnit, setMeasurementUnit] = useState('in')
  const [alignmentOpacity, setAlignmentOpacity] = useState(0.62)
  const [backgroundOpacity, setBackgroundOpacity] = useState(1)
  const [geometryState, setGeometryState] = useState({ loading: false, geometry: null, svgDataUrl: null, pageWidth: 0, pageHeight: 0, warnings: [], luluPrintSpec: null, resolvedFrom: '' })
  const [autoFit, setAutoFit] = useState(true)
  const [uploading, setUploading] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [geometryCoverAssetId, setGeometryCoverAssetId] = useState(
    libraryMode && libraryItem?.category === 'cover' ? libraryItem._id : product?.coverAssetId || product?.coverAsset?._id || ''
  )
  const [geometryInsideAssetId, setGeometryInsideAssetId] = useState(
    libraryMode && libraryItem?.category === 'inside-page' ? libraryItem._id : product?.insidePageAssetId || product?.insidePageAsset?._id || ''
  )
  const [geometryBatchId, setGeometryBatchId] = useState('')
  const fileInputRef = useRef(null)
  const viewportRef = useRef(null)
  const stageRef = useRef(null)

  const variants = libraryMode ? [] : localProduct?.variants || []
  const geometryCoverAssets = useMemo(() => poolAssetsFromProduct(product, 'coverAssetPool'), [product])
  const geometryInsideAssets = useMemo(() => poolAssetsFromProduct(product, 'insideAssetPool'), [product])
  const geometryBatches = useMemo(() => geometryBatchesFromProduct(product), [product])
  const usesGeometryAssetBatches = geometryBatches.length > 0
  const usesGeometryAssetPools = !usesGeometryAssetBatches && (geometryCoverAssets.length > 0 || geometryInsideAssets.length > 0)
  const selectedVariant = getVariant(localProduct, templateKey)
  const selectedVariantId = selectedVariant ? variantId(selectedVariant) : null
  const selectedPolicy = normalizePolicy(selectedVariant?.templatePolicy)
  const effective = useMemo(() => resolveEffectiveTemplate(localProduct, templateKey), [localProduct, templateKey])
  const page = effective.template[TARGETS[target].productKey]
  const canvasPage = useMemo(() => {
    if (page) return page
    if (target === 'cover' && geometryState.svgDataUrl && geometryState.pageWidth && geometryState.pageHeight) {
      return {
        sourcePdfUrl: null,
        previewImageUrl: null,
        pageWidth: geometryState.pageWidth,
        pageHeight: geometryState.pageHeight,
        pageCount: 1,
        extractedText: [],
        extractedImages: [],
      }
    }
    return null
  }, [geometryState.pageHeight, geometryState.pageWidth, geometryState.svgDataUrl, page, target])
  const selected = fields.find((field) => field.id === selectedId) || null
  const sampleOutputs = effective.template.sampleOutputs
  const samplePdfAssets = useMemo(() => {
    const baseName = safeFileName(`${localProduct?.title || 'product'}-${selectedVariant?.name || 'default'}`)
    return [
      sampleOutputs?.coverPdfUrl && {
        key: 'cover',
        label: 'Download cover PDF',
        shortLabel: 'Cover PDF',
        url: sampleOutputs.coverPdfUrl,
        fileName: `${baseName}-cover-sample.pdf`,
      },
      sampleOutputs?.interiorPdfUrl && {
        key: 'interior',
        label: 'Download inside PDF',
        shortLabel: 'Inside PDF',
        url: sampleOutputs.interiorPdfUrl,
        fileName: `${baseName}-inside-sample.pdf`,
      },
    ].filter(Boolean)
  }, [localProduct?.title, sampleOutputs?.coverPdfUrl, sampleOutputs?.interiorPdfUrl, selectedVariant?.name])
  const currentPrintPdfUrl = target === 'cover'
    ? sampleOutputs?.coverPdfUrl || canvasPage?.sourcePdfUrl
    : sampleOutputs?.interiorPdfUrl || canvasPage?.sourcePdfUrl
  const currentDownloadBaseName = safeFileName(`${localProduct?.title || 'product'}-${selectedVariant?.name || 'default'}-${TARGETS[target].label}`)
  const fieldsEditable = libraryMode || !selectedVariant || selectedPolicy.fields === 'override'
  const pageInherited = !libraryMode && Boolean(selectedVariant && selectedPolicy[TARGETS[target].policyKey] !== 'override')
  const selectedPreviewMode = selected ? previewModes[selected.id] || 'sample' : 'sample'

  useEffect(() => {
    setLocalProduct(libraryMode ? productFromLibraryItem(libraryItem) : product)
    setTemplateKey(DEFAULT_TEMPLATE_KEY)
    setTarget(libraryMode ? libraryTarget : 'cover')
    setSelectedId(null)
    setAutoFit(true)
  }, [libraryItem, libraryMode, libraryTarget, product])

  useEffect(() => {
    const batches = geometryBatchesFromProduct(product)
    if (batches.length) {
      const contextBatchId = String(productBatchId || '')
      const contextBatch = contextBatchId
        ? batches.find((batch) => String(batch._id || batch.id || batch.name || '') === contextBatchId)
        : null
      const batchId = contextBatch
        ? String(contextBatch._id || contextBatch.id || contextBatch.name || '')
        : batches.length === 1
          ? String(batches[0]._id || batches[0].id || batches[0].name || '')
          : ''
      setGeometryBatchId(batchId)
      setGeometryCoverAssetId('')
      setGeometryInsideAssetId('')
      return
    }

    setGeometryBatchId('')
    const coverAssets = poolAssetsFromProduct(product, 'coverAssetPool')
    const insideAssets = poolAssetsFromProduct(product, 'insideAssetPool')
    const coverId = libraryMode && libraryItem?.category === 'cover'
      ? libraryItem._id
      : coverAssets.length === 1
        ? coverAssets[0]._id
        : product?.coverAssetId || product?.coverAsset?._id || ''
    const insideId = libraryMode && libraryItem?.category === 'inside-page'
      ? libraryItem._id
      : insideAssets.length === 1
        ? insideAssets[0]._id
        : product?.insidePageAssetId || product?.insidePageAsset?._id || ''
    setGeometryCoverAssetId(coverId || '')
    setGeometryInsideAssetId(insideId || '')
  }, [libraryItem, libraryMode, product, productBatchId])

  useEffect(() => {
    const next = resolveEffectiveTemplate(localProduct, templateKey).template.fields || []
    setFields(next)
    setSelectedId(null)
  }, [localProduct, templateKey])

  useEffect(() => {
    const productId = libraryMode ? product?._id : localProduct?._id
    if (target !== 'cover' || !productId) {
        setGeometryState({
          loading: false,
          geometry: null,
          svgDataUrl: null,
          pageWidth: 0,
          pageHeight: 0,
          luluPrintSpec: null,
          resolvedFrom: '',
          warnings: target === 'cover' && libraryMode && !product?._id
            ? ['Open this cover from a product to load exact Lulu spine alignment.']
            : [],
      })
      return undefined
    }

    let cancelled = false
    setGeometryState((current) => ({ ...current, loading: true }))
    const params = usesGeometryAssetBatches
      ? {
        ...(geometryBatchId ? { batchId: geometryBatchId } : {}),
      }
      : {
        ...(selectedVariantId ? { variantId: selectedVariantId } : {}),
        ...(geometryCoverAssetId ? { coverAssetId: geometryCoverAssetId } : {}),
        ...(geometryInsideAssetId ? { insidePageAssetId: geometryInsideAssetId } : {}),
      }
    api.get(`/products/${productId}/template/cover-alignment`, { params })
      .then(({ data }) => {
        if (cancelled) return
        setGeometryState({
          loading: false,
          geometry: data?.geometry || null,
          svgDataUrl: data?.svgDataUrl || null,
          pageWidth: data?.pageWidth || data?.geometry?.points?.document?.width || 0,
          pageHeight: data?.pageHeight || data?.geometry?.points?.document?.height || 0,
          luluPrintSpec: data?.luluPrintSpec || null,
          resolvedFrom: data?.resolvedFrom || '',
          warnings: data?.warnings || [],
        })
      })
      .catch((err) => {
        if (cancelled) return
        setGeometryState({
          loading: false,
          geometry: null,
          svgDataUrl: null,
          pageWidth: 0,
          pageHeight: 0,
          luluPrintSpec: null,
          resolvedFrom: '',
          warnings: [err.response?.data?.message || 'Could not load Lulu cover geometry.'],
        })
      })
    return () => {
      cancelled = true
    }
  }, [geometryBatchId, geometryCoverAssetId, geometryInsideAssetId, libraryMode, localProduct?._id, product?._id, selectedVariantId, target, usesGeometryAssetBatches])

  const stats = useMemo(() => ({
    cover: fields.filter((field) => field.target === 'cover').length,
    interior: fields.filter((field) => field.target === 'interiorFirstPage').length,
  }), [fields])

  const fitToView = useCallback(() => {
    if (!canvasPage?.pageWidth || !canvasPage?.pageHeight || !viewportRef.current) return
    const rect = viewportRef.current.getBoundingClientRect()
    const availableWidth = Math.max(160, rect.width - 96)
    const availableHeight = Math.max(160, rect.height - 96)
    const nextZoom = Math.min(2, Math.max(0.08, Math.min(availableWidth / canvasPage.pageWidth, availableHeight / canvasPage.pageHeight)))
    setZoom(Number(nextZoom.toFixed(3)))
  }, [canvasPage?.pageHeight, canvasPage?.pageWidth])

  useEffect(() => {
    if (!autoFit || !canvasPage) return
    const raf = window.requestAnimationFrame(fitToView)
    const viewport = viewportRef.current
    const ResizeObserverCtor = window.ResizeObserver
    const observer = viewport && ResizeObserverCtor ? new ResizeObserverCtor(fitToView) : null
    if (viewport && observer) observer.observe(viewport)
    return () => {
      window.cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [autoFit, canvasPage, fitToView])

  const updateField = useCallback((id, changes) => {
    if (!fieldsEditable) return
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...changes } : field)))
  }, [fieldsEditable])

  const centerSelected = useCallback((area) => {
    if (!selected || !fieldsEditable || !canvasPage) return
    const pageBox = { x: 0, y: 0, width: canvasPage.pageWidth || 612, height: canvasPage.pageHeight || 792 }
    const targetBox = area === 'document'
      ? pageBox
      : getLuluGeometryBox(geometryState.geometry, canvasPage, area)
    if (!targetBox) return
    updateField(selected.id, {
      x: Math.max(0, targetBox.x + (targetBox.width - selected.width) / 2),
      y: Math.max(0, targetBox.y + (targetBox.height - selected.height) / 2),
    })
  }, [canvasPage, fieldsEditable, geometryState.geometry, selected, updateField])

  const updateVariantLocal = (variantIdToUpdate, updater) => {
    setLocalProduct((current) => ({
      ...current,
      variants: (current.variants || []).map((variant) => {
        if (variantId(variant) !== variantIdToUpdate) return variant
        return updater({ ...variant, templatePolicy: normalizePolicy(variant.templatePolicy), printTemplate: variant.printTemplate || emptyTemplate() })
      }),
    }))
  }

  const setVariantPolicy = (part, value) => {
    if (!selectedVariantId) return
    updateVariantLocal(selectedVariantId, (variant) => {
      const nextPolicy = { ...normalizePolicy(variant.templatePolicy), [part]: value }
      const nextTemplate = { ...(variant.printTemplate || emptyTemplate()) }
      if (part === 'fields' && value === 'override' && !nextTemplate.fields?.length) {
        nextTemplate.fields = cloneFields(localProduct?.printTemplate?.fields || [])
        setFields(nextTemplate.fields)
      }
      if (part === 'fields' && value === 'inherit') {
        setFields(localProduct?.printTemplate?.fields || [])
      }
      return { ...variant, templatePolicy: nextPolicy, printTemplate: nextTemplate }
    })
  }

  const addField = (draft) => {
    if (!fieldsEditable) return
    const id = uuidv4()
    setFields((current) => {
      const key = uniqueKey(draft.label || draft.text || 'field', current)
      const rawRotation = typeof draft.rotation === 'number' ? draft.rotation : Number(draft.rotation || 0)
      const nextRotation = key === 'spine_text' && !rawRotation ? 90 : rawRotation
      const next = {
        id,
        key,
        label: draft.label || key.replace(/_/g, ' '),
        sampleValue: draft.sampleValue || draft.text || '',
        target,
        x: draft.x,
        y: draft.y,
        width: Math.max(40, draft.width || 180),
        height: Math.max(18, draft.height || 34),
        fontSize: draft.fontSize || 24,
        fontFamily: draft.fontFamily || 'Canela Regular',
        fontStyle: normalizeFontStyle(draft.fontStyle),
        fontWeight: draft.fontWeight || 400,
        fontFile: draft.fontFile || null,
        fill: draft.fill || '#000000',
        align: draft.align || 'left',
        lineHeight: draft.lineHeight || 1.2,
        maxLines: draftMaxLines(draft),
        preserveFontSizeOnWrap: Boolean(draft.preserveFontSizeOnWrap),
        rotation: nextRotation,
        required: true,
        replacementTextId: draft.replacementTextId || null,
        replacementBox: draft.replacementBox || null,
        replacementFill: draft.replacementFill || (draft.replacementBox ? defaultReplacementFill() : null),
        replacementFillMode: draft.replacementFillMode || (draft.replacementBox ? 'transparent' : undefined),
        forceReplacementFill: Boolean(draft.forceReplacementFill),
      }
      return [...current, next]
    })
    setPreviewModes((current) => ({ ...current, [id]: 'sample' }))
    setSelectedId(id)
  }

  const createFromText = (text) => {
    if (!fieldsEditable) return
    const existing = fields.find((field) => field.target === target && field.replacementTextId === text.id)
    if (existing) {
      setSelectedId(existing.id)
      return
    }
    const sourceText = String(text.text || '').trim()
    const label = sourceText && sourceText.length <= 48 ? sourceText : 'Personalized text'
    addField({
      label,
      text: sourceText,
      x: text.x,
      y: text.y,
      width: Math.max(text.width + 8, 80),
      height: Math.max(text.height + 4, text.fontSize * 1.45),
      fontSize: text.fontSize,
      fontFamily: text.fontFamily,
      fontStyle: text.fontStyle,
      fill: text.fill,
      align: ['left', 'center', 'right'].includes(text.align) ? text.align : 'left',
      replacementFill: defaultReplacementFill(),
      replacementFillMode: 'transparent',
      rotation: typeof text.rotation === 'number' ? text.rotation : 0,
      replacementTextId: text.id,
      replacementBox: {
        x: text.x,
        y: text.y,
        width: Math.max(text.width, 4),
        height: Math.max(text.height, 4),
      },
    })
  }

  const createFromTextGroup = (texts, selectionBounds = null) => {
    if (!fieldsEditable || !texts?.length) return
    if (texts.length === 1) {
      createFromText(texts[0])
      return
    }

    const sorted = [...texts].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
    const combinedText = groupTextIntoLines(sorted).join('\n')
    const firstLine = String(sorted[0]?.text || '').trim()
    const label = firstLine && firstLine.length <= 48 ? firstLine : 'Personalized text'

    const sourceBounds = textBounds(sorted)
    const fieldBounds = selectionBounds || sourceBounds

    const avgFontSize = Math.round(sorted.reduce((sum, text) => sum + (text.fontSize || 0), 0) / sorted.length) || 24
    const sampleFont = sorted.find((text) => text.fontFamily) || sorted[0]
    const maxLines = Math.max(1, Math.min(12, lineCountForText(combinedText)))

    addField({
      label,
      text: combinedText,
      sampleValue: combinedText,
      x: fieldBounds.x,
      y: fieldBounds.y,
      width: Math.max(fieldBounds.width, 8),
      height: Math.max(fieldBounds.height, 8),
      maxLines,
      preserveFontSizeOnWrap: false,
      fontSize: avgFontSize,
      fontFamily: sampleFont.fontFamily,
      fontStyle: sampleFont.fontStyle,
      fill: sampleFont.fill,
      align: groupAlign(sorted, fieldBounds),
      replacementFill: defaultReplacementFill(),
      replacementFillMode: 'transparent',
      rotation: typeof sampleFont.rotation === 'number' ? sampleFont.rotation : 0,
      replacementBox: {
        x: sourceBounds.x,
        y: sourceBounds.y,
        width: Math.max(sourceBounds.width, 4),
        height: Math.max(sourceBounds.height, 4),
      },
    })
  }

  const createBlank = ({ x, y }) => {
    addField({ label: 'Personalized text', x, y, width: 220, height: 70, fontSize: 28, maxLines: 2, preserveFontSizeOnWrap: false, fontFamily: 'Canela Regular', fontFile: 'Canela-Regular-Trial.otf' })
  }

  const addCenteredBlankField = () => {
    const pageWidth = canvasPage?.pageWidth || 612
    const pageHeight = canvasPage?.pageHeight || 792
    createBlank({ x: Math.max(0, pageWidth / 2 - 110), y: Math.max(0, pageHeight / 2 - 35) })
  }

  const importPdf = async (file) => {
    if (!file) return
    setUploading(target)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      form.append('file', file)
      let url = ''
      if (libraryMode) {
        if (libraryItem.category === 'cover') {
          const color = window.prompt('Enter cover colour', libraryItem.coverColor || '')
          if (!color?.trim()) {
            setUploading('')
            return
          }
          form.append('coverColor', color.trim())
          if (product?._id) form.append('productId', product._id)
        }
        url = `/product-library-v2/items/${libraryItem._id}/pdf/import`
      } else {
        form.append('kind', target === 'cover' ? 'cover' : 'interior')
        url = selectedVariantId
          ? `/products/${localProduct._id}/variants/${selectedVariantId}/template/import`
          : `/products/${localProduct._id}/template/import`
      }
      const { data } = await api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setLocalProduct(libraryMode ? productFromLibraryItem(data) : data)
      onSaved?.(data)
      setAutoFit(true)
      const warnings = data?.importWarnings || []
      setMessage(warnings.length
        ? `${libraryMode ? libraryItem.title : selectedVariant ? `${selectedVariant.name} ` : ''}${libraryMode ? ' PDF' : ` ${TARGETS[target].label}`} imported. ${warnings.join(' ')}`
        : `${libraryMode ? libraryItem.title : selectedVariant ? `${selectedVariant.name} ` : ''}${libraryMode ? ' PDF' : ` ${TARGETS[target].label}`} imported`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to import PDF. Make sure the Python PDF template service is running.')
    } finally {
      setUploading('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const saveFields = async ({ silent = false } = {}) => {
    setSaving(true)
    setError('')
    if (!silent) setMessage('')
    try {
      if (libraryMode) {
        const { data } = await api.patch(`/product-library-v2/items/${libraryItem._id}`, { templateFields: fields })
        setLocalProduct(productFromLibraryItem(data))
        onSaved?.(data)
        if (!silent) setMessage('Library asset template saved')
        return data
      }

      const payload = selectedVariantId
        ? {
            templatePolicy: selectedPolicy,
            ...(selectedPolicy.fields === 'override' ? { fields } : {}),
          }
        : { fields }
      const url = selectedVariantId
        ? `/products/${localProduct._id}/variants/${selectedVariantId}/template`
        : `/products/${localProduct._id}/template`
      const { data } = await api.patch(url, payload)
      setLocalProduct(data)
      onSaved?.(data)
      if (!silent) setMessage(selectedVariant ? 'Variant template saved' : 'Default template saved')
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template fields')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const generateSample = async () => {
    if (libraryMode) return
    setGenerating(true)
    setError('')
    setMessage('')
    try {
      await saveFields({ silent: true })
      const { data } = await api.post(`/products/${localProduct._id}/template/sample`, selectedVariantId ? { variantId: selectedVariantId } : {})
      setLocalProduct(data.product)
      onSaved?.(data.product)
      const warningText = data.sample?.warnings?.length ? ` with ${data.sample.warnings.length} warning(s)` : ''
      setMessage(`Sample PDFs generated${warningText}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate sample PDFs')
    } finally {
      setGenerating(false)
    }
  }

  const downloadPrintPdf = () => {
    if (!currentPrintPdfUrl) {
      setError('Import a PDF or generate sample PDFs before downloading the print PDF.')
      return
    }
    downloadUrl(currentPrintPdfUrl, `${currentDownloadBaseName}-print.pdf`)
  }

  const downloadProofPdf = () => {
    const stage = stageRef.current
    if (!stage || !canvasPage) {
      setError('Canvas is not ready for proof export yet.')
      return
    }
    try {
      const jpeg = stage.toDataURL({
        x: 0,
        y: 0,
        width: (canvasPage.pageWidth || 612) * zoom,
        height: (canvasPage.pageHeight || 792) * zoom,
        mimeType: 'image/jpeg',
        quality: 0.94,
        pixelRatio: 2 / zoom,
      })
      const pdfBlob = imagePdfDataUrl(jpeg, canvasPage.pageWidth || 612, canvasPage.pageHeight || 792)
      downloadBlob(pdfBlob, `${currentDownloadBaseName}-proof.pdf`)
      setMessage('Proof PDF download started')
    } catch (err) {
      setError(err?.message || 'Failed to download proof PDF')
    }
  }

  const deleteSelected = () => {
    if (!selectedId || !fieldsEditable) return
    setFields((current) => current.filter((field) => field.id !== selectedId))
    setSelectedId(null)
  }

  const updateZoom = (next) => {
    setAutoFit(false)
    setZoom(Math.min(3, Math.max(0.08, Number(next.toFixed(3)))))
  }

  const currentDefaultPage = localProduct?.printTemplate?.[TARGETS[target].productKey]
  const currentOverridePage = selectedVariant?.printTemplate?.[TARGETS[target].productKey]
  const dimensionWarning = Boolean(
    selectedVariant &&
    selectedPolicy.fields === 'inherit' &&
    selectedPolicy[TARGETS[target].policyKey] === 'override' &&
    currentDefaultPage?.pageWidth &&
    currentOverridePage?.pageWidth &&
    (currentDefaultPage.pageWidth !== currentOverridePage.pageWidth || currentDefaultPage.pageHeight !== currentOverridePage.pageHeight)
  )
  const luluPageMismatch = target === 'cover' && canvasPage
    ? getGeometryMismatch(geometryState.geometry, canvasPage)
    : null

  return (
    <Box sx={{ position: 'fixed', inset: 0, zIndex: (theme) => theme.zIndex.modal - 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ height: 58, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, bgcolor: 'background.paper', borderBottom: '1px dashed', borderColor: 'divider' }}>
        <Tooltip title="Back to product library">
          <IconButton onClick={onBack} size="small"><ArrowBackIcon /></IconButton>
        </Tooltip>
        <Box sx={{ minWidth: 0, width: { xs: 180, md: 260 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {localProduct?.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {libraryMode ? `${libraryItem?.category === 'cover' ? 'Cover asset' : 'Inside page'}${libraryItem?.coverColor ? ` - ${libraryItem.coverColor}` : ''}` : `#${localProduct?.listingId}`} - {fields.length} fields
          </Typography>
        </Box>

        {!libraryMode && (
          <TextField
            select
            size="small"
            label="Template"
            value={templateKey}
            onChange={(event) => {
              setTemplateKey(event.target.value)
              setSelectedId(null)
              setAutoFit(true)
            }}
            sx={{ minWidth: 230 }}
          >
            <MenuItem value={DEFAULT_TEMPLATE_KEY}>Default Template</MenuItem>
            {variants.map((variant) => (
              <MenuItem key={variantId(variant)} value={variantId(variant)}>{variant.name}</MenuItem>
            ))}
          </TextField>
        )}

        <Divider orientation="vertical" flexItem />

        {libraryMode ? (
          <Chip label={`${TARGETS[target].label} (${fields.filter((field) => field.target === target).length})`} color="primary" variant="outlined" />
        ) : (
          <Tabs value={target} onChange={(_, value) => { setTarget(value); setSelectedId(null); setAutoFit(true) }} sx={{ minHeight: 44 }}>
            <Tab value="cover" label={`Cover (${stats.cover})`} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 700 }} />
            <Tab value="interiorFirstPage" label={`Inside First Page (${stats.interior})`} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 700 }} />
          </Tabs>
        )}

        {target === 'cover' && usesGeometryAssetPools && (
          <>
            <Divider orientation="vertical" flexItem />
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center' }}>
              <TextField
                select
                size="small"
                label="Geometry cover"
                value={geometryCoverAssetId}
                onChange={(event) => setGeometryCoverAssetId(event.target.value)}
                sx={{ width: 168 }}
                disabled={libraryMode && libraryItem?.category === 'cover'}
              >
                <MenuItem value="">Select cover</MenuItem>
                {geometryCoverAssets.map((asset) => (
                  <MenuItem key={asset._id} value={asset._id}>{asset.title}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Geometry inside"
                value={geometryInsideAssetId}
                onChange={(event) => setGeometryInsideAssetId(event.target.value)}
                sx={{ width: 168 }}
                disabled={libraryMode && libraryItem?.category === 'inside-page'}
              >
                <MenuItem value="">Select inside</MenuItem>
                {geometryInsideAssets.map((asset) => (
                  <MenuItem key={asset._id} value={asset._id}>{asset.title}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </>
        )}

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          {target === 'cover' && (
            <>
              <Tooltip title={showAlignment ? 'Hide Lulu alignment backlayer' : 'Show Lulu alignment backlayer'}>
                <IconButton size="small" color={showAlignment ? 'primary' : 'default'} onClick={() => setShowAlignment((value) => !value)} disabled={!geometryState.svgDataUrl}>
                  <LayersIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={showGuides ? 'Hide Lulu cover guides' : 'Show Lulu cover guides'}>
                <IconButton size="small" color={showGuides ? 'primary' : 'default'} onClick={() => setShowGuides((value) => !value)}>
                  <StraightenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={showRulers ? 'Hide rulers' : 'Show rulers'}>
                <IconButton size="small" color={showRulers ? 'primary' : 'default'} onClick={() => setShowRulers((value) => !value)}>
                  <GridOnIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <TextField
                select
                size="small"
                value={measurementUnit}
                onChange={(event) => setMeasurementUnit(event.target.value)}
                sx={{ width: 72 }}
              >
                <MenuItem value="in">in</MenuItem>
                <MenuItem value="pt">pt</MenuItem>
              </TextField>
              <Tooltip title="Lulu alignment opacity">
                <Stack direction="row" spacing={0.75} sx={{ width: 112, alignItems: 'center', display: { xs: 'none', lg: 'flex' } }}>
                  <LayersIcon fontSize="small" color="action" />
                  <Slider
                    size="small"
                    value={Math.round(alignmentOpacity * 100)}
                    min={15}
                    max={100}
                    disabled={!geometryState.svgDataUrl}
                    onChange={(_, value) => setAlignmentOpacity(Number(value) / 100)}
                  />
                </Stack>
              </Tooltip>
              <Tooltip title="Imported PDF opacity">
                <Stack direction="row" spacing={0.75} sx={{ width: 120, alignItems: 'center', display: { xs: 'none', md: 'flex' } }}>
                  <OpacityIcon fontSize="small" color="action" />
                  <Slider
                    size="small"
                    value={Math.round(backgroundOpacity * 100)}
                    min={20}
                    max={100}
                    disabled={!canvasPage?.previewImageUrl}
                    onChange={(_, value) => setBackgroundOpacity(Number(value) / 100)}
                  />
                </Stack>
              </Tooltip>
              {geometryState.loading && <Chip size="small" label="Guides" variant="outlined" />}
              {!geometryState.loading && geometryState.warnings?.length > 0 && (
                <Tooltip title={geometryState.warnings.join(' ')}>
                  <Chip size="small" label="Guides unavailable" color="warning" variant="outlined" />
                </Tooltip>
              )}
            </>
          )}
          <Tooltip title="Zoom out"><IconButton size="small" onClick={() => updateZoom(zoom - 0.08)}><ZoomOutIcon fontSize="small" /></IconButton></Tooltip>
          <Typography variant="caption" sx={{ width: 44, textAlign: 'center', fontFamily: 'monospace', color: 'text.secondary' }}>{Math.round(zoom * 100)}%</Typography>
          <Tooltip title="Zoom in"><IconButton size="small" onClick={() => updateZoom(zoom + 0.08)}><ZoomInIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Fit page to view">
            <IconButton size="small" color={autoFit ? 'primary' : 'default'} onClick={() => { setAutoFit(true); fitToView() }}>
              <FitScreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider orientation="vertical" flexItem />

        <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => saveFields()} disabled={saving}>{saving ? 'Saving' : 'Save'}</Button>
      
        {!libraryMode && (
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={generateSample} disabled={generating || !fields.length}>{generating ? 'Generating' : 'Sample PDFs'}</Button>
        )}
        {!libraryMode && <SamplePdfDownloads assets={samplePdfAssets} />}
      </Box>

      <MeasurementStatusStrip
        page={canvasPage}
        geometry={geometryState.geometry}
        zoom={zoom}
        unit={measurementUnit}
        target={target}
        mismatch={luluPageMismatch}
        luluPrintSpec={geometryState.luluPrintSpec}
        resolvedFrom={geometryState.resolvedFrom}
      />

      {libraryMode && (
        <Alert severity="warning" sx={{ flexShrink: 0, borderRadius: 0 }}>
          Saving this shared {libraryItem?.category === 'cover' ? 'cover' : 'inside-page'} asset updates every product that uses it. Future or regenerated order PDFs from those products will use these changes.
        </Alert>
      )}

      {!libraryMode && selectedVariant && (
        <Box sx={{ flexShrink: 0, px: 1.5, py: 1, bgcolor: 'background.paper', borderBottom: '1px dashed', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={selectedVariant.name} color="primary" variant="outlined" sx={{ maxWidth: 280 }} />
          {[
            ['cover', 'Cover'],
            ['interior', 'Interior'],
            ['fields', 'Fields'],
          ].map(([part, label]) => (
            <TextField
              key={part}
              select
              size="small"
              label={label}
              value={selectedPolicy[part]}
              onChange={(event) => setVariantPolicy(part, event.target.value)}
              sx={{ width: 170 }}
            >
              <MenuItem value="inherit">Use default</MenuItem>
              <MenuItem value="override">{part === 'fields' ? 'Customize fields' : 'Override PDF'}</MenuItem>
            </TextField>
          ))}
          {dimensionWarning && (
            <Alert severity="warning" sx={{ py: 0, flex: 1 }}>
              This variant PDF has different page dimensions while fields are inherited. Customize fields before finalizing print PDFs.
            </Alert>
          )}
        </Box>
      )}

      {(error || message || uploading || saving || generating) && (
        <Box sx={{ flexShrink: 0 }}>
          {(uploading || saving || generating) && <LinearProgress />}
          {error && <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ borderRadius: 0 }}>{message}</Alert>}
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <Box sx={{ width: 72, flexShrink: 0, bgcolor: 'background.paper', borderRight: '1px dashed', borderColor: 'divider', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1.5, gap: 0.75 }}>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" hidden onChange={(event) => importPdf(event.target.files?.[0])} />
          <Tooltip title={`Import ${TARGETS[target].label} PDF`} placement="right">
            <span>
              <IconButton sx={buttonRailSx(Boolean(uploading))} onClick={() => fileInputRef.current?.click()} disabled={Boolean(uploading) || pageInherited}>
                <UploadFileIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={fieldsEditable ? 'Add manual text field' : 'Customize fields to add a manual field'} placement="right">
            <span>
              <IconButton sx={buttonRailSx(false)} onClick={addCenteredBlankField} disabled={!canvasPage || !fieldsEditable}>
                <TextFieldsIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Divider flexItem sx={{ my: 0.5 }} />
          <Tooltip title="Save template fields" placement="right">
            <IconButton sx={buttonRailSx(Boolean(saving))} onClick={() => saveFields()} disabled={saving}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Generate sample PDFs" placement="right">
            <span>
              <IconButton sx={buttonRailSx(Boolean(generating))} onClick={generateSample} disabled={libraryMode || generating || !fields.length}>
                <PictureAsPdfIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Download print PDF" placement="right">
            <span>
              <IconButton sx={buttonRailSx(false)} onClick={downloadPrintPdf} disabled={!currentPrintPdfUrl}>
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Download proof PDF" placement="right">
            <span>
              <IconButton sx={buttonRailSx(false)} onClick={downloadProofPdf} disabled={!canvasPage}>
                <PictureAsPdfIcon />
              </IconButton>
            </span>
          </Tooltip>
          {!libraryMode && samplePdfAssets.length > 0 && (
            <>
              <Divider flexItem sx={{ my: 0.5 }} />
              <SamplePdfDownloads assets={samplePdfAssets} compact />
            </>
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Click existing text to replace it, or double-click blank space to add a field." placement="right">
            <IconButton sx={buttonRailSx(false)}><AddIcon /></IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {canvasPage ? (
            <TemplateStage
              page={canvasPage}
              target={target}
              fields={fields}
              selectedId={selectedId}
              fieldsEditable={fieldsEditable}
              previewModes={previewModes}
              onSelect={setSelectedId}
              onCreateFromText={createFromText}
              onCreateFromTextGroup={createFromTextGroup}
              onCreateBlank={createBlank}
              onChange={updateField}
              zoom={zoom}
              viewportRef={viewportRef}
              geometry={geometryState.geometry}
              showGuides={showGuides}
              showRulers={showRulers}
              measurementUnit={measurementUnit}
              alignmentImageUrl={geometryState.svgDataUrl}
              showAlignment={showAlignment}
              alignmentOpacity={alignmentOpacity}
              backgroundOpacity={backgroundOpacity}
              stageRef={stageRef}
            />
          ) : (
            <EmptyCanvas target={target} inherited={pageInherited} onImport={() => fileInputRef.current?.click()} />
          )}
        </Box>

        <FieldPanel
          selected={selected}
          fields={fields}
          selectedId={selectedId}
          target={target}
          fieldsEditable={fieldsEditable}
          selectedPreviewMode={selectedPreviewMode}
          onPreviewModeChange={(mode) => selected && setPreviewModes((current) => ({ ...current, [selected.id]: mode }))}
          setTarget={setTarget}
          setSelectedId={setSelectedId}
          updateField={updateField}
          deleteSelected={deleteSelected}
          sampleOutputs={sampleOutputs}
          centerSelected={centerSelected}
          coverGeometryAvailable={Boolean(getLuluGeometryBox(geometryState.geometry, canvasPage, 'front'))}
        />
      </Box>

    </Box>
  )
}
