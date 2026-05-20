import { useState, useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Drawer from '@mui/material/Drawer'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import { alpha } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import DesignServicesIcon from '@mui/icons-material/DesignServicesOutlined'
import api from '../../lib/api'
import { buildAssetThumbnailUrl } from '../../lib/assets'
import StatusBadge from './StatusBadge'
import LuluReviewDialog from './LuluReviewDialog'
import AssetInputField from '../common/AssetInputField'
import { ETSY_ORDER_STATUSES } from '../../lib/constants'
import TemplatePersonalizationDialog from './TemplatePersonalizationDialog'

const DEFAULT_TEMPLATE_POLICY = { cover: 'inherit', interior: 'inherit', fields: 'inherit' }
const variantId = (variant) => String(variant?._id || variant?.id || '')
const resolveEffectiveTemplateFields = (product, order) => {
  const baseFields = product?.printTemplate?.fields || []
  const variantKey = order?.matchedVariantId || order?.matchedVariantName
  const variant = product?.variants?.find((item) =>
    variantId(item) === String(variantKey || '') || item.name === variantKey
  )
  const policy = { ...DEFAULT_TEMPLATE_POLICY, ...(variant?.templatePolicy || {}) }
  if (variant && policy.fields === 'override') return variant.printTemplate?.fields || []
  return baseFields
}

const buildThumbnailUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return url
  return url.replace('/upload/', '/upload/q_auto,w_400,f_webp/')
}

const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')

const avatarColor = (name = '') => {
  const colors = ['#00A76F', '#00B8D9', '#22C55E', '#637381', '#FF5630', '#FFAB00', '#118D57']
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        fontSize: '0.68rem',
        mb: 1,
      }}
    >
      {children}
    </Typography>
  )
}

function InfoCard({ children, sx }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'grey.50',
        border: '1px solid',
        borderColor: 'divider',
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

function ArtworkUploadZone({ orderId, currentUrl, onUploaded, label }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const isCover = label === 'Cover'

  const handleFile = async (file) => {
    if (!file) return
    const isValid = file.type === 'application/pdf' || file.type.startsWith('image/')
    if (!isValid) { setError('Upload a PNG, PDF, or image file'); return }
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50MB)'); return }

    setUploading(true); setError(''); setProgress(0)
    try {
      const folder = isCover ? 'covers' : 'interiors'
      const { data: presign } = await api.post('/upload/presign', { folder })

      if (!presign.configured) {
        const devUrl = URL.createObjectURL(file)
        const field = isCover ? 'coverImageUrl' : 'interiorPdfUrl'
        await api.patch(`/orders/${orderId}`, { [field]: devUrl })
        onUploaded(devUrl)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      Object.entries(presign.fields || {}).forEach(([k, v]) => formData.append(k, v))

      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
      }

      const uploadedUrl = await new Promise((resolve, reject) => {
        xhr.open('POST', presign.url)
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            resolve(JSON.parse(xhr.responseText).secure_url || JSON.parse(xhr.responseText).url)
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(formData)
      })

      const field = isCover ? 'coverImageUrl' : 'interiorPdfUrl'
      await api.patch(`/orders/${orderId}`, { [field]: uploadedUrl })
      onUploaded(uploadedUrl)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false); setProgress(0)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        {isCover
          ? <ImageOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
          : <PictureAsPdfOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
        }
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem' }}>
          {label}
        </Typography>
        {currentUrl && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: 'success.main' }} />
            <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.7rem' }}>Uploaded</Typography>
            <Tooltip title="Open file">
              <IconButton size="small" onClick={() => window.open(currentUrl, '_blank')} sx={{ p: 0.25 }}>
                <OpenInNewIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {isCover && currentUrl && (
        <Box sx={{ mb: 1.5 }}>
          <Box
            component="img"
            src={buildThumbnailUrl(currentUrl)}
            alt="Cover"
            sx={{
              width: '100%',
              height: 120,
              objectFit: 'cover',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        </Box>
      )}

      <Box
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          p: 1.75,
          border: '1.5px dashed',
          borderColor: dragging ? 'primary.main' : currentUrl ? alpha('#00A76F', 0.4) : 'divider',
          borderRadius: 1.5,
          textAlign: 'center',
          bgcolor: dragging ? alpha('#00A76F', 0.04) : currentUrl ? alpha('#00A76F', 0.02) : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.15s',
          '&:hover': { borderColor: 'primary.light', bgcolor: alpha('#00A76F', 0.03) },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={isCover ? '.png,.jpg,.jpeg,.pdf' : '.pdf'}
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <UploadFileOutlinedIcon sx={{ fontSize: 20, color: currentUrl ? 'success.main' : 'text.disabled', mb: 0.25 }} />
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}>
          {currentUrl ? 'Replace file' : isCover ? 'PNG or PDF · Min 2480px' : 'PDF only'}
        </Typography>
      </Box>

      {uploading && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1, height: 3 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{progress}%</Typography>
        </Box>
      )}
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}>{error}</Typography>
      )}
    </Box>
  )
}

export default function OrderDetailDrawer({ order, open, onClose, onRefresh }) {
  const [localOrder, setLocalOrder] = useState(order)
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [statusChange, setStatusChange] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [luluReviewOpen, setLuluReviewOpen] = useState(false)
  const [productCoverPreviewFailed, setProductCoverPreviewFailed] = useState(false)
  const [podPackageDraft, setPodPackageDraft] = useState('')
  const [podPackageSaving, setPodPackageSaving] = useState(false)
  const [podPackageError, setPodPackageError] = useState('')
  const [shippingLevelSaving, setShippingLevelSaving] = useState(false)
  const [product, setProduct] = useState(null)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const orderId = order?._id

  useEffect(() => { setLocalOrder(order) }, [order])

  useEffect(() => {
    setProductCoverPreviewFailed(false)
  }, [localOrder?.coverImageUrl])

  useEffect(() => {
    setPodPackageDraft(localOrder?.podPackageId || '')
    setPodPackageError('')
  }, [localOrder?.podPackageId])

  useEffect(() => {
    if (open && orderId) {
      setStatusChange('')
      setStatusNote('')
      setStatusError('')
      setEventsLoading(true)
      api.get(`/orders/${orderId}/events`)
        .then(({ data }) => setEvents(data))
        .catch(() => setEvents([]))
        .finally(() => setEventsLoading(false))
    }
  }, [open, orderId])

  useEffect(() => {
    const productId = localOrder?.productId
    if (productId) {
      api.get(`/products/${productId}`)
        .then(({ data }) => setProduct(data))
        .catch(() => setProduct(null))
    } else {
      setProduct(null)
    }
  }, [localOrder?.productId])

  const handleStatusApply = async () => {
    if (!statusChange || !localOrder) return
    setStatusLoading(true)
    setStatusError('')
    try {
      await api.patch(`/orders/${localOrder._id}/status`, { status: statusChange, note: statusNote })
      setLocalOrder((o) => ({ ...o, etsyStatus: statusChange }))
      onRefresh?.()
      setStatusChange('')
      setStatusNote('')
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Failed to update order status')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleArtworkChange = async (field, value) => {
    const nextValue = value || null
    await api.patch(`/orders/${localOrder._id}`, { [field]: nextValue })
    setLocalOrder((current) => ({
      ...current,
      [field]: nextValue,
      ...(field === 'coverImageUrl' ? { hasCustomArtwork: Boolean(nextValue) } : {}),
    }))
    onRefresh?.()
  }

  const handlePodPackageBlur = async () => {
    if (!localOrder) return

    const normalizedValue = podPackageDraft.trim().toUpperCase()
    const currentValue = localOrder.podPackageId || ''

    if (normalizedValue === currentValue) return

    setPodPackageSaving(true)
    setPodPackageError('')

    try {
      await handleArtworkChange('podPackageId', normalizedValue)
      setPodPackageDraft(normalizedValue)
    } catch (err) {
      setPodPackageError(err.response?.data?.message || 'Failed to save Pod Package ID')
      setPodPackageDraft(currentValue)
    } finally {
      setPodPackageSaving(false)
    }
  }

  const handleShippingLevelChange = async (value) => {
    setShippingLevelSaving(true)
    try {
      await api.patch(`/orders/${localOrder._id}`, { shippingLevel: value })
      setLocalOrder((o) => ({ ...o, shippingLevel: value }))
      onRefresh?.()
    } catch {
      // ignore
    } finally {
      setShippingLevelSaving(false)
    }
  }

  const handleVariantSelect = async (variant) => {
    const id = variantId(variant)
    try {
      await api.patch(`/orders/${localOrder._id}`, {
        interiorPdfUrl: variant.interiorPdfUrl || localOrder.interiorPdfUrl || null,
        podPackageId: variant.podPackageId || localOrder.podPackageId || null,
        matchedVariantId: id || null,
        matchedVariantName: variant.name,
      })
      setLocalOrder((o) => ({
        ...o,
        interiorPdfUrl: variant.interiorPdfUrl || o.interiorPdfUrl || null,
        podPackageId: variant.podPackageId || o.podPackageId || null,
        matchedVariantId: id || null,
        matchedVariantName: variant.name,
      }))
      setPodPackageDraft(variant.podPackageId)
      onRefresh?.()
    } catch {
      // ignore
    }
  }

  const fmt = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const fmtTime = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const canSubmitToLulu =
    localOrder?.etsyStatus === 'completed' &&
    localOrder?.coverImageUrl &&
    localOrder?.interiorPdfUrl &&
    localOrder?.podPackageId
  const isOverdue = localOrder?.shipByDate && new Date(localOrder.shipByDate) < new Date()
  const productHasTemplate = Boolean(resolveEffectiveTemplateFields(product, localOrder).length)

  const shippingLines = localOrder
    ? [
        localOrder.shippingAddress?.name,
        localOrder.shippingAddress?.street1,
        localOrder.shippingAddress?.street2,
        [localOrder.shippingAddress?.city, localOrder.shippingAddress?.state, localOrder.shippingAddress?.zip]
          .filter(Boolean).join(', '),
        localOrder.shippingAddress?.country,
      ].filter(Boolean)
    : []

  if (!localOrder) return null

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 560 },
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* ── Sticky header ── */}
        <Box
          sx={{
            flexShrink: 0,
            px: 3,
            pt: 2.5,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.68rem' }}
              >
                Order
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, fontFamily: 'monospace', letterSpacing: '-0.5px', lineHeight: 1.1, mt: 0.25 }}
              >
                #{localOrder.etsyOrderId}
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'text.secondary',
                bgcolor: 'grey.100',
                '&:hover': { bgcolor: 'grey.200' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
            <StatusBadge status={localOrder.etsyStatus} size="small" />
            <Typography variant="caption" color="text.disabled">
              Ordered {fmt(localOrder.orderedAt)}
            </Typography>
          </Box>
        </Box>

        {/* ── Lulu CTA banner ── */}
        {canSubmitToLulu && (
          <Box
            sx={{
              flexShrink: 0,
              px: 3,
              py: 1.75,
              bgcolor: alpha('#00A76F', 0.06),
              borderBottom: '1px solid',
              borderColor: alpha('#00A76F', 0.2),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                Ready for printing
              </Typography>
              <Typography variant="caption" sx={{ color: 'success.main' }}>
                This order can be submitted to Lulu
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<LocalPrintshopOutlinedIcon />}
              onClick={() => setLuluReviewOpen(true)}
              sx={{
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' },
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Send to Lulu
            </Button>
          </Box>
        )}

        {/* ── Scrollable body ── */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
          <Stack spacing={3}>

            {/* Customer + Shipping */}
            <Box>
              <SectionLabel>Customer</SectionLabel>
              <InfoCard>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: shippingLines.length ? 2 : 0 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: avatarColor(localOrder.customerName),
                      fontSize: '0.875rem',
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(localOrder.customerName)}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{localOrder.customerName}</Typography>
                    {localOrder.customerEmail && (
                      <Typography variant="caption" color="text.secondary">{localOrder.customerEmail}</Typography>
                    )}
                    {localOrder.shippingAddress?.phone && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {localOrder.shippingAddress.phone}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {shippingLines.length > 0 && (
                  <>
                    <Divider sx={{ mb: 1.5 }} />
                    <Box sx={{ display: 'flex', gap: 1.25 }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.25, flexShrink: 0 }} />
                      <Box>
                        {shippingLines.map((line, i) => (
                          <Typography key={i} variant="body2" sx={{ color: i === 0 ? 'text.primary' : 'text.secondary', lineHeight: 1.6 }}>
                            {line}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
              </InfoCard>
            </Box>

            {/* Product */}
            <Box>
              <SectionLabel>Product</SectionLabel>
              <InfoCard>
                {localOrder.coverImageUrl && !productCoverPreviewFailed && (
                  <Box
                    component="img"
                    src={buildAssetThumbnailUrl(localOrder.coverImageUrl)}
                    alt="Cover"
                    onError={() => setProductCoverPreviewFailed(true)}
                    sx={{
                      width: '100%',
                      height: 140,
                      objectFit: 'cover',
                      borderRadius: 1.5,
                      mb: 1.75,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                )}

                {localOrder.coverImageUrl && productCoverPreviewFailed && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      mb: 1.75,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'grey.50',
                    }}
                  >
                    <PictureAsPdfOutlinedIcon sx={{ color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Cover file linked
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        This file cannot be previewed here, but Lulu can still use the URL.
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.4, mb: 0.75 }}>
                  {localOrder.productTitle}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    Qty: <strong>{localOrder.quantity}</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ${localOrder.price?.toFixed(2)}
                  </Typography>
                  {localOrder.listingId && (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                      #{localOrder.listingId}
                    </Typography>
                  )}
                </Box>

                {!localOrder.isProductMapped && (
                  <Chip
                    icon={<WarningAmberIcon sx={{ fontSize: '14px !important' }} />}
                    label="Unmapped product"
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ mt: 1.25, height: 24 }}
                  />
                )}
              </InfoCard>
            </Box>

            {/* Personalization */}
            {Object.keys(localOrder.personalization || {}).length > 0 && (
              <Box>
                <SectionLabel>Personalization</SectionLabel>
                <InfoCard sx={{ p: 0, overflow: 'hidden' }}>
                  {Object.entries(localOrder.personalization).map(([key, val], i, arr) => (
                    <Box
                      key={key}
                      sx={{
                        display: 'flex',
                        px: 2,
                        py: 1.25,
                        borderBottom: i < arr.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'grey.100' },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: 'text.secondary', minWidth: 130, flexShrink: 0, pt: 0.1 }}
                      >
                        {key}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary', wordBreak: 'break-word' }}>
                        {val}
                      </Typography>
                    </Box>
                  ))}
                </InfoCard>
              </Box>
            )}

            {/* Dates */}
            <Box>
              <SectionLabel>Dates</SectionLabel>
              <InfoCard>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <CalendarTodayOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 72 }}>Ordered</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{fmt(localOrder.orderedAt)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <CalendarTodayOutlinedIcon sx={{ fontSize: 15, color: isOverdue ? 'error.main' : 'text.disabled' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 72 }}>Ship by</Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, color: isOverdue ? 'error.main' : 'text.primary' }}
                    >
                      {fmt(localOrder.shipByDate)}
                      {isOverdue && (
                        <Box component="span" sx={{ ml: 1, fontSize: '0.7rem', color: 'error.main', fontWeight: 700 }}>
                          OVERDUE
                        </Box>
                      )}
                    </Typography>
                  </Box>
                </Stack>
              </InfoCard>
            </Box>

            {/* Artwork uploads */}
            <Box>
              <SectionLabel>Artwork</SectionLabel>

              {productHasTemplate && (
                <InfoCard sx={{ p: 1.75, mb: 2, borderColor: localOrder.templateFinalizedAt ? 'success.light' : 'warning.light' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {localOrder.templateFinalizedAt ? 'Personalized PDFs frozen' : 'Personalization required'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Fill the product template fields and generate order-specific cover and inside PDFs.
                      </Typography>
                    </Box>
                    <Button
                      variant={localOrder.templateFinalizedAt ? 'outlined' : 'contained'}
                      size="small"
                      startIcon={<DesignServicesIcon />}
                      onClick={() => setTemplateDialogOpen(true)}
                      sx={{ flexShrink: 0 }}
                    >
                      Personalize
                    </Button>
                  </Box>
                  {localOrder.templateWarnings?.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.75rem' }}>
                      {localOrder.templateWarnings.join('; ')}
                    </Alert>
                  )}
                </InfoCard>
              )}

              {/* Variant picker — only shown when the product has variants */}
              {product?.variants?.length > 0 && (
                <InfoCard sx={{ p: 1.75, mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                    PRODUCT VARIANT
                  </Typography>
                  <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                    {product.variants.map((v) => {
                      const isActive = localOrder.matchedVariantId
                        ? localOrder.matchedVariantId === variantId(v)
                        : localOrder.matchedVariantName === v.name
                      return (
                        <Chip
                          key={variantId(v) || v.name}
                          label={v.name}
                          size="small"
                          variant={isActive ? 'filled' : 'outlined'}
                          color={isActive ? 'primary' : 'default'}
                          onClick={() => handleVariantSelect(v)}
                          sx={{ cursor: 'pointer', fontWeight: isActive ? 700 : 400 }}
                        />
                      )
                    })}
                  </Stack>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    {localOrder.matchedVariantName
                      ? `Variant "${localOrder.matchedVariantName}" applied. Template PDFs inherit defaults unless this variant overrides them.`
                      : 'Select a variant to auto-apply its POD ID and template overrides.'}
                  </Typography>
                </InfoCard>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <InfoCard sx={{ p: 1.75 }}>
                  <AssetInputField
                    label="Cover PDF"
                    value={localOrder.coverImageUrl}
                    onChange={(url) => handleArtworkChange('coverImageUrl', url)}
                    folder="covers"
                    accept=".pdf"
                    allowPdf
                    helperText="Upload a print-ready PDF or paste a public URL for the final cover."
                    openLabel="Open cover PDF"
                  />
                </InfoCard>
                <InfoCard sx={{ p: 1.75 }}>
                  <AssetInputField
                    label="Inside Page PDF"
                    value={localOrder.interiorPdfUrl}
                    onChange={(url) => handleArtworkChange('interiorPdfUrl', url)}
                    folder="interiors"
                    accept=".pdf"
                    allowPdf
                    helperText="Upload a PDF or paste a public URL for the inside pages."
                    openLabel="Open inside page PDF"
                  />
                </InfoCard>
              </Box>
              <InfoCard sx={{ p: 1.75, mt: 2 }}>
                <TextField
                  label="Lulu Pod Package ID"
                  value={podPackageDraft}
                  onChange={(e) => setPodPackageDraft(e.target.value)}
                  onBlur={handlePodPackageBlur}
                  fullWidth
                  size="small"
                  placeholder="e.g. 0850X1100BWSTDLW060UW444MNG"
                  helperText={podPackageError || "Use the 27-character pod_package_id from Lulu's catalog, not shorthand codes like PB-0850X1100-STDCOLOR-PBW-GL. Saves when you leave this field."}
                  error={Boolean(podPackageError)}
                />
                {podPackageSaving && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    Saving Pod Package ID...
                  </Typography>
                )}
              </InfoCard>
              <InfoCard sx={{ p: 1.75, mt: 2 }}>
                <FormControl fullWidth size="small" disabled={shippingLevelSaving}>
                  <InputLabel>Shipping Level</InputLabel>
                  <Select
                    value={localOrder.shippingLevel || 'MAIL'}
                    label="Shipping Level"
                    onChange={(e) => handleShippingLevelChange(e.target.value)}
                  >
                    {[
                      { value: 'MAIL', label: 'Standard Mail' },
                      { value: 'PRIORITY_MAIL', label: 'Priority Mail' },
                      { value: 'GROUND_HD', label: 'Ground Home Delivery' },
                      { value: 'GROUND_BUS', label: 'Ground Business' },
                      { value: 'EXPEDITED', label: 'Expedited' },
                      { value: 'EXPRESS_OVERNIGHT', label: 'Express Overnight' },
                    ].map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                  Shipping level sent to Lulu. Can be overridden in the review dialog.
                </Typography>
              </InfoCard>
            </Box>

            {/* Lulu status */}
            {localOrder.luluStatus && (
              <Box>
                <SectionLabel>Lulu Print Status</SectionLabel>
                <InfoCard>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StatusBadge status={localOrder.luluStatus} />
                    {localOrder.luluJobId && (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled' }}>
                        {localOrder.luluJobId}
                      </Typography>
                    )}
                  </Box>
                  {localOrder.trackingNumber && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace', color: 'success.main', fontWeight: 600 }}>
                      Tracking: {localOrder.trackingNumber}
                    </Typography>
                  )}
                </InfoCard>
              </Box>
            )}

            {/* AI flags */}
            {localOrder.aiFlags?.length > 0 && (
              <Box>
                <SectionLabel>AI Flags</SectionLabel>
                <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {localOrder.aiFlags.map((flag, i) => (
                    <Chip key={i} label={flag} size="small" color="warning" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Notes */}
            {localOrder.notes && (
              <Box>
                <SectionLabel>Notes</SectionLabel>
                <InfoCard>
                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{localOrder.notes}</Typography>
                </InfoCard>
              </Box>
            )}

            {/* Change status */}
            <Box>
              <SectionLabel>Change Status</SectionLabel>
              <InfoCard>
                <Stack spacing={1.25}>
                  <FormControl fullWidth size="small">
                    <Select
                      displayEmpty
                      value={statusChange}
                      onChange={(e) => setStatusChange(e.target.value)}
                      sx={{ bgcolor: 'background.paper' }}
                    >
                      <MenuItem value="" disabled>Select new status…</MenuItem>
                      {ETSY_ORDER_STATUSES.filter((s) => s.value !== localOrder.etsyStatus).map((s) => (
                        <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Add a note (optional)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
                  />

                  {statusChange === 'completed' && (!localOrder.coverImageUrl || !localOrder.interiorPdfUrl || !localOrder.podPackageId) && (
                    <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                      Cover PDF, inside page PDF, and Pod Package ID are required for "Completed".
                    </Alert>
                  )}

                  {statusError && (
                    <Alert severity="error" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                      {statusError}
                    </Alert>
                  )}

                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    disabled={!statusChange || statusLoading}
                    onClick={handleStatusApply}
                    sx={{ fontWeight: 700 }}
                  >
                    {statusLoading ? 'Applying…' : 'Apply Status'}
                  </Button>
                </Stack>
              </InfoCard>
            </Box>

            {/* Activity timeline */}
            <Box>
              <SectionLabel>Activity</SectionLabel>
              {eventsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Skeleton variant="circular" width={28} height={28} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" height={14} sx={{ mb: 0.5 }} />
                      <Skeleton width="40%" height={12} />
                    </Box>
                  </Box>
                ))
              ) : events.length === 0 ? (
                <Typography variant="caption" color="text.disabled">No activity yet</Typography>
              ) : (
                <Stack spacing={0}>
                  {events.map((event, i) => (
                    <Box key={event._id} sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            bgcolor: alpha('#00A76F', 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                        </Box>
                        {i < events.length - 1 && (
                          <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.5, borderRadius: 1 }} />
                        )}
                      </Box>
                      <Box sx={{ pb: i < events.length - 1 ? 2 : 0, pt: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.3 }}>
                          {event.toStatus
                            ? event.toStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                            : 'Order created'}
                          {event.userId?.name && (
                            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                              {' '}by {event.userId.name}
                            </Box>
                          )}
                        </Typography>
                        {event.note && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            "{event.note}"
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem' }}>
                          {fmtTime(event.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

          </Stack>
        </Box>
      </Drawer>

      <LuluReviewDialog
        open={luluReviewOpen}
        onClose={() => setLuluReviewOpen(false)}
        order={localOrder}
        onSubmitted={() => { onRefresh?.(); onClose() }}
      />

      <TemplatePersonalizationDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        order={localOrder}
        product={product}
        onFinalized={(updatedOrder) => {
          setLocalOrder(updatedOrder)
          onRefresh?.()
        }}
      />
    </>
  )
}
