import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditIcon from '@mui/icons-material/Edit'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import PrintIcon from '@mui/icons-material/Print'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SyncIcon from '@mui/icons-material/Sync'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { buildAssetThumbnailUrl } from '../lib/assets'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import Etsy2StatusBadge from '../components/etsy2/Etsy2StatusBadge'
import { deriveBatchStatus, ITEM_STATUSES } from '../lib/etsy2Constants'
import { buildGeneratedPreviewAssets, getGeneratedOrderItems, getGeneratedOrderSourceIds } from '../lib/generatedOrders'
import {
  addressLines,
  formatDate,
  formatMoney,
  getInitials,
  getItemStatus,
  optionText,
  reviewFlagsFor,
  toEtsy2GroupOrder,
} from '../lib/etsy2Orders'
import {
  cancelPdfGenerationJob,
  isPdfGenerationJobActive,
  listPdfGenerationJobs,
  startPdfGenerationJob,
} from '../lib/pdfGenerationJobs'

const valueOrDash = (value) => value || '-'
const isImageUrl = (value = '') => /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value)
const itemSourceId = (item) => item?.sourceOrder?._id || item?.id || ''
const PDF_GENERATABLE_STATUSES = new Set([
  ITEM_STATUSES.MAPPED,
  ITEM_STATUSES.FAILED,
  ITEM_STATUSES.GENERATED,
])
const FORCE_GENERATION_STATUSES = new Set([
  ITEM_STATUSES.FAILED,
  ITEM_STATUSES.GENERATED,
])
const canSelectItemForPdfGeneration = (item) =>
  PDF_GENERATABLE_STATUSES.has(item?.status) && Boolean(item?.sourceOrder?.isProductMapped)
const shouldForceItemGeneration = (item) =>
  FORCE_GENERATION_STATUSES.has(item?.status)

function InfoStat({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', minWidth: 0 }}>
      <Box sx={{ color: '#71717A', lineHeight: 0, mt: 0.25 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 600, wordBreak: 'break-word' }}>
          {valueOrDash(value)}
        </Typography>
      </Box>
    </Box>
  )
}

function PaymentRow({ label, value, strong = false }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
      <Typography variant="body2" sx={{ color: '#71717A' }}>{label}</Typography>
      <Typography variant={strong ? 'subtitle1' : 'body2'} sx={{ color: '#27272A', fontWeight: strong ? 800 : 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  )
}

function DetailPanel({ title, icon, action, children }) {
  return (
    <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid #E3E3E7', boxShadow: 'none' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#27272A' }}>
            {title}
          </Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Paper>
  )
}

function GeneratedPdfPreview({ asset }) {
  if (!asset?.url) {
    return (
      <Box
        sx={{
          height: { xs: 420, lg: 620 },
          bgcolor: '#1F2933',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#CBD5E1',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          No generated PDF available
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: { xs: 460, lg: 660 },
        bgcolor: '#1F2933',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #111827',
      }}
    >
      {isImageUrl(asset.url) ? (
        <Box
          component="img"
          src={buildAssetThumbnailUrl(asset.url, 1200)}
          alt=""
          sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: '#111827' }}
        />
      ) : (
        <Box
          component="iframe"
          title={asset.label}
          src={asset.url}
          sx={{ width: '100%', height: '100%', border: 0, bgcolor: '#1F2933' }}
        />
      )}
    </Box>
  )
}

function GeneratedThumb({ asset, active, index, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: 112,
        cursor: 'pointer',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 112,
          height: 136,
          borderRadius: '8px',
          border: '2px solid',
          borderColor: active ? '#5B21D6' : '#E5E7EB',
          bgcolor: '#FFFFFF',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? '0 8px 20px rgba(91, 33, 214, 0.14)' : 'none',
        }}
      >
        {asset?.url && isImageUrl(asset.url) ? (
          <Box
            component="img"
            src={buildAssetThumbnailUrl(asset.url, 240)}
            alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ px: 1.5 }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 34, color: '#5B21D6', mb: 1 }} />
            <Typography variant="caption" sx={{ color: '#334155', fontWeight: 800, display: 'block' }}>
              {asset.label}
            </Typography>
          </Box>
        )}
      </Box>
      <Typography
        variant="caption"
        sx={{
          mt: 0.75,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 22,
          height: 22,
          borderRadius: '5px',
          bgcolor: active ? '#5B21D6' : 'transparent',
          color: active ? '#FFFFFF' : '#64748B',
          fontWeight: 800,
        }}
      >
        {index + 1}
      </Typography>
    </Box>
  )
}

function ItemBlock({ item, index, generationSelectable = false, generationSelected = false, onToggleGeneration }) {
  const source = item.sourceOrder || {}
  const flags = reviewFlagsFor(source)
  const personalization = Object.entries(source.personalization || {})
  const status = getItemStatus(source)
  const sourceId = itemSourceId(item)

  return (
    <Box>
      {index > 0 && <Divider sx={{ my: 2 }} />}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto 88px minmax(0, 1fr) 160px' }, gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ pt: { xs: 0, md: 0.25 }, minHeight: 32 }}>
          {generationSelectable && (
            <Checkbox
              size="small"
              checked={generationSelected}
              onChange={(event) => onToggleGeneration?.(sourceId, event.target.checked)}
              sx={{
                color: '#5B21D6',
                '&.Mui-checked': { color: '#5B21D6' },
                p: 0.25,
              }}
            />
          )}
        </Box>
        <Box
          sx={{
            width: 88,
            height: 88,
            bgcolor: '#F4F4F5',
            borderRadius: '8px',
            border: '1px solid #E3E3E7',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {source.coverImageUrl ? (
            <Box
              component="img"
              src={buildAssetThumbnailUrl(source.coverImageUrl)}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>Item</Typography>
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#27272A' }}>
              {item.name}
            </Typography>
            <Etsy2StatusBadge status={status} />
          </Box>

          <Typography variant="body2" sx={{ color: '#71717A' }}>
            {optionText(source) || 'No options'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip label={`Listing: ${valueOrDash(source.listingId)}`} size="small" variant="outlined" />
            <Chip label={`Txn: ${valueOrDash(source.etsyItemId)}`} size="small" variant="outlined" />
            {source.matchedVariantName && <Chip label={`Variant: ${source.matchedVariantName}`} size="small" variant="outlined" />}
            {!source.isProductMapped && <Chip label="Product not mapped" size="small" color="warning" variant="outlined" />}
            {source.requiresTemplateFinalization && <Chip label="Template needed" size="small" color="info" variant="outlined" />}
            {generationSelectable && (
              <Chip
                label={shouldForceItemGeneration(item) ? 'Ready to regenerate' : 'Ready to generate'}
                size="small"
                color="info"
                variant="outlined"
              />
            )}
          </Box>

          {flags.length > 0 && (
            <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mt: 2, borderRadius: '8px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Needs review</Typography>
              {flags.map((flag) => (
                <Typography key={flag} variant="body2">{flag}</Typography>
              ))}
            </Alert>
          )}

          {personalization.length > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#FAFAFA', borderRadius: '8px', border: '1px solid #E3E3E7' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#27272A', mb: 1 }}>
                Personalization
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                {personalization.map(([label, value]) => (
                  <Box key={label}>
                    <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 600 }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#27272A', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {String(value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Typography variant="caption" sx={{ color: '#71717A' }}>Quantity</Typography>
          <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 700, mb: 1 }}>
            {source.quantity || 1}
          </Typography>
          <Typography variant="caption" sx={{ color: '#71717A' }}>Item Total</Typography>
          <Typography variant="subtitle1" sx={{ color: '#27272A', fontWeight: 800 }}>
            {formatMoney(Number(source.price || 0) * Number(source.quantity || 1))}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default function Etsy2OrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [generationJob, setGenerationJob] = useState(null)
  const completedGenerationJobIdsRef = useRef(new Set())
  const [sendingToLulu, setSendingToLulu] = useState(false)
  const [activePreviewAssetId, setActivePreviewAssetId] = useState('')
  const [selectedPdfItemIds, setSelectedPdfItemIds] = useState([])
  const [editOpen, setEditOpen] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchGroup = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await api.get(`/orders/group/${encodeURIComponent(orderId)}`)
      setGroup(data)
      return data
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to load order', severity: 'error' })
      return null
    } finally {
      if (!silent) setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') fetchGroup({ silent: true })
    }
    window.addEventListener('focus', refreshIfVisible)
    document.addEventListener('visibilitychange', refreshIfVisible)
    return () => {
      window.removeEventListener('focus', refreshIfVisible)
      document.removeEventListener('visibilitychange', refreshIfVisible)
    }
  }, [fetchGroup])

  const refreshGenerationJob = useCallback(async () => {
    try {
      const jobs = await listPdfGenerationJobs()
      const job = jobs.find((item) => item.etsyOrderId === orderId)
      if (!job) return
      setGenerationJob(job)
      if (
        ['succeeded', 'failed', 'cancelled'].includes(job.status) &&
        !completedGenerationJobIdsRef.current.has(job.id)
      ) {
        completedGenerationJobIdsRef.current.add(job.id)
        await fetchGroup()
      }
    } catch {
      // Keep the detail page usable if job polling briefly fails.
    }
  }, [fetchGroup, orderId])

  useEffect(() => {
    refreshGenerationJob()
  }, [refreshGenerationJob])

  const order = useMemo(() => (group ? toEtsy2GroupOrder(group) : null), [group])
  const generating = isPdfGenerationJobActive(generationJob)
  const batchStatus = order ? deriveBatchStatus(order.items) : null
  const hasAIFlag = order?.items?.some((item) => item.status === 'ai_flagged')
  const pdfGenerationItems = useMemo(
    () => (order?.items || []).filter(canSelectItemForPdfGeneration),
    [order]
  )
  const pdfGenerationItemIds = useMemo(
    () => pdfGenerationItems.map(itemSourceId).filter(Boolean),
    [pdfGenerationItems]
  )
  const selectedPdfItems = useMemo(
    () => pdfGenerationItems.filter((item) => selectedPdfItemIds.includes(itemSourceId(item))),
    [pdfGenerationItems, selectedPdfItemIds]
  )
  const canGeneratePdfs = pdfGenerationItems.length > 0
  const shippingLines = addressLines(group?.shippingAddress)
  const subtotal = group?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0) || 0
  const shipping = Number(group?.pricing?.shipping || group?.items?.[0]?.shippingCost || 0)
  const tax = Number(group?.pricing?.tax || 0)
  const generatedItems = getGeneratedOrderItems(order)
  const previewAssets = useMemo(() => buildGeneratedPreviewAssets(order), [order])
  const activeAsset = previewAssets.find((asset) => asset.id === activePreviewAssetId) || previewAssets[0] || null
  const previewItem = activeAsset?.item || generatedItems[0] || order?.items?.[0] || null
  const previewSource = previewItem?.sourceOrder || {}
  const showGeneratedPreview = false

  useEffect(() => {
    setSelectedPdfItemIds((current) =>
      current.filter((itemId) => pdfGenerationItemIds.includes(itemId))
    )
  }, [pdfGenerationItemIds])

  useEffect(() => {
    if (!previewAssets.length) {
      setActivePreviewAssetId('')
      return
    }
    if (!previewAssets.some((asset) => asset.id === activePreviewAssetId)) {
      setActivePreviewAssetId(previewAssets[0].id)
    }
  }, [activePreviewAssetId, previewAssets])

  useEffect(() => {
    if (!generating) return undefined
    const timer = window.setInterval(refreshGenerationJob, 2500)
    return () => window.clearInterval(timer)
  }, [generating, refreshGenerationJob])

  const handleSync = async () => {
    if (!activeStore?._id) {
      fetchGroup()
      return
    }

    setSyncing(true)
    try {
      const { data } = await api.post('/email-orders/fetch', { storeId: activeStore._id })
      await fetchGroup()
      setSnack({
        open: true,
        message: `Email sync complete: ${data.created || 0} created, ${data.updated || 0} updated, ${data.skipped || 0} skipped`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Email sync failed', severity: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  const handleTogglePdfItem = (itemId, checked) => {
    if (!itemId) return
    setSelectedPdfItemIds((current) => (
      checked ? [...new Set([...current, itemId])] : current.filter((id) => id !== itemId)
    ))
  }

  const handleSelectAllPdfItems = () => {
    setSelectedPdfItemIds(pdfGenerationItemIds)
  }

  const handleGenerate = async (targetItems, selectedOnly = false) => {
    if (!order?.orderId) return
    const itemsToGenerate = (targetItems || []).filter(canSelectItemForPdfGeneration)
    const orderIds = itemsToGenerate.map(itemSourceId).filter(Boolean)
    if (orderIds.length === 0) {
      setSnack({ open: true, message: 'Only mapped or failed generated order items can generate PDFs.', severity: 'warning' })
      return
    }

    try {
      const force = itemsToGenerate.some(shouldForceItemGeneration)
      const job = await startPdfGenerationJob(order.orderId, { force, orderIds })
      setGenerationJob(job)
      if (selectedOnly) setSelectedPdfItemIds([])
      setSnack({
        open: true,
        message: `PDF generation started for ${orderIds.length} item${orderIds.length === 1 ? '' : 's'}. You can leave this page and it will keep running.`,
        severity: 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || err.message || 'Failed to generate PDFs',
        severity: 'error',
      })
    }
  }

  const handleCancelGeneration = async () => {
    if (!generationJob?.id) return
    try {
      const job = await cancelPdfGenerationJob(generationJob.id)
      setGenerationJob(job)
      setSnack({ open: true, message: 'PDF generation cancellation requested.', severity: 'info' })
      refreshGenerationJob()
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.message || 'Failed to cancel PDF generation',
        severity: 'error',
      })
    }
  }

  const handleSendGeneratedToLulu = async () => {
    const orderIds = getGeneratedOrderSourceIds(order)
    if (orderIds.length === 0) {
      setSnack({ open: true, message: 'No generated PDFs are ready for Lulu on this order.', severity: 'warning' })
      return
    }

    setSendingToLulu(true)
    try {
      const { data } = await api.post('/lulu/bulk-submit', { orderIds })
      await fetchGroup()
      setSnack({
        open: true,
        message: `Sent ${data.submitted || 0} of ${orderIds.length} generated item${orderIds.length === 1 ? '' : 's'} to Lulu.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to send order to Lulu',
        severity: 'error',
      })
    } finally {
      setSendingToLulu(false)
    }
  }

  const handleDownloadGeneratedPdfs = async () => {
    const freshGroup = await fetchGroup({ silent: true })
    const freshOrder = freshGroup ? toEtsy2GroupOrder(freshGroup) : order
    const freshPreviewAssets = buildGeneratedPreviewAssets(freshOrder)

    if (freshPreviewAssets.length === 0) {
      setSnack({ open: true, message: 'No generated PDFs are available to download.', severity: 'warning' })
      return
    }

    freshPreviewAssets.forEach((asset) => {
      const link = document.createElement('a')
      link.href = asset.url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.download = asset.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }

  const handleEditInCanvas = () => {
    const kind = activeAsset?.kind === 'interior' ? 'interior' : 'cover'
    const itemId = activeAsset?.itemId || previewSource?._id
    const itemQuery = itemId
      ? `?source=generated&itemId=${encodeURIComponent(itemId)}&kind=${kind}`
      : `?source=generated&kind=${kind}`
    navigate(`/orders/etsy2/${encodeURIComponent(order.orderId)}/canvas${itemQuery}`)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!order || !group) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders/etsy2')}>Back to Orders</Button>
        <Alert severity="error" sx={{ mt: 2 }}>Order not found.</Alert>
      </Box>
    )
  }

  if (showGeneratedPreview) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/orders/generated/${encodeURIComponent(order.orderId)}`)}
            sx={{ color: '#64748B', fontWeight: 700, textTransform: 'none' }}
          >
            Back to Generated Orders
          </Button>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
            sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 700 }}
          >
            {syncing ? 'Syncing...' : 'Sync Etsy Orders'}
          </Button>
        </Box>

        <Box
          sx={{
            bgcolor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            p: { xs: 2, md: 3 },
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 380px' },
            gap: 3,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', fontSize: { xs: '1.6rem', md: '2rem' } }}>
                  Order #{order.orderId}
                </Typography>
                <Etsy2StatusBadge status={previewItem?.status || ITEM_STATUSES.GENERATED} showIcon={false} />
              </Box>
              <Typography variant="body2" sx={{ color: '#64748B', mt: 0.75 }}>
                Generated on {formatDate(previewSource.templateFinalizedAt || previewSource.updatedAt || order.date, true)}
              </Typography>
            </Box>

            <GeneratedPdfPreview asset={activeAsset} />

            <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
              {previewAssets.map((asset, index) => (
                <GeneratedThumb
                  key={asset.id}
                  asset={asset}
                  index={index}
                  active={asset.id === activeAsset?.id}
                  onClick={() => setActivePreviewAssetId(asset.id)}
                />
              ))}
            </Box>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 2 }}>
              Showing 1 to {Math.max(previewAssets.length, 1)} of {Math.max(previewAssets.length, 1)} generated file{previewAssets.length === 1 ? '' : 's'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                Order Details
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.65 }}>
                {[
                  ['Order ID', `#${order.orderId}`],
                  ['Buyer', order.buyerName],
                  ['Template', previewSource.matchedVariantName || previewSource.projectName || 'Print Template'],
                  ['Pod package ID', previewSource.podPackageId || previewItem?.podPackageId || order?.podPackageId],
                  ['Generated Date', formatDate(previewSource.templateFinalizedAt || previewSource.updatedAt || order.date, true)],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>{label}</Typography>
                    <Typography variant="body2" sx={{ color: label === 'Order ID' ? '#4F46E5' : '#334155', fontWeight: 700, textAlign: 'right' }}>
                      {valueOrDash(value)}
                    </Typography>
                  </Box>
                ))}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Product</Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 800 }}>
                      {previewItem?.name || previewSource.productTitle || '-'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      {previewItem?.variant || previewSource.matchedVariantName || 'Print-ready PDF'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>Status</Typography>
                  <Etsy2StatusBadge status={previewItem?.status || ITEM_STATUSES.GENERATED} showIcon={false} />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 3 }}>
                {canManage && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEditInCanvas}
                    sx={{ bgcolor: '#5B21D6', borderRadius: '6px', fontWeight: 800, '&:hover': { bgcolor: '#4C1D95' } }}
                  >
                    Edit in Canvas
                  </Button>
                )}
                {canManage && (
                  <Button
                    variant="contained"
                    startIcon={sendingToLulu ? <CircularProgress size={16} color="inherit" /> : <LocalShippingOutlinedIcon />}
                    onClick={handleSendGeneratedToLulu}
                    disabled={sendingToLulu}
                    sx={{ bgcolor: '#16A34A', borderRadius: '6px', fontWeight: 800, '&:hover': { bgcolor: '#15803D' } }}
                  >
                    {sendingToLulu ? 'Sending...' : previewItem?.status === ITEM_STATUSES.FAILED ? 'Resend to Lulu' : 'Send to Lulu'}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => activeAsset?.url && window.open(activeAsset.url, '_blank', 'noopener,noreferrer')}
                  disabled={!activeAsset?.url}
                  sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}
                >
                  Preview PDF
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={handleDownloadGeneratedPdfs}
                  sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}
                >
                  Download PDF
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MoreVertIcon />}
                  sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}
                >
                  More Actions
                </Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PersonOutlineOutlinedIcon sx={{ color: '#0F172A' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>Customer Info</Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 800 }}>{order.buyerName || '-'}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, color: '#64748B' }}>
                <EmailOutlinedIcon fontSize="small" />
                <Typography variant="body2">{order.buyerEmail || '-'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, color: '#64748B' }}>
                <LocationOnOutlinedIcon fontSize="small" />
                <Typography variant="body2">{group.shippingAddress?.country || '-'}</Typography>
              </Box>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CheckCircleIcon sx={{ color: '#0F172A' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>Order History</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                <CheckCircleIcon sx={{ color: '#5B21D6', fontSize: 20, mt: 0.2 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#334155', fontWeight: 800 }}>
                    {formatDate(previewSource.templateFinalizedAt || previewSource.updatedAt || order.date, true)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    PDF generated successfully
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>

        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnack((current) => ({ ...current, open: false }))}
            severity={snack.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/orders/etsy2')} sx={{ bgcolor: '#F4F4F5' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="body2" sx={{ color: '#0EA5E9', cursor: 'pointer' }} onClick={() => navigate('/orders/etsy2')}>
            Back to Orders
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#27272A' }}>
                Order #{order.orderId}
              </Typography>
              <Etsy2StatusBadge status={batchStatus} />
              {group.hasUnmapped && <Chip label="Unmapped items" size="small" color="warning" variant="outlined" />}
              {group.hasCustomArtwork && <Chip label="Custom artwork" size="small" color="warning" variant="outlined" />}
            </Box>
            <Typography variant="body2" sx={{ color: '#71717A' }}>
              {order.shop || 'Etsy'} order from {formatDate(order.date, true)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing}
              sx={{ borderColor: '#E3E3E7', color: '#27272A' }}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
            {canManage && (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setEditOpen(true)}
                sx={{ borderColor: '#E3E3E7', color: '#27272A' }}
              >
                Edit
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={generating ? <CircularProgress size={16} /> : <PrintIcon />}
              onClick={() => handleGenerate(pdfGenerationItems)}
              disabled={generating || !canGeneratePdfs}
              size="small"
              sx={{
                borderColor: '#E3E3E7',
                color: '#27272A',
                minHeight: 32,
                px: 1.5,
                fontSize: '0.8125rem',
              }}
            >
              {generating ? 'Generating...' : 'Generate All Eligible'}
            </Button>
            {generating && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelOutlinedIcon />}
                onClick={handleCancelGeneration}
                size="small"
                sx={{
                  minHeight: 32,
                  px: 1.5,
                  fontSize: '0.8125rem',
                }}
              >
                Cancel
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {hasAIFlag && (
        <Alert
          severity="error"
          icon={<WarningAmberIcon />}
          sx={{
            mb: 3,
            borderRadius: '12px',
            bgcolor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            '& .MuiAlert-icon': { color: '#EF4444' },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#991B1B', mb: 0.5 }}>
            Batch Status: AI Flagged
          </Typography>
          <Typography variant="body2" sx={{ color: '#991B1B' }}>
            One or more items in this order need review before production.
          </Typography>
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3, borderRadius: '12px', border: '1px solid #E3E3E7', boxShadow: 'none' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2.5 }}>
          <InfoStat icon={<CalendarTodayOutlinedIcon fontSize="small" />} label="Payment Date" value={formatDate(order.date, true)} />
          <InfoStat icon={<LocalShippingOutlinedIcon fontSize="small" />} label="Ship By" value={formatDate(order.shipByDate)} />
          <InfoStat icon={<Inventory2OutlinedIcon fontSize="small" />} label="Items" value={`${order.totalItems} item${order.totalItems === 1 ? '' : 's'} / Qty ${order.totalQuantity}`} />
          <InfoStat icon={<ReceiptLongOutlinedIcon fontSize="small" />} label="Total" value={formatMoney(order.total)} />
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <DetailPanel
            title="Order Items"
            icon={<Inventory2OutlinedIcon sx={{ color: '#71717A' }} />}
            action={canManage && canGeneratePdfs ? (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleSelectAllPdfItems}
                  disabled={generating || selectedPdfItemIds.length === pdfGenerationItemIds.length}
                  sx={{ color: '#5B21D6', fontWeight: 700, textTransform: 'none' }}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setSelectedPdfItemIds([])}
                  disabled={generating || selectedPdfItemIds.length === 0}
                  sx={{ color: '#71717A', fontWeight: 700, textTransform: 'none' }}
                >
                  Clear
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={generating ? <CircularProgress size={14} /> : <PrintIcon />}
                  onClick={() => handleGenerate(selectedPdfItems, true)}
                  disabled={generating || selectedPdfItems.length === 0}
                  sx={{ borderColor: '#E3E3E7', color: '#27272A', fontWeight: 700 }}
                >
                  {generating ? 'Generating...' : `Generate Selected${selectedPdfItems.length ? ` (${selectedPdfItems.length})` : ''}`}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={generating ? <CircularProgress size={14} /> : <PrintIcon />}
                  onClick={() => handleGenerate(pdfGenerationItems)}
                  disabled={generating || pdfGenerationItems.length === 0}
                  sx={{ borderColor: '#E3E3E7', color: '#27272A', fontWeight: 700 }}
                >
                  Generate All Eligible
                </Button>
              </Box>
            ) : null}
          >
            {order.items.map((item, index) => (
              <ItemBlock
                key={item.id}
                item={item}
                index={index}
                generationSelectable={canManage && canSelectItemForPdfGeneration(item)}
                generationSelected={selectedPdfItemIds.includes(itemSourceId(item))}
                onToggleGeneration={handleTogglePdfItem}
              />
            ))}
          </DetailPanel>

          <DetailPanel title="Activity" icon={<CheckCircleIcon sx={{ color: '#71717A' }} />}>
            {group.events?.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {group.events.slice(0, 8).map((event) => (
                  <Box key={event._id} sx={{ p: 1.5, bgcolor: '#FAFAFA', borderRadius: '8px', border: '1px solid #E3E3E7' }}>
                    <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 700 }}>
                      {String(event.type || event.action || 'Order update').replace(/_/g, ' ')}
                    </Typography>
                    {event.note && (
                      <Typography variant="body2" sx={{ color: '#71717A', mt: 0.25 }}>
                        {event.note}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: '#A1A1AA' }}>
                      {formatDate(event.createdAt, true)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#A1A1AA' }}>No activity yet.</Typography>
            )}
          </DetailPanel>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <DetailPanel title="Customer" icon={<PersonOutlineOutlinedIcon sx={{ color: '#71717A' }} />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: '#F97316', fontSize: '1rem', fontWeight: 700 }}>
                {getInitials(order.buyerName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#27272A' }}>
                  {order.buyerName || '-'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#71717A', wordBreak: 'break-word' }}>
                  {order.buyerEmail || '-'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <InfoStat icon={<EmailOutlinedIcon fontSize="small" />} label="Email" value={order.buyerEmail} />
              <InfoStat icon={<PhoneOutlinedIcon fontSize="small" />} label="Phone" value={group.shippingAddress?.phone} />
            </Box>
          </DetailPanel>

          <DetailPanel title="Shipping" icon={<LocationOnOutlinedIcon sx={{ color: '#71717A' }} />}>
            {shippingLines.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {shippingLines.map((line, index) => (
                  <Typography key={`${line}-${index}`} variant="body2" sx={{ color: index === 0 ? '#27272A' : '#71717A', fontWeight: index === 0 ? 700 : 400 }}>
                    {line}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#A1A1AA' }}>No shipping address.</Typography>
            )}
          </DetailPanel>

          <DetailPanel title="Payment" icon={<ReceiptLongOutlinedIcon sx={{ color: '#71717A' }} />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <PaymentRow label="Subtotal" value={formatMoney(subtotal)} />
              <PaymentRow label="Shipping" value={formatMoney(shipping)} />
              <PaymentRow label="Tax" value={formatMoney(tax)} />
              <Divider />
              <PaymentRow label="Order Total" value={formatMoney(order.total)} strong />
            </Box>
          </DetailPanel>

          <DetailPanel title="Notes" icon={<NotesOutlinedIcon sx={{ color: '#71717A' }} />}>
            <Typography variant="body2" sx={{ color: group.notes ? '#27272A' : '#A1A1AA', whiteSpace: 'pre-wrap' }}>
              {group.notes || 'No notes for this order.'}
            </Typography>
          </DetailPanel>
        </Box>
      </Box>

      {canManage && (
        <OrderFormDialog
          open={editOpen}
          mode="edit"
          activeStore={activeStore}
          orderGroup={group}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            fetchGroup()
          }}
        />
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
