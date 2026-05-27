import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Slider,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AlignHorizontalLeftIcon from '@mui/icons-material/FormatAlignLeft'
import AlignHorizontalCenterIcon from '@mui/icons-material/FormatAlignCenter'
import AlignHorizontalRightIcon from '@mui/icons-material/FormatAlignRight'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import FitScreenIcon from '@mui/icons-material/FitScreenOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import PrintIcon from '@mui/icons-material/PrintOutlined'
import RedoIcon from '@mui/icons-material/Redo'
import SaveIcon from '@mui/icons-material/SaveOutlined'
import TextFieldsIcon from '@mui/icons-material/TextFieldsOutlined'
import UndoIcon from '@mui/icons-material/Undo'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined'
import ZoomInIcon from '@mui/icons-material/ZoomInOutlined'
import ZoomOutIcon from '@mui/icons-material/ZoomOutOutlined'
import StraightenIcon from '@mui/icons-material/StraightenOutlined'
import GridOnIcon from '@mui/icons-material/GridOnOutlined'
import OpacityIcon from '@mui/icons-material/OpacityOutlined'
import LayersIcon from '@mui/icons-material/LayersOutlined'
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer, Group } from 'react-konva'
import { v4 as uuidv4 } from 'uuid'
import api from '../lib/api'
import { buildAssetThumbnailUrl } from '../lib/assets'
import { toEtsy2GroupOrder } from '../lib/etsy2Orders'
import { FONT_OPTIONS, ensureFontFaces, normalizeFontStyle } from '../lib/fonts'
import { getFittedTextProps } from '../lib/textFitting'
import LuluGeometryOverlay from '../components/products/LuluGeometryOverlay'

const CANVAS_STATE_KEY = '_canvasEditorState'
const CANVAS_PDF_KEY = '_canvasPdfDataUrl'
const DEFAULT_PAGE = { width: 612, height: 792 }

const isImageUrl = (value = '') => /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value)
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0))
const inches = (points) => Number((Number(points || 0) / 72).toFixed(2))
const points = (value) => Number(value || 0) * 72
const fontOptionsFor = (value) => (
  value && !FONT_OPTIONS.some((font) => font.value === value)
    ? [{ label: value, value, weight: 400, style: 'normal' }, ...FONT_OPTIONS]
    : FONT_OPTIONS
)

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
    return () => {
      cancelled = true
    }
  }, [src])

  return image
}

function parseSavedState(orderItem) {
  const raw = orderItem?.templateFieldValues?.[CANVAS_STATE_KEY]
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.layers?.length ? parsed : null
  } catch {
    return null
  }
}

function defaultLayers(orderItem, order, page = DEFAULT_PAGE, decomposedPage = null) {
  const backgroundUrl = decomposedPage?.previewImageUrl ||
    (orderItem?.coverImageUrl && isImageUrl(orderItem.coverImageUrl)
      ? buildAssetThumbnailUrl(orderItem.coverImageUrl, 1400)
      : '')

  const textLayers = (decomposedPage?.extractedText || [])
    .filter((text) => String(text.text || '').trim())
    .map((text, index) => ({
      id: text.id || uuidv4(),
      type: 'text',
      name: index === 0 ? 'Text Layer' : `Text Layer ${index + 1}`,
      visible: true,
      locked: false,
      text: text.text,
      x: text.x,
      y: text.y,
      width: Math.max(40, text.width || 180),
      height: Math.max(18, text.height || text.fontSize || 24),
      rotation: text.rotation || 0,
      opacity: 1,
      fontFamily: text.rawFontFamily || text.fontFamily || 'Arial',
      fontSize: text.fontSize || 24,
      fill: text.fill || '#2F2F2F',
      align: text.align || 'left',
      fontStyle: normalizeFontStyle(text.fontStyle),
      lineHeight: 1.15,
      maskOriginal: true,
      writingMode: text.writingMode || 'horizontal',
      rawFontFamily: text.rawFontFamily || text.fontFamily || '',
      dirty: false,
    }))

  const fallbackTextLayers = [
    {
      id: uuidv4(),
      type: 'text',
      name: 'Text Layer',
      visible: true,
      locked: false,
      text: orderItem?.templateFieldValues?.front_cover_name || order?.buyerName || orderItem?.customerName || 'Customer Name',
      x: 76,
      y: 92,
      width: 460,
      height: 78,
      rotation: 0,
      opacity: 1,
      fontFamily: 'Canela Regular',
      fontSize: 54,
      fill: '#2F2F2F',
      align: 'center',
      fontStyle: 'normal',
      lineHeight: 1.15,
      dirty: true,
    },
    {
      id: uuidv4(),
      type: 'text',
      name: 'Subtitle',
      visible: true,
      locked: false,
      text: orderItem?.templateFieldValues?.back_cover_text || 'BLOOM WHERE YOU ARE PLANTED',
      x: 96,
      y: 644,
      width: 420,
      height: 28,
      rotation: 0,
      opacity: 1,
      fontFamily: 'Canela Text Regular',
      fontSize: 14,
      fill: '#3F3F46',
      align: 'center',
      fontStyle: 'normal',
      lineHeight: 1.2,
      dirty: true,
    },
  ]

  return [
    {
      id: 'background',
      type: 'background',
      name: 'Background Image',
      visible: true,
      locked: true,
      x: 0,
      y: 0,
      width: page.width,
      height: page.height,
      rotation: 0,
      opacity: 1,
      url: backgroundUrl,
    },
    ...(textLayers.length ? textLayers : fallbackTextLayers),
  ]
}

function imagePdfDataUrl(jpegDataUrl, pageWidth, pageHeight) {
  const jpegBinary = atob(jpegDataUrl.split(',')[1] || '')
  const jpegBytes = new Uint8Array(jpegBinary.length)
  for (let i = 0; i < jpegBinary.length; i += 1) jpegBytes[i] = jpegBinary.charCodeAt(i)

  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`
  const enc = new TextEncoder()
  const parts = []
  const offsets = [0]
  let length = 0

  const pushText = (text) => {
    const bytes = enc.encode(text)
    parts.push(bytes)
    length += bytes.length
  }
  const pushBytes = (bytes) => {
    parts.push(bytes)
    length += bytes.length
  }
  const mark = () => offsets.push(length)

  pushText('%PDF-1.3\n')
  mark(); pushText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  mark(); pushText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  mark(); pushText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`)
  mark(); pushText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pageWidth * 2} /Height ${pageHeight * 2} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
  pushBytes(jpegBytes)
  pushText('\nendstream\nendobj\n')
  mark(); pushText(`5 0 obj\n<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`)
  const xref = length
  pushText(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`)

  const blob = new Blob(parts, { type: 'application/pdf' })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

function LayerRow({ layer, active, onSelect, onToggleVisibility }) {
  return (
    <Box
      onClick={onSelect}
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: active ? '#C4B5FD' : '#E5E7EB',
        bgcolor: active ? '#F7F4FF' : '#FFFFFF',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        cursor: 'pointer',
      }}
    >
      {layer.type === 'text' ? <TextFieldsIcon sx={{ color: '#475569' }} /> : <ImageOutlinedIcon sx={{ color: '#475569' }} />}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ color: '#334155', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {layer.name}
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {layer.type === 'text' ? layer.text : 'PDF background'}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={(event) => {
          event.stopPropagation()
          onToggleVisibility()
        }}
      >
        {layer.visible ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
      </IconButton>
    </Box>
  )
}

function ImageCanvasNode({ layer, setSelectedId, updateLayer }) {
  const image = useLoadedImage(layer.url)

  if (!image) {
    return (
      <Rect
        id={layer.id}
        x={layer.x}
        y={layer.y}
        width={layer.width}
        height={layer.height}
        rotation={layer.rotation}
        opacity={layer.opacity}
        fill="rgba(91, 33, 214, 0.08)"
        stroke="#5B21D6"
        dash={[6, 4]}
        draggable={!layer.locked}
        onClick={(event) => {
          event.cancelBubble = true
          setSelectedId(layer.id)
        }}
        onTap={(event) => {
          event.cancelBubble = true
          setSelectedId(layer.id)
        }}
        onDragEnd={(event) => updateLayer(layer.id, { x: event.target.x(), y: event.target.y() })}
        onTransformEnd={(event) => {
          const node = event.target
          const scaleX = node.scaleX()
          const scaleY = node.scaleY()
          node.scaleX(1)
          node.scaleY(1)
          updateLayer(layer.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(12, layer.width * scaleX),
            height: Math.max(12, layer.height * scaleY),
            rotation: node.rotation(),
          })
        }}
      />
    )
  }

  return (
    <KonvaImage
      id={layer.id}
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable={!layer.locked}
      onClick={(event) => {
        event.cancelBubble = true
        setSelectedId(layer.id)
      }}
      onTap={(event) => {
        event.cancelBubble = true
        setSelectedId(layer.id)
      }}
      onDragEnd={(event) => updateLayer(layer.id, { x: event.target.x(), y: event.target.y() })}
      onTransformEnd={(event) => {
        const node = event.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        updateLayer(layer.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(12, layer.width * scaleX),
          height: Math.max(12, layer.height * scaleY),
          rotation: node.rotation(),
        })
      }}
    />
  )
}

function CanvasStage({
  layers,
  selectedId,
  setSelectedId,
  updateLayer,
  zoom,
  stageRef,
  page,
  geometry,
  alignmentImageUrl,
  showAlignment,
  showGuides,
  showRulers,
  measurementUnit,
  alignmentOpacity = 0.62,
  backgroundOpacity = 1,
}) {
  const background = layers.find((layer) => layer.type === 'background')
  const backgroundImage = useLoadedImage(background?.visible ? background.url : '')
  const alignmentImage = useLoadedImage(alignmentImageUrl)
  const selectedLayer = layers.find((layer) => layer.id === selectedId) || null
  const transformerRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    const transformer = transformerRef.current
    if (!stage || !transformer) return
    const selected = layers.find((layer) => layer.id === selectedId && !layer.locked)
    const node = selected ? stage.findOne(`#${selectedId}`) : null
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [layers, selectedId, stageRef])

  return (
    <Box sx={{ flex: 1, minWidth: 0, bgcolor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', p: 3 }}>
      <Box sx={{ bgcolor: '#374151', px: 8, py: 3, minHeight: page.height * zoom + 48 }}>
        <Paper sx={{ width: page.width * zoom, height: page.height * zoom, borderRadius: 0, overflow: 'hidden', boxShadow: '0 24px 55px rgba(15, 23, 42, 0.24)' }}>
          <Stage
            ref={stageRef}
            width={page.width * zoom}
            height={page.height * zoom}
            scaleX={zoom}
            scaleY={zoom}
            onMouseDown={(event) => {
              if (event.target === event.target.getStage()) setSelectedId(null)
            }}
            onTouchStart={(event) => {
              if (event.target === event.target.getStage()) setSelectedId(null)
            }}
          >
            <Layer>
              <Rect x={0} y={0} width={page.width} height={page.height} fill="#FBF7EF" />
              {showAlignment && alignmentImage && (
                <KonvaImage name="lulu-alignment-backlayer" image={alignmentImage} x={0} y={0} width={page.width} height={page.height} opacity={alignmentOpacity} listening={false} />
              )}
              {background?.visible && backgroundImage && (
                <KonvaImage image={backgroundImage} x={0} y={0} width={page.width} height={page.height} opacity={(background.opacity ?? 1) * backgroundOpacity} listening={false} />
              )}
              {background?.visible && !backgroundImage && (
                <Rect x={50} y={50} width={page.width - 100} height={page.height - 100} fill="rgba(255,255,255,0.52)" listening={false} />
              )}

              <LuluGeometryOverlay
                geometry={geometry}
                page={page}
                selectedBox={selectedLayer}
                showGuides={showGuides}
                showRulers={showRulers}
                unit={measurementUnit}
              />

              {layers.filter((layer) => layer.type !== 'background' && (layer.visible || (layer.maskOriginal && layer.dirty))).map((layer) => (
                layer.type === 'image' ? (
                  <ImageCanvasNode key={layer.id} layer={layer} setSelectedId={setSelectedId} updateLayer={updateLayer} />
                ) : (
                  <Group key={layer.id}>
                    {layer.maskOriginal && layer.dirty && (
                      <Rect
                        key={`${layer.id}-mask`}
                        x={layer.x - 2}
                        y={layer.y - 2}
                        width={Math.max(8, layer.width + 4)}
                        height={Math.max(8, layer.height + 4)}
                        rotation={layer.rotation}
                        fill="#FBF7EF"
                        opacity={0.98}
                        listening={false}
                      />
                    )}
                    {layer.dirty && layer.visible ? (() => {
                      const fittedText = getFittedTextProps(layer, layer.text)
                      return (
                        <Text
                          id={layer.id}
                          x={layer.x}
                          y={layer.y}
                          width={layer.width}
                          height={fittedText.height}
                          text={layer.text}
                          fontSize={fittedText.fontSize}
                          fontFamily={layer.fontFamily}
                          fontStyle={normalizeFontStyle(layer.fontStyle)}
                          fill={layer.fill}
                          align={layer.align}
                          lineHeight={layer.lineHeight}
                          wrap={fittedText.wrap}
                          rotation={layer.rotation}
                          opacity={layer.opacity}
                          draggable={!layer.locked}
                          onClick={(event) => {
                            event.cancelBubble = true
                            setSelectedId(layer.id)
                          }}
                          onTap={(event) => {
                            event.cancelBubble = true
                            setSelectedId(layer.id)
                          }}
                          onDragEnd={(event) => updateLayer(layer.id, { x: event.target.x(), y: event.target.y() })}
                          onTransformEnd={(event) => {
                            const node = event.target
                            const scaleX = node.scaleX()
                            const scaleY = node.scaleY()
                            node.scaleX(1)
                            node.scaleY(1)
                            updateLayer(layer.id, {
                              x: node.x(),
                              y: node.y(),
                              width: Math.max(12, layer.width * scaleX),
                              height: Math.max(12, layer.height * scaleY),
                              rotation: node.rotation(),
                              fontSize: Math.max(6, layer.fontSize * scaleY),
                            })
                          }}
                        />
                      )
                    })() : (
                      <Rect
                        id={layer.id}
                        x={layer.x}
                        y={layer.y}
                        width={Math.max(8, layer.width)}
                        height={Math.max(8, layer.height)}
                        rotation={layer.rotation}
                        fill="rgba(91, 33, 214, 0.001)"
                        stroke={selectedId === layer.id ? '#5B21D6' : 'rgba(91, 33, 214, 0.18)'}
                        dash={selectedId === layer.id ? [] : [4, 4]}
                        opacity={layer.visible ? 1 : 0.35}
                        draggable={!layer.locked}
                        onClick={(event) => {
                          event.cancelBubble = true
                          setSelectedId(layer.id)
                        }}
                        onTap={(event) => {
                          event.cancelBubble = true
                          setSelectedId(layer.id)
                        }}
                        onDragEnd={(event) => updateLayer(layer.id, { x: event.target.x(), y: event.target.y() })}
                        onTransformEnd={(event) => {
                          const node = event.target
                          const scaleX = node.scaleX()
                          const scaleY = node.scaleY()
                          node.scaleX(1)
                          node.scaleY(1)
                          updateLayer(layer.id, {
                            x: node.x(),
                            y: node.y(),
                            width: Math.max(12, layer.width * scaleX),
                            height: Math.max(12, layer.height * scaleY),
                            rotation: node.rotation(),
                            dirty: true,
                          })
                        }}
                      />
                    )}
                  </Group>
                )
              ))}

              <Transformer
                ref={transformerRef}
                keepRatio={false}
                rotateEnabled
                anchorSize={9}
                borderStroke="#5B21D6"
                anchorStroke="#5B21D6"
                anchorFill="#FFFFFF"
                boundBoxFunc={(oldBox, newBox) => (newBox.width < 8 || newBox.height < 8 ? oldBox : newBox)}
              />
            </Layer>
          </Stage>
        </Paper>
      </Box>
    </Box>
  )
}

function PropertiesPanel({ selected, updateLayer }) {
  if (!selected) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>Properties</Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mt: 1 }}>Select a layer to edit its text, typography, color, position, size, rotation, and opacity.</Typography>
      </Box>
    )
  }

  const disabled = selected.locked

  return (
    <Box sx={{ p: 3, overflowY: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        {selected.type === 'text' ? <TextFieldsIcon /> : <ImageOutlinedIcon />}
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A' }}>{selected.name}</Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />

      {selected.type === 'text' && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>Content</Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Text"
            value={selected.text}
            disabled={disabled}
            onChange={(event) => updateLayer(selected.id, { text: event.target.value })}
            sx={{ mb: 2 }}
          />

          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>Typography</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 86px', gap: 1, mb: 1.25 }}>
            <TextField
              select
              label="Font"
              value={selected.fontFamily}
              disabled={disabled}
              onChange={(event) => updateLayer(selected.id, { fontFamily: event.target.value })}
            >
              {fontOptionsFor(selected.fontFamily).map((font) => (
                <MenuItem key={font.value} value={font.value}>{font.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Size"
              type="number"
              value={Math.round(selected.fontSize)}
              disabled={disabled}
              onChange={(event) => updateLayer(selected.id, { fontSize: clamp(event.target.value, 6, 220) })}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
            <TextField
              label="Color"
              value={selected.fill}
              disabled={disabled}
              onChange={(event) => updateLayer(selected.id, { fill: event.target.value })}
              slotProps={{
                input: {
                  startAdornment: (
                    <Box component="input" type="color" value={selected.fill} disabled={disabled} onChange={(event) => updateLayer(selected.id, { fill: event.target.value })} sx={{ width: 34, height: 32, border: 0, mr: 1, bgcolor: 'transparent' }} />
                  ),
                },
              }}
            />
            <ToggleButtonGroup
              exclusive
              value={selected.align}
              disabled={disabled}
              onChange={(_, value) => value && updateLayer(selected.id, { align: value })}
              sx={{ height: 56 }}
            >
              <ToggleButton value="left"><AlignHorizontalLeftIcon /></ToggleButton>
              <ToggleButton value="center"><AlignHorizontalCenterIcon /></ToggleButton>
              <ToggleButton value="right"><AlignHorizontalRightIcon /></ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </>
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>Transform</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, mb: 1.5 }}>
        <TextField label="X" value={inches(selected.x)} disabled={disabled} onChange={(event) => updateLayer(selected.id, { x: points(event.target.value) })} slotProps={{ input: { endAdornment: <Typography variant="caption">in</Typography> } }} />
        <TextField label="Y" value={inches(selected.y)} disabled={disabled} onChange={(event) => updateLayer(selected.id, { y: points(event.target.value) })} slotProps={{ input: { endAdornment: <Typography variant="caption">in</Typography> } }} />
        <TextField label="Width" value={inches(selected.width)} disabled={disabled} onChange={(event) => updateLayer(selected.id, { width: Math.max(8, points(event.target.value)) })} slotProps={{ input: { endAdornment: <Typography variant="caption">in</Typography> } }} />
        <TextField label="Height" value={inches(selected.height)} disabled={disabled} onChange={(event) => updateLayer(selected.id, { height: Math.max(8, points(event.target.value)) })} slotProps={{ input: { endAdornment: <Typography variant="caption">in</Typography> } }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '82px 1fr', gap: 1.5, alignItems: 'center', mb: 2.5 }}>
        <TextField label="Rotation" value={Math.round(selected.rotation || 0)} disabled={disabled} onChange={(event) => updateLayer(selected.id, { rotation: Number(event.target.value) || 0 })} />
        <Slider value={selected.rotation || 0} min={-180} max={180} disabled={disabled} onChange={(_, value) => updateLayer(selected.id, { rotation: value })} />
      </Box>

      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1 }}>Layer</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 1.5, alignItems: 'center' }}>
        <Slider value={Math.round((selected.opacity ?? 1) * 100)} min={0} max={100} disabled={disabled} onChange={(_, value) => updateLayer(selected.id, { opacity: value / 100 })} />
        <TextField value={`${Math.round((selected.opacity ?? 1) * 100)}%`} disabled />
      </Box>
    </Box>
  )
}

export default function Etsy2CanvasEditorPage() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const stageRef = useRef(null)
  const imageInputRef = useRef(null)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [decomposing, setDecomposing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [layers, setLayers] = useState([])
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE)
  const [selectedId, setSelectedId] = useState(null)
  const [history, setHistory] = useState([])
  const [future, setFuture] = useState([])
  const [zoom, setZoom] = useState(1)
  const [pageGeometry, setPageGeometry] = useState(null)
  const [showAlignment, setShowAlignment] = useState(true)
  const [showGuides, setShowGuides] = useState(true)
  const [showRulers, setShowRulers] = useState(true)
  const [measurementUnit, setMeasurementUnit] = useState('in')
  const [alignmentOpacity, setAlignmentOpacity] = useState(0.62)
  const [backgroundOpacity, setBackgroundOpacity] = useState(1)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchGroup = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/orders/group/${encodeURIComponent(orderId)}`)
      setGroup(data)
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to load order', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    ensureFontFaces()
    fetchGroup()
  }, [fetchGroup])

  const order = useMemo(() => (group ? toEtsy2GroupOrder(group) : null), [group])
  const orderItem = useMemo(() => {
    if (!group?.items?.length) return null
    const itemId = searchParams.get('itemId')
    return group.items.find((item) => String(item._id) === itemId) ||
      group.items.find((item) => item.coverImageUrl || item.interiorPdfUrl) ||
      group.items[0]
  }, [group, searchParams])
  const selected = layers.find((layer) => layer.id === selectedId) || null
  const backToGeneratedPath = searchParams.get('source') === 'generated'
    ? `/orders/generated/${encodeURIComponent(orderId)}`
    : `/orders/etsy2/${encodeURIComponent(orderId)}?view=generated`

  useEffect(() => {
    if (!orderItem || !order) return
    const saved = parseSavedState(orderItem)
    const savedHasBackground = saved?.layers?.some((layer) => layer.type === 'background' && layer.url)
    if (saved && savedHasBackground) {
      setPageSize(saved.page || DEFAULT_PAGE)
      setLayers(saved.layers)
      setPageGeometry(saved.geometry || null)
      setShowAlignment(saved.settings?.showAlignment ?? true)
      setShowGuides(saved.settings?.showGuides ?? true)
      setShowRulers(saved.settings?.showRulers ?? true)
      setMeasurementUnit(saved.settings?.measurementUnit || 'in')
      setAlignmentOpacity(saved.settings?.alignmentOpacity ?? 0.62)
      setBackgroundOpacity(saved.settings?.backgroundOpacity ?? 1)
      setSelectedId((saved.layers || []).find((layer) => layer.type === 'text')?.id || '')
      setHistory([])
      setFuture([])
      return
    }

    let cancelled = false
    const kind = searchParams.get('kind') === 'interior' || (!orderItem.coverImageUrl && orderItem.interiorPdfUrl) ? 'interior' : 'cover'
    setDecomposing(true)
    api.get(`/orders/${orderItem._id}/generated-pdf-page`, { params: { kind } })
      .then(({ data }) => {
        if (cancelled) return
        const page = data.page || null
        const nextPage = page?.pageWidth && page?.pageHeight
          ? { width: page.pageWidth, height: page.pageHeight }
          : DEFAULT_PAGE
        setPageSize(nextPage)
        setPageGeometry(kind === 'cover' ? data.alignment || data.geometry || null : null)
        const nextLayers = defaultLayers(orderItem, order, nextPage, page)
        setLayers(nextLayers)
        setSelectedId(nextLayers.find((layer) => layer.type === 'text')?.id || '')
      })
      .catch((err) => {
        if (cancelled) return
        setPageSize(DEFAULT_PAGE)
        setPageGeometry(null)
        const nextLayers = defaultLayers(orderItem, order, DEFAULT_PAGE)
        setLayers(nextLayers)
        setSelectedId(nextLayers.find((layer) => layer.type === 'text')?.id || '')
        setSnack({
          open: true,
          message: err.response?.data?.message || 'Could not extract the generated PDF. Showing editable fallback layers.',
          severity: 'warning',
        })
      })
      .finally(() => {
        if (!cancelled) setDecomposing(false)
      })
    setHistory([])
    setFuture([])
    return () => {
      cancelled = true
    }
  }, [orderItem, order, searchParams])

  const commitLayers = (updater) => {
    setLayers((current) => {
      setHistory((items) => [...items.slice(-29), current])
      setFuture([])
      return typeof updater === 'function' ? updater(current) : updater
    })
  }

  const updateLayer = (id, changes) => {
    commitLayers((current) => current.map((layer) => (
      layer.id === id && (!layer.locked || Object.keys(changes).every((key) => key === 'visible'))
        ? { ...layer, dirty: layer.type === 'text' ? true : layer.dirty, ...changes }
        : layer
    )))
  }

  const addTextLayer = () => {
    const id = uuidv4()
    commitLayers((current) => [
      ...current,
      {
        id,
        type: 'text',
        name: 'Text Layer',
        visible: true,
        locked: false,
        text: 'New text',
        x: 156,
        y: 220,
        width: 300,
        height: 48,
        rotation: 0,
        opacity: 1,
        fontFamily: 'Canela Regular',
        fontSize: 34,
        fill: '#2F2F2F',
        align: 'center',
        fontStyle: 'normal',
        lineHeight: 1.15,
      },
    ])
    setSelectedId(id)
  }

  const addImageLayer = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const id = uuidv4()
      commitLayers((current) => [
        ...current,
        {
          id,
          type: 'image',
          name: file.name?.replace(/\.[^.]+$/, '') || 'Image Layer',
          visible: true,
          locked: false,
          url: reader.result,
          x: 176,
          y: 260,
          width: 260,
          height: 180,
          rotation: 0,
          opacity: 1,
        },
      ])
      setSelectedId(id)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const deleteSelected = () => {
    if (!selected || selected.locked) return
    commitLayers((current) => current.filter((layer) => layer.id !== selected.id))
    setSelectedId('')
  }

  const moveSelected = (direction) => {
    if (!selected || selected.locked) return
    commitLayers((current) => {
      const index = current.findIndex((layer) => layer.id === selected.id)
      const nextIndex = direction === 'up' ? Math.min(current.length - 1, index + 1) : Math.max(1, index - 1)
      if (index === nextIndex) return current
      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      return next
    })
  }

  const undo = () => {
    if (!history.length) return
    const previous = history[history.length - 1]
    setFuture((items) => [layers, ...items])
    setHistory((items) => items.slice(0, -1))
    setLayers(previous)
  }

  const redo = () => {
    if (!future.length) return
    const next = future[0]
    setHistory((items) => [...items, layers])
    setFuture((items) => items.slice(1))
    setLayers(next)
  }

  const exportPdfDataUrl = async () => {
    const stage = stageRef.current
    if (!stage) return ''
    const overlayNodes = [
      ...stage.find('.lulu-geometry-overlay'),
      ...stage.find('.lulu-alignment-backlayer'),
    ]
    overlayNodes.forEach((node) => node.hide())
    stage.batchDraw()
    const jpeg = stage.toDataURL({ mimeType: 'image/jpeg', quality: 0.94, pixelRatio: 2 / zoom })
    overlayNodes.forEach((node) => node.show())
    stage.batchDraw()
    return imagePdfDataUrl(jpeg, Math.round(pageSize.width), Math.round(pageSize.height))
  }

  const saveCanvas = async () => {
    if (!orderItem?._id) return
    setSaving(true)
    try {
      const pdfDataUrl = await exportPdfDataUrl()
      const state = {
        version: 1,
        page: pageSize,
        savedAt: new Date().toISOString(),
        orderId,
        itemId: String(orderItem._id),
        layers,
        geometry: pageGeometry,
        settings: { showAlignment, showGuides, showRulers, measurementUnit, alignmentOpacity, backgroundOpacity },
      }
      const templateFieldValues = {
        ...(orderItem.templateFieldValues || {}),
        [CANVAS_STATE_KEY]: JSON.stringify(state),
        [CANVAS_PDF_KEY]: pdfDataUrl,
      }
      await api.patch(`/orders/${orderItem._id}`, { templateFieldValues })
      setSnack({ open: true, message: 'Canvas PDF saved for this customer order.', severity: 'success' })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to save canvas changes', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = async () => {
    const pdfDataUrl = await exportPdfDataUrl()
    if (!pdfDataUrl) return
    const link = document.createElement('a')
    link.href = pdfDataUrl
    link.download = `order-${orderId}-canvas.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!order || !orderItem) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backToGeneratedPath)}>Back to Generated Orders</Button>
        <Alert severity="error" sx={{ mt: 2 }}>Order item not found.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1.5, p: { xs: 1.25, md: 2 }, bgcolor: '#FFFFFF' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backToGeneratedPath)} sx={{ color: '#5B21D6', fontWeight: 800, textTransform: 'none', mb: 1 }}>
            Back to Generated Orders
          </Button>
          <Typography variant="h4" sx={{ color: '#0F172A', fontWeight: 900, fontSize: { xs: '1.7rem', md: '2.25rem' } }}>
            Canvas PDF Editor
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Edit the customer-specific PDF design for order #{orderId}.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip title="Undo"><span><IconButton disabled={!history.length} onClick={undo}><UndoIcon /></IconButton></span></Tooltip>
          <Tooltip title="Redo"><span><IconButton disabled={!future.length} onClick={redo}><RedoIcon /></IconButton></span></Tooltip>
          <Button variant="outlined" onClick={() => navigate(backToGeneratedPath)} sx={{ minWidth: 126, borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}>Cancel</Button>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} onClick={saveCanvas} disabled={saving} sx={{ minWidth: 160, bgcolor: '#5B21D6', borderRadius: '6px', fontWeight: 800, '&:hover': { bgcolor: '#4C1D95' } }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '250px minmax(0, 1fr) 360px' }, gap: 2, minHeight: 0, flex: 1 }}>
        <Paper sx={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2 }}>
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(event) => addImageLayer(event.target.files?.[0])} />
            <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', mb: 2 }}>Layers</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {[...layers].reverse().map((layer) => (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  active={layer.id === selectedId}
                  onSelect={() => setSelectedId(layer.id)}
                  onToggleVisibility={() => updateLayer(layer.id, { visible: !layer.visible })}
                />
              ))}
            </Box>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1 }}>
            <Tooltip title="Add text"><IconButton onClick={addTextLayer}><TextFieldsIcon /></IconButton></Tooltip>
            <Tooltip title="Add image"><IconButton onClick={() => imageInputRef.current?.click()}><ImageOutlinedIcon /></IconButton></Tooltip>
            <Tooltip title="Move layer up"><span><IconButton disabled={!selected || selected.locked} onClick={() => moveSelected('up')}><KeyboardArrowUpIcon /></IconButton></span></Tooltip>
            <Tooltip title="Move layer down"><span><IconButton disabled={!selected || selected.locked} onClick={() => moveSelected('down')}><KeyboardArrowDownIcon /></IconButton></span></Tooltip>
            <Tooltip title="Delete layer"><span><IconButton disabled={!selected || selected.locked} onClick={deleteSelected}><DeleteOutlineIcon /></IconButton></span></Tooltip>
          </Box>
        </Paper>

        <Paper sx={{ position: 'relative', borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {decomposing && (
            <Box sx={{ position: 'absolute', inset: 0, zIndex: 8, bgcolor: 'rgba(248,250,252,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Paper sx={{ px: 2, py: 1.5, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 1.25, boxShadow: '0 12px 34px rgba(15,23,42,0.16)' }}>
                <CircularProgress size={18} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0F172A' }}>Extracting generated PDF</Typography>
              </Paper>
            </Box>
          )}
          {selected?.type === 'text' && (
            <Paper
              sx={{
                position: { xl: 'absolute' },
                zIndex: 4,
                alignSelf: 'center',
                mt: 2,
                p: 1.25,
                borderRadius: '10px',
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
                alignItems: 'center',
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14)',
              }}
            >
              <TextField select size="small" label="Font" value={selected.fontFamily} onChange={(event) => updateLayer(selected.id, { fontFamily: event.target.value })} sx={{ width: 190 }}>
                {fontOptionsFor(selected.fontFamily).map((font) => <MenuItem key={font.value} value={font.value}>{font.label}</MenuItem>)}
              </TextField>
              <TextField size="small" label="Size" type="number" value={Math.round(selected.fontSize)} onChange={(event) => updateLayer(selected.id, { fontSize: clamp(event.target.value, 6, 220) })} sx={{ width: 92 }} />
              <Box component="input" type="color" value={selected.fill} onChange={(event) => updateLayer(selected.id, { fill: event.target.value })} sx={{ width: 48, height: 40, border: '1px solid #E5E7EB', borderRadius: '6px', bgcolor: '#FFFFFF' }} />
              <ToggleButtonGroup exclusive size="small" value={selected.align} onChange={(_, value) => value && updateLayer(selected.id, { align: value })}>
                <ToggleButton value="left"><AlignHorizontalLeftIcon /></ToggleButton>
                <ToggleButton value="center"><AlignHorizontalCenterIcon /></ToggleButton>
                <ToggleButton value="right"><AlignHorizontalRightIcon /></ToggleButton>
              </ToggleButtonGroup>
            </Paper>
          )}

          <CanvasStage
            layers={layers}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            updateLayer={updateLayer}
            zoom={zoom}
            stageRef={stageRef}
            page={pageSize}
            geometry={pageGeometry?.geometry || pageGeometry}
            alignmentImageUrl={pageGeometry?.svgDataUrl || ''}
            showAlignment={showAlignment}
            showGuides={showGuides}
            showRulers={showRulers}
            measurementUnit={measurementUnit}
            alignmentOpacity={alignmentOpacity}
            backgroundOpacity={backgroundOpacity}
          />

          <Box sx={{ p: 1.25, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <ButtonGroup variant="outlined" sx={{ bgcolor: '#FFFFFF', boxShadow: '0 8px 24px rgba(15,23,42,0.10)', borderRadius: '8px' }}>
                <Button disabled>{1}</Button>
                <Button disabled>/ 1</Button>
                <Button color={showAlignment ? 'primary' : 'inherit'} disabled={!pageGeometry?.svgDataUrl} onClick={() => setShowAlignment((value) => !value)} title={showAlignment ? 'Hide Lulu alignment backlayer' : 'Show Lulu alignment backlayer'}><LayersIcon /></Button>
                <Button color={showGuides ? 'primary' : 'inherit'} onClick={() => setShowGuides((value) => !value)} title={showGuides ? 'Hide Lulu cover guides' : 'Show Lulu cover guides'}><StraightenIcon /></Button>
                <Button color={showRulers ? 'primary' : 'inherit'} onClick={() => setShowRulers((value) => !value)} title={showRulers ? 'Hide rulers' : 'Show rulers'}><GridOnIcon /></Button>
                <Button onClick={() => setMeasurementUnit((value) => (value === 'in' ? 'pt' : 'in'))}>{measurementUnit}</Button>
                <Button onClick={() => setZoom((value) => Math.max(0.35, Number((value - 0.1).toFixed(2))))}><ZoomOutIcon /></Button>
                <Button disabled>{Math.round(zoom * 100)}%</Button>
                <Button onClick={() => setZoom((value) => Math.min(2.2, Number((value + 0.1).toFixed(2))))}><ZoomInIcon /></Button>
                <Button onClick={() => setZoom(1)}><FitScreenIcon /></Button>
                <Button onClick={downloadPdf}><DownloadIcon /></Button>
                <Button onClick={() => window.print()}><PrintIcon /></Button>
              </ButtonGroup>
              <Paper sx={{ width: 128, px: 1.25, py: 0.6, borderRadius: '8px', display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}>
                <LayersIcon fontSize="small" color="action" />
                <Slider size="small" value={Math.round(alignmentOpacity * 100)} min={15} max={100} disabled={!pageGeometry?.svgDataUrl} onChange={(_, value) => setAlignmentOpacity(Number(value) / 100)} />
              </Paper>
              <Paper sx={{ width: 128, px: 1.25, py: 0.6, borderRadius: '8px', display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1, boxShadow: '0 8px 24px rgba(15,23,42,0.10)' }}>
                <OpacityIcon fontSize="small" color="action" />
                <Slider size="small" value={Math.round(backgroundOpacity * 100)} min={20} max={100} onChange={(_, value) => setBackgroundOpacity(Number(value) / 100)} />
              </Paper>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none', overflow: 'hidden' }}>
          <PropertiesPanel selected={selected} updateLayer={updateLayer} />
        </Paper>
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((current) => ({ ...current, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnack((current) => ({ ...current, open: false }))} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
