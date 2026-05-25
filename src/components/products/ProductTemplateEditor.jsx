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
import FormControlLabel from '@mui/material/FormControlLabel'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UploadFileIcon from '@mui/icons-material/CloudUploadOutlined'
import SaveIcon from '@mui/icons-material/SaveOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ZoomInIcon from '@mui/icons-material/ZoomInOutlined'
import ZoomOutIcon from '@mui/icons-material/ZoomOutOutlined'
import FitScreenIcon from '@mui/icons-material/FitScreenOutlined'
import TextFieldsIcon from '@mui/icons-material/TextFieldsOutlined'
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer } from 'react-konva'
import { v4 as uuidv4 } from 'uuid'
import api from '../../lib/api'
import { FONT_OPTIONS, getFontOption, normalizeFontStyle } from '../../lib/fonts'

const DEFAULT_TEMPLATE_KEY = 'default'
const DEFAULT_TEMPLATE_POLICY = { cover: 'inherit', interior: 'inherit', fields: 'inherit' }

const TARGETS = {
  cover: { label: 'Cover', productKey: 'cover', policyKey: 'cover' },
  interiorFirstPage: { label: 'Inside First Page', productKey: 'interior', policyKey: 'interior' },
}

const pageFromLibraryItem = (item) => {
  if (!item?.pageWidth || !item?.pageHeight) return null
  return {
    sourcePdfUrl: item.pdfUrl || item.sourceUrl || null,
    previewImageUrl: item.imageUrl || null,
    pageWidth: item.pageWidth || 0,
    pageHeight: item.pageHeight || 0,
    pageCount: item.pageCount || 0,
    extractedText: item.extractedText || [],
    extractedImages: item.extractedImages || [],
  }
}

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

const variantId = (variant) => String(variant?._id || variant?.id || '')
const normalizePolicy = (policy) => ({ ...DEFAULT_TEMPLATE_POLICY, ...(policy || {}) })
const emptyTemplate = () => ({ cover: null, interior: null, fields: [] })

const cloneFields = (fields = []) =>
  fields.map((field) => ({
    ...field,
    id: uuidv4(),
    replacementBox: field.replacementBox ? { ...field.replacementBox } : null,
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
}) {
  const image = useLoadedImage(page?.previewImageUrl)
  const stageRef = useRef(null)
  const transformerRef = useRef(null)
  const selectionStartRef = useRef(null)
  const selectionRectRef = useRef(null)
  const selectionDragRef = useRef(false)
  const [selectionRect, setSelectionRect] = useState(null)
  const pageWidth = page?.pageWidth || 612
  const pageHeight = page?.pageHeight || 792
  const activeFields = fields.filter((field) => field.target === target)
  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const node = selectedId && fieldsEditable ? stage.findOne(`#${selectedId}`) : null
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedId, fields, target, fieldsEditable])

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

    const hits = (page?.extractedText || [])
      .filter((text) => {
        const width = Math.max(1, text.width)
        const height = Math.max(1, text.height)
        return !(
          text.x + width < rect.x ||
          text.x > rect.x + rect.width ||
          text.y + height < rect.y ||
          text.y > rect.y + rect.height
        )
      })
      .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))

    if (hits.length === 1) {
      onCreateFromText(hits[0])
    } else if (hits.length > 1) {
      onCreateFromTextGroup(hits)
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
      <Box sx={{ minWidth: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, md: 5 } }}>
        <Box
          sx={{
            width: pageWidth * zoom,
            height: pageHeight * zoom,
            bgcolor: 'common.white',
            boxShadow: '0 0 2px 0 rgba(145,158,171,0.20), 0 12px 24px -4px rgba(145,158,171,0.12)',
            outline: '1px solid rgba(145, 158, 171, 0.28)',
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
              {image ? (
                <KonvaImage image={image} x={0} y={0} width={pageWidth} height={pageHeight} listening={false} />
              ) : (
                <Rect x={0} y={0} width={pageWidth} height={pageHeight} fill="#ffffff" listening={false} />
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

              {(page?.extractedImages || []).map((asset) => (
                <Rect
                  key={asset.id}
                  x={asset.x}
                  y={asset.y}
                  width={Math.max(4, asset.width)}
                  height={Math.max(4, asset.height)}
                  fill="rgba(34, 197, 94, 0.025)"
                  stroke="rgba(22, 163, 74, 0.55)"
                  strokeWidth={0.75}
                  dash={[6, 4]}
                  listening={false}
                />
              ))}

              {activeFields.map((field) => {
                const selected = selectedId === field.id
                const previewMode = previewModes[field.id] || 'sample'
                const showSample = previewMode !== 'original'
                const maskOriginal = previewMode === 'sample' && field.replacementBox
                const useReplacementBox = Boolean(field.replacementBox && !(field.rotation || 0))
                const box = useReplacementBox ? field.replacementBox : field
                return (
                  <React.Fragment key={field.id}>
                    {maskOriginal && (
                      <Rect
                        x={box.x}
                        y={box.y}
                        width={Math.max(1, box.width)}
                        height={Math.max(1, box.height)}
                        rotation={field.rotation || 0}
                        fill="#ffffff"
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
                      draggable={fieldsEditable}
                      onClick={(event) => {
                        event.cancelBubble = true
                        onSelect(field.id)
                      }}
                      onTap={(event) => {
                        event.cancelBubble = true
                        onSelect(field.id)
                      }}
                      onDragEnd={(event) => fieldsEditable && onChange(field.id, { x: event.target.x(), y: event.target.y() })}
                      onTransformEnd={(event) => {
                        if (!fieldsEditable) return
                        const node = event.target
                        const scaleX = node.scaleX()
                        const scaleY = node.scaleY()
                        node.scaleX(1)
                        node.scaleY(1)
                        onChange(field.id, {
                          x: node.x(),
                          y: node.y(),
                          width: Math.max(8, field.width * scaleX),
                          height: Math.max(8, field.height * scaleY),
                        })
                      }}
                    />
                    {showSample && (
                      <Text
                        x={field.x + 3}
                        y={field.y + 2}
                        width={Math.max(4, field.width - 6)}
                        height={field.height}
                        listening={false}
                        text={field.sampleValue || field.label}
                        fontSize={field.fontSize}
                        fontFamily={field.fontFamily}
                        fontStyle={normalizeFontStyle(field.fontStyle)}
                        fill={field.fill}
                        align={field.align}
                        lineHeight={field.lineHeight}
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

  return (
    <Box sx={{ width: { xs: 320, md: 372 }, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', transition: 'width 180ms ease', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Template Fields</Typography>
            <Typography variant="caption" color="text.secondary">{targetFields.length} on this page</Typography>
          </Box>
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
          <TextField disabled={!fieldsEditable} label="Form label" size="small" value={selected.label} onChange={(e) => updateField(selected.id, { label: e.target.value })} />
          <TextField disabled={!fieldsEditable} label="Form key" size="small" value={selected.key} onChange={(e) => updateField(selected.id, { key: slugify(e.target.value) })} />
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
            <TextField disabled={!fieldsEditable} label="Height" size="small" type="number" value={Math.round(selected.height * 100) / 100} onChange={(e) => updateField(selected.id, { height: Number(e.target.value) })} />
            <TextField disabled={!fieldsEditable} label="Rotation (deg)" size="small" type="number" value={Math.round((selected.rotation || 0) * 100) / 100} onChange={(e) => updateField(selected.id, { rotation: Number(e.target.value) })} />
          </Box>

          <Divider />

          <TextField disabled={!fieldsEditable} label="Font size" size="small" type="number" value={selected.fontSize} onChange={(e) => updateField(selected.id, { fontSize: Number(e.target.value) })} />
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
          <TextField disabled={!fieldsEditable} label="Color" size="small" value={selected.fill} onChange={(e) => updateField(selected.id, { fill: e.target.value })} />
          <FormControlLabel
            control={<Switch disabled={!fieldsEditable} checked={selected.required} onChange={(e) => updateField(selected.id, { required: e.target.checked })} />}
            label="Required before final PDF"
          />
          {selected.replacementTextId && (
            <Alert severity="success">This field replaces the clicked source PDF text during generation.</Alert>
          )}

          {sampleOutputs && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Latest Sample</Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {sampleOutputs.coverPdfUrl && (
                  <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => window.open(sampleOutputs.coverPdfUrl, '_blank')}>Cover PDF</Button>
                )}
                {sampleOutputs.interiorPdfUrl && (
                  <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => window.open(sampleOutputs.interiorPdfUrl, '_blank')}>Inside PDF</Button>
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

export default function ProductTemplateEditor({ product, onBack, onSaved, libraryItem = null }) {
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
  const [autoFit, setAutoFit] = useState(true)
  const [uploading, setUploading] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef(null)
  const viewportRef = useRef(null)

  const variants = libraryMode ? [] : localProduct?.variants || []
  const selectedVariant = getVariant(localProduct, templateKey)
  const selectedVariantId = selectedVariant ? variantId(selectedVariant) : null
  const selectedPolicy = normalizePolicy(selectedVariant?.templatePolicy)
  const effective = useMemo(() => resolveEffectiveTemplate(localProduct, templateKey), [localProduct, templateKey])
  const page = effective.template[TARGETS[target].productKey]
  const selected = fields.find((field) => field.id === selectedId) || null
  const sampleOutputs = effective.template.sampleOutputs
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
    const next = resolveEffectiveTemplate(localProduct, templateKey).template.fields || []
    setFields(next)
    setSelectedId(null)
  }, [localProduct, templateKey])

  const stats = useMemo(() => ({
    cover: fields.filter((field) => field.target === 'cover').length,
    interior: fields.filter((field) => field.target === 'interiorFirstPage').length,
  }), [fields])

  const fitToView = useCallback(() => {
    if (!page?.pageWidth || !page?.pageHeight || !viewportRef.current) return
    const rect = viewportRef.current.getBoundingClientRect()
    const availableWidth = Math.max(160, rect.width - 96)
    const availableHeight = Math.max(160, rect.height - 96)
    const nextZoom = Math.min(2, Math.max(0.08, Math.min(availableWidth / page.pageWidth, availableHeight / page.pageHeight)))
    setZoom(Number(nextZoom.toFixed(3)))
  }, [page?.pageHeight, page?.pageWidth])

  useEffect(() => {
    if (!autoFit || !page?.previewImageUrl) return
    const raf = window.requestAnimationFrame(fitToView)
    const viewport = viewportRef.current
    const ResizeObserverCtor = window.ResizeObserver
    const observer = viewport && ResizeObserverCtor ? new ResizeObserverCtor(fitToView) : null
    if (viewport && observer) observer.observe(viewport)
    return () => {
      window.cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [autoFit, fitToView, page?.previewImageUrl])

  const updateField = (id, changes) => {
    if (!fieldsEditable) return
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...changes } : field)))
  }

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
        rotation: typeof draft.rotation === 'number' ? draft.rotation : Number(draft.rotation || 0),
        required: true,
        replacementTextId: draft.replacementTextId || null,
        replacementBox: draft.replacementBox || null,
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
      rotation: typeof text.rotation === 'number' ? text.rotation : 0,
      replacementTextId: text.id,
      replacementBox: {
        x: text.x,
        y: text.y,
        width: Math.max(text.width + 2, 4),
        height: Math.max(text.height + 2, 4),
      },
    })
  }

  const createFromTextGroup = (texts) => {
    if (!fieldsEditable || !texts?.length) return
    if (texts.length === 1) {
      createFromText(texts[0])
      return
    }

    const sorted = [...texts].sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
    const combinedText = sorted.map((text) => String(text.text || '').trim()).filter(Boolean).join('\n')
    const firstLine = String(sorted[0]?.text || '').trim()
    const label = firstLine && firstLine.length <= 48 ? firstLine : 'Personalized text'

    const left = Math.min(...sorted.map((text) => text.x))
    const top = Math.min(...sorted.map((text) => text.y))
    const right = Math.max(...sorted.map((text) => text.x + Math.max(1, text.width)))
    const bottom = Math.max(...sorted.map((text) => text.y + Math.max(1, text.height)))

    const avgFontSize = Math.round(sorted.reduce((sum, text) => sum + (text.fontSize || 0), 0) / sorted.length) || 24
    const sampleFont = sorted.find((text) => text.fontFamily) || sorted[0]

    addField({
      label,
      text: combinedText,
      sampleValue: combinedText,
      x: left,
      y: top,
      width: Math.max(right - left + 8, 120),
      height: Math.max(bottom - top + 6, avgFontSize * (sorted.length + 0.35)),
      fontSize: avgFontSize,
      fontFamily: sampleFont.fontFamily,
      fontStyle: sampleFont.fontStyle,
      fill: sampleFont.fill,
      rotation: typeof sampleFont.rotation === 'number' ? sampleFont.rotation : 0,
      replacementBox: {
        x: left,
        y: top,
        width: Math.max(right - left + 2, 4),
        height: Math.max(bottom - top + 2, 4),
      },
    })
  }

  const createBlank = ({ x, y }) => {
    addField({ label: 'Personalized text', x, y, width: 220, height: 42, fontSize: 28, fontFamily: 'Canela Regular', fontFile: 'Canela-Regular-Trial.otf' })
  }

  const addCenteredBlankField = () => {
    const pageWidth = page?.pageWidth || 612
    const pageHeight = page?.pageHeight || 792
    createBlank({ x: Math.max(0, pageWidth / 2 - 110), y: Math.max(0, pageHeight / 2 - 21) })
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
      setMessage(`${libraryMode ? libraryItem.title : selectedVariant ? `${selectedVariant.name} ` : ''}${libraryMode ? ' PDF' : ` ${TARGETS[target].label}`} imported`)
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

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
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
      </Box>

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
              <IconButton sx={buttonRailSx(false)} onClick={addCenteredBlankField} disabled={!page?.previewImageUrl || !fieldsEditable}>
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
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Click existing text to replace it, or double-click blank space to add a field." placement="right">
            <IconButton sx={buttonRailSx(false)}><AddIcon /></IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {page?.previewImageUrl ? (
            <TemplateStage
              page={page}
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
        />
      </Box>

    </Box>
  )
}
