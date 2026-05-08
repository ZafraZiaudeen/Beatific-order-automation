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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined'
import SaveIcon from '@mui/icons-material/SaveOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ZoomInIcon from '@mui/icons-material/ZoomInOutlined'
import ZoomOutIcon from '@mui/icons-material/ZoomOutOutlined'
import FitScreenIcon from '@mui/icons-material/FitScreenOutlined'
import TextFieldsIcon from '@mui/icons-material/TextFieldsOutlined'
import LayersIcon from '@mui/icons-material/LayersOutlined'
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer } from 'react-konva'
import { v4 as uuidv4 } from 'uuid'
import api from '../../lib/api'
import { FONT_OPTIONS, normalizeFontStyle } from '../../lib/fonts'

const TARGETS = {
  cover: { label: 'Cover', productKey: 'cover' },
  interiorFirstPage: { label: 'Inside First Page', productKey: 'interior' },
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
  onSelect,
  onCreateFromText,
  onCreateBlank,
  onChange,
  zoom,
  viewportRef,
}) {
  const image = useLoadedImage(page?.previewImageUrl)
  const stageRef = useRef(null)
  const transformerRef = useRef(null)
  const pageWidth = page?.pageWidth || 612
  const pageHeight = page?.pageHeight || 792
  const activeFields = fields.filter((field) => field.target === target)

  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const node = selectedId ? stage.findOne(`#${selectedId}`) : null
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [selectedId, fields, target])

  const pointer = () => {
    const stage = stageRef.current
    const pos = stage?.getPointerPosition()
    if (!stage || !pos) return { x: 0, y: 0 }
    return { x: pos.x / zoom, y: pos.y / zoom }
  }

  return (
    <Box
      ref={viewportRef}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        backgroundColor: '#f0eeeb',
        backgroundImage: 'radial-gradient(circle, rgba(120, 113, 108, 0.28) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <Box
        sx={{
          minWidth: '100%',
          minHeight: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, md: 5 },
        }}
      >
        <Box
          sx={{
            width: pageWidth * zoom,
            height: pageHeight * zoom,
            bgcolor: 'common.white',
            boxShadow: '0 28px 80px rgba(28, 25, 23, 0.28)',
            outline: '1px solid rgba(28, 25, 23, 0.08)',
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
              if (event.target === stageRef.current) {
                onSelect(null)
              }
            }}
            onDblClick={(event) => {
              if (event.target === stageRef.current) onCreateBlank(pointer())
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
                  onClick={(event) => {
                    event.cancelBubble = true
                    onCreateFromText(text)
                  }}
                  onTap={(event) => {
                    event.cancelBubble = true
                    onCreateFromText(text)
                  }}
                />
              ))}

              {activeFields.map((field) => {
                const selected = selectedId === field.id
                return (
                  <React.Fragment key={field.id}>
                    <Rect
                      id={field.id}
                      x={field.x}
                      y={field.y}
                      width={field.width}
                      height={field.height}
                      fill={selected ? 'rgba(0, 167, 111, 0.12)' : 'rgba(0, 167, 111, 0.06)'}
                      stroke={selected ? '#00A76F' : 'rgba(0, 167, 111, 0.78)'}
                      strokeWidth={selected ? 1.5 : 1}
                      dash={selected ? [] : [4, 3]}
                      draggable
                      onClick={(event) => {
                        event.cancelBubble = true
                        onSelect(field.id)
                      }}
                      onTap={(event) => {
                        event.cancelBubble = true
                        onSelect(field.id)
                      }}
                      onDragEnd={(event) => onChange(field.id, { x: event.target.x(), y: event.target.y() })}
                      onTransformEnd={(event) => {
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
                      opacity={0.96}
                    />
                  </React.Fragment>
                )
              })}

              <Transformer
                ref={transformerRef}
                rotateEnabled={false}
                keepRatio={false}
                anchorSize={8}
                borderStroke="#00A76F"
                borderDash={[4, 2]}
                anchorStroke="#00A76F"
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

function EmptyCanvas({ target, onImport }) {
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
        bgcolor: '#f0eeeb',
        backgroundImage: 'radial-gradient(circle, rgba(120, 113, 108, 0.28) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <Box sx={{ maxWidth: 360 }}>
        <PictureAsPdfIcon sx={{ fontSize: 58, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Import the {TARGETS[target].label.toLowerCase()} PDF
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2 }}>
          The PDF becomes the locked print background. You will place labeled editable fields on top.
        </Typography>
        <Button variant="contained" startIcon={<UploadFileIcon />} onClick={onImport}>
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
  setTarget,
  setSelectedId,
  updateField,
  deleteSelected,
  sampleOutputs,
}) {
  const targetFields = fields.filter((field) => field.target === target)

  if (!selected) {
    return (
      <Box
        sx={{
          width: 64,
          borderLeft: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 1.5,
          gap: 1,
          transition: 'width 180ms ease',
          overflow: 'hidden',
        }}
      >
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

  return (
    <Box
      sx={{
        width: { xs: 320, md: 360 },
        borderLeft: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 180ms ease',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Template Fields</Typography>
            <Typography variant="caption" color="text.secondary">
              {targetFields.length} on this page
            </Typography>
          </Box>
          <Tooltip title="Delete field">
            <IconButton size="small" color="error" onClick={deleteSelected}>
              <DeleteIcon fontSize="small" />
            </IconButton>
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
          <TextField label="Form label" size="small" value={selected.label} onChange={(e) => updateField(selected.id, { label: e.target.value })} />
          <TextField label="Form key" size="small" value={selected.key} onChange={(e) => updateField(selected.id, { key: slugify(e.target.value) })} />
          <TextField label="Sample value" size="small" value={selected.sampleValue} onChange={(e) => updateField(selected.id, { sampleValue: e.target.value })} multiline minRows={2} />
          <TextField
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
            <TextField label="X" size="small" type="number" value={Math.round(selected.x * 100) / 100} onChange={(e) => updateField(selected.id, { x: Number(e.target.value) })} />
            <TextField label="Y" size="small" type="number" value={Math.round(selected.y * 100) / 100} onChange={(e) => updateField(selected.id, { y: Number(e.target.value) })} />
            <TextField label="Width" size="small" type="number" value={Math.round(selected.width * 100) / 100} onChange={(e) => updateField(selected.id, { width: Number(e.target.value) })} />
            <TextField label="Height" size="small" type="number" value={Math.round(selected.height * 100) / 100} onChange={(e) => updateField(selected.id, { height: Number(e.target.value) })} />
          </Box>

          <Divider />

          <TextField label="Font size" size="small" type="number" value={selected.fontSize} onChange={(e) => updateField(selected.id, { fontSize: Number(e.target.value) })} />
          <TextField select label="Font family" size="small" value={selected.fontFamily} onChange={(e) => updateField(selected.id, { fontFamily: e.target.value })}>
            {FONT_OPTIONS.map((font) => <MenuItem key={font.value} value={font.value}>{font.label}</MenuItem>)}
          </TextField>
          <TextField select label="Style" size="small" value={normalizeFontStyle(selected.fontStyle)} onChange={(e) => updateField(selected.id, { fontStyle: e.target.value })}>
            {['normal', 'bold', 'italic', 'bold italic'].map((style) => <MenuItem key={style} value={style}>{style}</MenuItem>)}
          </TextField>
          <TextField select label="Align" size="small" value={selected.align} onChange={(e) => updateField(selected.id, { align: e.target.value })}>
            {['left', 'center', 'right'].map((align) => <MenuItem key={align} value={align}>{align}</MenuItem>)}
          </TextField>
          <TextField label="Color" size="small" value={selected.fill} onChange={(e) => updateField(selected.id, { fill: e.target.value })} />
          <FormControlLabel
            control={<Switch checked={selected.required} onChange={(e) => updateField(selected.id, { required: e.target.checked })} />}
            label="Required before final PDF"
          />
          {selected.replacementTextId && (
            <Alert severity="success">This field replaces the clicked source PDF text during generation.</Alert>
          )}

          {sampleOutputs && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Latest Sample</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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

export default function ProductTemplateEditor({ product, onBack, onSaved }) {
  const [localProduct, setLocalProduct] = useState(product)
  const [target, setTarget] = useState('cover')
  const [fields, setFields] = useState(product?.printTemplate?.fields || [])
  const [selectedId, setSelectedId] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [autoFit, setAutoFit] = useState(true)
  const [uploading, setUploading] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const fileInputRef = useRef(null)
  const viewportRef = useRef(null)

  useEffect(() => {
    setLocalProduct(product)
    setFields(product?.printTemplate?.fields || [])
    setSelectedId(null)
    setAutoFit(true)
  }, [product])

  const template = localProduct?.printTemplate || {}
  const page = template[TARGETS[target].productKey]
  const selected = fields.find((field) => field.id === selectedId) || null
  const sampleOutputs = localProduct?.printTemplate?.sampleOutputs

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
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...changes } : field)))
  }

  const addField = (draft) => {
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
        fontFamily: draft.fontFamily || 'Canela',
        fontStyle: normalizeFontStyle(draft.fontStyle),
        fill: draft.fill || '#000000',
        align: draft.align || 'left',
        lineHeight: draft.lineHeight || 1.2,
        required: true,
        replacementTextId: draft.replacementTextId || null,
        replacementBox: draft.replacementBox || null,
      }
      return [...current, next]
    })
    setSelectedId(id)
  }

  const createFromText = (text) => {
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
      replacementTextId: text.id,
      replacementBox: {
        x: text.x,
        y: text.y,
        width: Math.max(text.width + 2, 4),
        height: Math.max(text.height + 2, 4),
      },
    })
  }

  const createBlank = ({ x, y }) => {
    addField({
      label: 'Personalized text',
      x,
      y,
      width: 220,
      height: 42,
      fontSize: 28,
      fontFamily: 'Canela',
    })
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
      form.append('kind', target === 'cover' ? 'cover' : 'interior')
      form.append('file', file)
      const { data } = await api.post(`/products/${localProduct._id}/template/import`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setLocalProduct(data)
      onSaved?.(data)
      setAutoFit(true)
      setMessage(`${TARGETS[target].label} imported`)
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
      const { data } = await api.patch(`/products/${localProduct._id}/template`, { fields })
      setLocalProduct(data)
      onSaved?.(data)
      if (!silent) setMessage('Template fields saved')
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template fields')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const generateSample = async () => {
    setGenerating(true)
    setError('')
    setMessage('')
    try {
      await saveFields({ silent: true })
      const { data } = await api.post(`/products/${localProduct._id}/template/sample`)
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
    if (!selectedId) return
    setFields((current) => current.filter((field) => field.id !== selectedId))
    setSelectedId(null)
  }

  const updateZoom = (next) => {
    setAutoFit(false)
    setZoom(Math.min(3, Math.max(0.08, Number(next.toFixed(3)))))
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 4,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f8f7f4',
      }}
    >
      <Box
        sx={{
          height: 58,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tooltip title="Back to product library">
          <IconButton onClick={onBack} size="small"><ArrowBackIcon /></IconButton>
        </Tooltip>
        <Box sx={{ minWidth: 0, width: { xs: 180, md: 280 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {localProduct?.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            #{localProduct?.listingId} - {fields.length} fields
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem />

        <Tabs
          value={target}
          onChange={(_, value) => {
            setTarget(value)
            setSelectedId(null)
            setAutoFit(true)
          }}
          sx={{ minHeight: 44 }}
        >
          <Tab value="cover" label={`Cover (${stats.cover})`} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 700 }} />
          <Tab value="interiorFirstPage" label={`Inside First Page (${stats.interior})`} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 700 }} />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Zoom out">
            <IconButton size="small" onClick={() => updateZoom(zoom - 0.08)}><ZoomOutIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Typography variant="caption" sx={{ width: 44, textAlign: 'center', fontFamily: 'monospace', color: 'text.secondary' }}>
            {Math.round(zoom * 100)}%
          </Typography>
          <Tooltip title="Zoom in">
            <IconButton size="small" onClick={() => updateZoom(zoom + 0.08)}><ZoomInIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Fit page to view">
            <IconButton
              size="small"
              color={autoFit ? 'primary' : 'default'}
              onClick={() => {
                setAutoFit(true)
                fitToView()
              }}
            >
              <FitScreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        <Divider orientation="vertical" flexItem />

        <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => saveFields()} disabled={saving}>
          {saving ? 'Saving' : 'Save'}
        </Button>
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={generateSample} disabled={generating || !fields.length}>
          {generating ? 'Generating' : 'Sample PDFs'}
        </Button>
      </Box>

      {(error || message || uploading || saving || generating) && (
        <Box sx={{ flexShrink: 0 }}>
          {(uploading || saving || generating) && <LinearProgress />}
          {error && <Alert severity="error" sx={{ borderRadius: 0 }}>{error}</Alert>}
          {message && <Alert severity="success" sx={{ borderRadius: 0 }}>{message}</Alert>}
        </Box>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        <Box
          sx={{
            width: 72,
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 1.5,
            gap: 0.75,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            hidden
            onChange={(event) => importPdf(event.target.files?.[0])}
          />
          <Tooltip title={`Import ${TARGETS[target].label} PDF`} placement="right">
            <IconButton sx={buttonRailSx(Boolean(uploading))} onClick={() => fileInputRef.current?.click()} disabled={Boolean(uploading)}>
              <UploadFileIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add manual text field" placement="right">
            <span>
              <IconButton sx={buttonRailSx(false)} onClick={addCenteredBlankField} disabled={!page?.previewImageUrl}>
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
              <IconButton sx={buttonRailSx(Boolean(generating))} onClick={generateSample} disabled={generating || !fields.length}>
                <PictureAsPdfIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Click existing text to replace it, or double-click blank space to add a field." placement="right">
            <IconButton sx={buttonRailSx(false)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {page?.previewImageUrl ? (
            <TemplateStage
              page={page}
              target={target}
              fields={fields}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onCreateFromText={createFromText}
              onCreateBlank={createBlank}
              onChange={updateField}
              zoom={zoom}
              viewportRef={viewportRef}
            />
          ) : (
            <EmptyCanvas target={target} onImport={() => fileInputRef.current?.click()} />
          )}
        </Box>

        <FieldPanel
          selected={selected}
          fields={fields}
          selectedId={selectedId}
          target={target}
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
