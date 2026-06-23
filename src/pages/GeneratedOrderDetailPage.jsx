import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Snackbar,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import PrintIcon from '@mui/icons-material/Print'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SyncIcon from '@mui/icons-material/Sync'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import api from '../lib/api'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import Etsy2StatusBadge from '../components/etsy2/Etsy2StatusBadge'
import { ITEM_STATUSES } from '../lib/etsy2Constants'
import { buildAssetThumbnailUrl } from '../lib/assets'
import {
  buildGeneratedPreviewAssets,
  getGeneratedOrderItems,
} from '../lib/generatedOrders'
import { getCancelableLuluSourceIds, isLuluCancelable } from '../lib/luluOrders'
import {
  isPdfGenerationJobActive,
  listPdfGenerationJobs,
  startPdfGenerationJob,
} from '../lib/pdfGenerationJobs'
import {
  addressLines,
  formatDate,
  formatMoney,
  optionText,
  reviewFlagsFor,
  toEtsy2GroupOrder,
} from '../lib/etsy2Orders'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'

const isImageUrl = (value = '') => /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value)
const valueOrDash = (value) => value || '-'
const itemSourceId = (item) => item?.sourceOrder?._id || item?.id || ''
const isMissingMappedItem = (item) =>
  item?.status === ITEM_STATUSES.MAPPED && Boolean(item?.sourceOrder?.isProductMapped)

function GeneratedPdfPreview({ asset }) {
  if (!asset?.url) {
    return (
      <Box sx={{ height: { xs: 420, lg: 620 }, bgcolor: '#1F2933', borderRadius: '8px', display: 'grid', placeItems: 'center', color: '#CBD5E1' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>No generated PDF available for the selected item</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: { xs: 460, lg: 660 }, bgcolor: '#1F2933', borderRadius: '8px', overflow: 'hidden', border: '1px solid #111827' }}>
      {isImageUrl(asset.url) ? (
        <Box component="img" src={buildAssetThumbnailUrl(asset.url, 1200)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: '#111827' }} />
      ) : (
        <Box component="iframe" title={asset.label} src={asset.url} sx={{ width: '100%', height: '100%', border: 0, bgcolor: '#1F2933' }} />
      )}
    </Box>
  )
}

function GeneratedThumb({ asset, active, checked, index, onClick, onToggle }) {
  return (
    <Box onClick={onClick} sx={{ width: 112, cursor: 'pointer', textAlign: 'center' }}>
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
          px: 1,
          position: 'relative',
        }}
      >
        <Checkbox
          size="small"
          checked={checked}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onToggle?.(asset.id, event.target.checked)}
          sx={{
            position: 'absolute',
            top: 2,
            left: 2,
            bgcolor: 'rgba(255,255,255,0.88)',
            borderRadius: '4px',
            p: 0.25,
            color: '#5B21D6',
            '&.Mui-checked': { color: '#5B21D6' },
          }}
        />
        <Typography variant="caption" sx={{ color: '#334155', fontWeight: 800, textAlign: 'center' }}>
          {asset.label}
        </Typography>
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

function ItemSummary({ item, index, active, generationSelected, onSelect, onToggleGeneration }) {
  const source = item.sourceOrder || {}
  const flags = reviewFlagsFor(source)
  const itemId = itemSourceId(item)
  const canGenerate = isMissingMappedItem(item)

  return (
    <Box
      onClick={onSelect}
      sx={{
        p: 1.5,
        mx: -1.5,
        borderRadius: '8px',
        border: '1px solid',
        borderColor: active ? '#5B21D6' : 'transparent',
        bgcolor: active ? '#F5F3FF' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {index > 0 && <Divider sx={{ my: 2 }} />}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0, flex: '1 1 320px' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
            {canGenerate && (
              <Checkbox
                size="small"
                checked={generationSelected}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onToggleGeneration?.(itemId, event.target.checked)}
                sx={{ color: '#5B21D6', '&.Mui-checked': { color: '#5B21D6' }, p: 0.25 }}
              />
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#111827' }}>
                {item.name}
              </Typography>
            </Box>
            <Etsy2StatusBadge status={item.status} showIcon={false} />
            {canGenerate && <Chip size="small" color="info" label="Ready to generate" />}
          </Box>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            {optionText(source) || source.matchedVariantName || 'Print-ready PDF'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.25 }}>
            <Chip size="small" variant="outlined" label={`Txn: ${valueOrDash(source.etsyItemId)}`} />
            <Chip size="small" variant="outlined" label={`Listing: ${valueOrDash(source.listingId)}`} />
            <Chip size="small" variant="outlined" label={`Qty: ${source.quantity || 1}`} />
          </Box>
          {flags.length > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '8px' }}>
              {flags.join(' | ')}
            </Alert>
          )}
          {source.luluStatus && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.25 }}>
              <Chip size="small" variant="outlined" label={`Lulu: ${source.luluStatus}`} />
              {source.luluRawStatusName && <Chip size="small" variant="outlined" label={`Raw: ${source.luluRawStatusName}`} />}
              {isLuluCancelable(source) && <Chip size="small" color="warning" label="Cancelable" />}
            </Box>
          )}
          {source.luluStatus === 'failed' && source.luluErrorMessage && (
            <Alert severity="error" icon={<WarningAmberOutlinedIcon />} sx={{ mt: 1.5, borderRadius: '8px' }}>
              {source.luluErrorMessage}
            </Alert>
          )}
        </Box>
        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Typography variant="caption" sx={{ color: '#64748B' }}>Template</Typography>
          <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700, mb: 1 }}>
            {source.matchedVariantName || source.projectName || 'Print Template'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>POD package ID</Typography>
          <Typography variant="body2" sx={{ color: '#111827', fontWeight: 700 }}>
            {valueOrDash(source.podPackageId)}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

export default function GeneratedOrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [activeItemId, setActiveItemId] = useState('')
  const [activeAssetId, setActiveAssetId] = useState('')
  const [selectedAssetIds, setSelectedAssetIds] = useState([])
  const [selectedGenerateItemIds, setSelectedGenerateItemIds] = useState([])
  const [editOpen, setEditOpen] = useState(false)
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false)
  const [generationJob, setGenerationJob] = useState(null)
  const completedGenerationJobIdsRef = useRef(new Set())
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchGroup = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const { data } = await api.get(`/orders/group/${encodeURIComponent(orderId)}`)
      setGroup(data)
      return data
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to load generated order', severity: 'error' })
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
      const job = generationJob?.id
        ? jobs.find((item) => item.id === generationJob.id)
        : jobs.find((item) => item.etsyOrderId === orderId && isPdfGenerationJobActive(item))
      if (!job) return

      setGenerationJob(job)
      if (
        ['succeeded', 'failed', 'cancelled'].includes(job.status) &&
        !completedGenerationJobIdsRef.current.has(job.id)
      ) {
        completedGenerationJobIdsRef.current.add(job.id)
        await fetchGroup()
        setSnack({
          open: true,
          message: job.status === 'succeeded'
            ? 'Generated PDFs were regenerated.'
            : job.error || job.message || 'PDF regeneration did not complete.',
          severity: job.status === 'succeeded' ? 'success' : 'error',
        })
      }
    } catch {
      // Keep the generated detail page usable if job polling briefly fails.
    }
  }, [fetchGroup, generationJob?.id, orderId])

  const order = useMemo(() => (group ? toEtsy2GroupOrder(group) : null), [group])
  const allItems = useMemo(() => order?.items || [], [order])
  const generatedItems = useMemo(() => getGeneratedOrderItems(order), [order])
  const regenerating = isPdfGenerationJobActive(generationJob)
  const cancelableLuluSourceIds = useMemo(() => getCancelableLuluSourceIds(order), [order])

  useEffect(() => {
    refreshGenerationJob()
  }, [refreshGenerationJob])

  useEffect(() => {
    if (!regenerating) return undefined
    const timer = window.setInterval(refreshGenerationJob, 2500)
    return () => window.clearInterval(timer)
  }, [regenerating, refreshGenerationJob])

  const previewAssets = useMemo(() => buildGeneratedPreviewAssets(order), [order])
  const selectedAssets = useMemo(
    () => previewAssets.filter((asset) => selectedAssetIds.includes(asset.id)),
    [previewAssets, selectedAssetIds]
  )
  const selectedAssetItemIds = useMemo(
    () => [...new Set(selectedAssets.map((asset) => asset.itemId).filter(Boolean))],
    [selectedAssets]
  )
  const selectedRegenerateOrderIds = useMemo(
    () => [...new Set(selectedAssets
      .filter((asset) => asset?.item?.sourceOrder?.isProductMapped)
      .map((asset) => asset.itemId)
      .filter(Boolean))],
    [selectedAssets]
  )
  const missingMappedItems = useMemo(() => allItems.filter(isMissingMappedItem), [allItems])
  const selectedGenerateOrderIds = useMemo(
    () => selectedGenerateItemIds.filter((itemId) => missingMappedItems.some((item) => itemSourceId(item) === itemId)),
    [missingMappedItems, selectedGenerateItemIds]
  )
  const canRegenerate = canManage && selectedRegenerateOrderIds.length > 0
  const activeItemAssets = useMemo(
    () => previewAssets.filter((asset) => asset.itemId === activeItemId),
    [activeItemId, previewAssets]
  )

  useEffect(() => {
    const validItemIds = allItems.map(itemSourceId).filter(Boolean)
    const firstGeneratedItemId = previewAssets[0]?.itemId
    const firstItemId = firstGeneratedItemId || validItemIds[0] || ''
    if (!firstItemId) {
      setActiveItemId('')
      return
    }
    if (!activeItemId || !validItemIds.includes(activeItemId)) {
      setActiveItemId(firstItemId)
    }
  }, [activeItemId, allItems, previewAssets])

  useEffect(() => {
    if (!activeItemAssets.length) {
      setActiveAssetId('')
      return
    }
    if (!activeItemAssets.some((asset) => asset.id === activeAssetId)) {
      setActiveAssetId(activeItemAssets[0].id)
    }
  }, [activeAssetId, activeItemAssets])

  useEffect(() => {
    setSelectedAssetIds((current) => {
      const validIds = previewAssets.map((asset) => asset.id)
      const next = current.filter((id) => validIds.includes(id))
      return next.length ? next : validIds.slice(0, 1)
    })
  }, [previewAssets])

  useEffect(() => {
    setSelectedGenerateItemIds((current) => {
      const validIds = missingMappedItems.map(itemSourceId)
      return current.filter((id) => validIds.includes(id))
    })
  }, [missingMappedItems])

  const activeAsset = activeItemAssets.find((asset) => asset.id === activeAssetId) || activeItemAssets[0] || null
  const activeItem = allItems.find((item) => itemSourceId(item) === activeItemId) || activeAsset?.item || generatedItems[0] || null
  const activeSource = activeItem?.sourceOrder || {}
  const shippingLines = addressLines(group?.shippingAddress)
  const subtotal = group?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0) || 0
  const shipping = Number(group?.pricing?.shipping || group?.items?.[0]?.shippingCost || 0)
  const tax = Number(group?.pricing?.tax || 0)

  const toggleAssetSelection = (assetId, checked) => {
    setSelectedAssetIds((current) => {
      const next = checked
        ? [...new Set([...current, assetId])]
        : current.filter((id) => id !== assetId)
      if (checked) setActiveAssetId(assetId)
      return next
    })
  }

  const toggleGenerateSelection = (itemId, checked) => {
    setSelectedGenerateItemIds((current) => (
      checked ? [...new Set([...current, itemId])] : current.filter((id) => id !== itemId)
    ))
  }

  const handleSelectItem = (item) => {
    const nextItemId = itemSourceId(item)
    setActiveItemId(nextItemId)
    const firstAsset = previewAssets.find((asset) => asset.itemId === nextItemId)
    setActiveAssetId(firstAsset?.id || '')
  }

  const handleEditPdf = () => {
    const editableAsset = activeAsset
    const itemId = editableAsset?.itemId || activeSource?._id || activeItem?.sourceOrder?._id || activeItem?.id
    if (!itemId) {
      setSnack({ open: true, message: 'This generated item could not be opened for editing.', severity: 'warning' })
      return
    }
    const kind = editableAsset?.kind === 'interior' ? 'interior' : 'cover'
    navigate(`/orders/etsy2/${encodeURIComponent(order.orderId)}/canvas?source=generated&itemId=${encodeURIComponent(itemId)}&kind=${kind}`)
  }

  const handleSendToLulu = async () => {
    const sourceIds = selectedAssetItemIds
    if (sourceIds.length === 0) {
      setSnack({ open: true, message: 'Select one or more generated PDFs before sending to Lulu.', severity: 'warning' })
      return
    }

    setSending(true)
    try {
      const { data } = await api.post('/lulu/bulk-submit', { orderIds: sourceIds })
      await fetchGroup()
      setSnack({
        open: true,
        message: `${data.submitted || 0} of ${sourceIds.length} item${sourceIds.length === 1 ? '' : 's'} sent to Lulu.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to send order to Lulu',
        severity: 'error',
      })
    } finally {
      setSending(false)
    }
  }

  const handleCancelLulu = async () => {
    if (cancelableLuluSourceIds.length === 0) {
      setSnack({ open: true, message: 'This order has no Lulu jobs that can still be cancelled.', severity: 'warning' })
      return
    }
    if (!window.confirm(`Cancel ${cancelableLuluSourceIds.length} Lulu print job${cancelableLuluSourceIds.length === 1 ? '' : 's'} for order #${order.orderId}?`)) return

    setCancelling(true)
    try {
      const { data } = await api.post('/lulu/bulk-cancel', { orderIds: cancelableLuluSourceIds })
      await fetchGroup()
      setSnack({
        open: true,
        message: `${data.cancelled || 0} of ${cancelableLuluSourceIds.length} Lulu job${cancelableLuluSourceIds.length === 1 ? '' : 's'} cancelled.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to cancel Lulu order',
        severity: 'error',
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleDownloadPdfs = async () => {
    const freshGroup = await fetchGroup({ silent: true })
    const freshOrder = freshGroup ? toEtsy2GroupOrder(freshGroup) : order
    const freshAssets = buildGeneratedPreviewAssets(freshOrder)
    const assetsToDownload = freshAssets.filter((asset) => selectedAssetIds.includes(asset.id))

    if (assetsToDownload.length === 0) {
      setSnack({ open: true, message: 'Select one or more generated PDFs before downloading.', severity: 'warning' })
      return
    }

    assetsToDownload.forEach((asset) => {
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

  const handleRegeneratePdfs = async () => {
    if (!order?.orderId) return
    if (!canRegenerate) {
      setSnack({ open: true, message: 'Select one or more generated PDFs before regenerating.', severity: 'warning' })
      return
    }

    try {
      const job = await startPdfGenerationJob(order.orderId, { force: true, orderIds: selectedRegenerateOrderIds })
      setGenerationJob(job)
      setRegenerateConfirmOpen(false)
      setSnack({
        open: true,
        message: 'PDF regeneration started. You can leave this page and it will keep running.',
        severity: 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to regenerate PDFs',
        severity: 'error',
      })
    }
  }

  const handleGenerateSelectedItems = async () => {
    if (!order?.orderId) return
    if (selectedGenerateOrderIds.length === 0) {
      setSnack({ open: true, message: 'Select one or more missing mapped items before generating.', severity: 'warning' })
      return
    }

    try {
      const job = await startPdfGenerationJob(order.orderId, { force: false, orderIds: selectedGenerateOrderIds })
      setGenerationJob(job)
      setSnack({
        open: true,
        message: `PDF generation started for ${selectedGenerateOrderIds.length} selected item${selectedGenerateOrderIds.length === 1 ? '' : 's'}.`,
        severity: 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate PDFs',
        severity: 'error',
      })
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!order || !group || generatedItems.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders/generated')}>Back to Generated PDFs</Button>
        <Alert severity="error" sx={{ mt: 2 }}>Generated order not found.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders/generated')} sx={{ color: '#64748B', fontWeight: 700 }}>
          Back to Generated PDFs
        </Button>
        <Button variant="outlined" startIcon={<OpenInNewOutlinedIcon />} onClick={() => navigate(`/orders/etsy2/${encodeURIComponent(order.orderId)}`)} sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700 }}>
          Open Etsy Order
        </Button>
      </Box>

      <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', p: { xs: 2, md: 3 }, display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1fr) 400px' }, gap: 3 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', fontSize: { xs: '1.6rem', md: '2rem' } }}>
                Order #{order.orderId}
              </Typography>
              <Etsy2StatusBadge status={activeItem?.status} showIcon={false} />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.75 }}>
              {allItems.length} item{allItems.length === 1 ? '' : 's'} in this order. {generatedItems.length} generated item{generatedItems.length === 1 ? '' : 's'} with {previewAssets.length} previewable PDF{previewAssets.length === 1 ? '' : 's'}.
            </Typography>
          </Box>

          {activeSource.luluStatus === 'failed' && activeSource.luluErrorMessage && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
              Lulu rejected this item: {activeSource.luluErrorMessage}
            </Alert>
          )}

          <GeneratedPdfPreview asset={activeAsset} />

          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 700, mt: 2 }}>
            Showing generated PDFs for {activeItem?.name || activeSource.productTitle || 'selected item'}.
          </Typography>

          {activeItemAssets.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
              {activeItemAssets.map((asset, index) => (
                <GeneratedThumb
                  key={asset.id}
                  asset={asset}
                  index={index}
                  active={asset.id === activeAsset?.id}
                  checked={selectedAssetIds.includes(asset.id)}
                  onClick={() => setActiveAssetId(asset.id)}
                  onToggle={toggleAssetSelection}
                />
              ))}
            </Box>
          ) : (
            <Alert severity="warning" sx={{ mt: 2.5, borderRadius: '8px' }}>
              This item does not have a generated PDF URL. Product library PDFs are intentionally hidden here.
            </Alert>
          )}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Paper sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
              Active PDF Details
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
              {selectedAssets.length} generated PDF{selectedAssets.length === 1 ? '' : 's'} checked. Editing opens the active PDF only.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
              {[
                ['Order ID', `#${order.orderId}`],
                ['Buyer', order.buyerName],
                ['File', activeAsset?.label],
                ['Template', activeSource.matchedVariantName || activeSource.projectName || 'Print Template'],
                ['Generated Date', formatDate(activeSource.templateFinalizedAt || activeSource.updatedAt || order.date, true)],
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>{label}</Typography>
                  <Typography variant="body2" sx={{ color: '#334155', fontWeight: 700, textAlign: 'right' }}>{valueOrDash(value)}</Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 3 }}>
              {canManage && (
                <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={handleEditPdf} disabled={!activeAsset} sx={{ bgcolor: '#5B21D6', borderRadius: '6px', fontWeight: 800, '&:hover': { bgcolor: '#4C1D95' } }}>
                  Edit Active PDF
                </Button>
              )}
              {canManage && missingMappedItems.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={regenerating ? <CircularProgress size={16} /> : <PrintIcon />}
                  onClick={handleGenerateSelectedItems}
                  disabled={regenerating || selectedGenerateOrderIds.length === 0}
                  sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}
                >
                  {regenerating ? 'Generating...' : `Generate Selected Items${selectedGenerateOrderIds.length ? ` (${selectedGenerateOrderIds.length})` : ''}`}
                </Button>
              )}
              {canManage && (
                <Button
                  variant="outlined"
                  startIcon={regenerating ? <CircularProgress size={16} /> : <SyncIcon />}
                  onClick={() => setRegenerateConfirmOpen(true)}
                  disabled={regenerating || !canRegenerate}
                  sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}
                >
                  {regenerating ? 'Regenerating...' : `Regenerate Checked PDFs${selectedRegenerateOrderIds.length ? ` (${selectedRegenerateOrderIds.length})` : ''}`}
                </Button>
              )}
              {canManage && (
                <Button variant="outlined" startIcon={<DescriptionOutlinedIcon />} onClick={() => setEditOpen(true)} sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}>
                  Edit Order Details
                </Button>
              )}
              {canManage && (
                <Button
                  variant="contained"
                  startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <LocalShippingOutlinedIcon />}
                  onClick={handleSendToLulu}
                  disabled={sending}
                  sx={{ bgcolor: activeItem?.status === 'failed' ? '#DC2626' : '#16A34A', borderRadius: '6px', fontWeight: 800, '&:hover': { bgcolor: activeItem?.status === 'failed' ? '#B91C1C' : '#15803D' } }}
                >
                  {sending ? 'Sending...' : activeItem?.status === 'failed' ? 'Resend Checked to Lulu' : 'Send Checked to Lulu'}
                </Button>
              )}
              {canManage && cancelableLuluSourceIds.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={cancelling ? <CircularProgress size={16} /> : <CancelOutlinedIcon />}
                  onClick={handleCancelLulu}
                  disabled={cancelling}
                  sx={{ borderRadius: '6px', fontWeight: 800 }}
                >
                  {cancelling ? 'Cancelling Lulu...' : 'Cancel Lulu'}
                </Button>
              )}
              <Button variant="outlined" startIcon={<OpenInNewOutlinedIcon />} onClick={() => activeAsset?.url && window.open(activeAsset.url, '_blank', 'noopener,noreferrer')} disabled={!activeAsset?.url} sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}>
                Preview PDF
              </Button>
              <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={handleDownloadPdfs} sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}>
                Download Checked PDFs
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PersonOutlineOutlinedIcon sx={{ color: '#0F172A' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>Customer</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 800 }}>{order.buyerName || '-'}</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.75 }}>{order.buyerEmail || '-'}</Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 1.25, whiteSpace: 'pre-line' }}>
              {shippingLines.join('\n') || 'No shipping address'}
            </Typography>
          </Paper>

          <Paper sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ReceiptLongOutlinedIcon sx={{ color: '#0F172A' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>Payment</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Typography variant="body2" sx={{ color: '#64748B' }}>Subtotal</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(subtotal)}</Typography></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Typography variant="body2" sx={{ color: '#64748B' }}>Shipping</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(shipping)}</Typography></Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Typography variant="body2" sx={{ color: '#64748B' }}>Tax</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(tax)}</Typography></Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 800 }}>Order Total</Typography><Typography variant="body2" sx={{ fontWeight: 800 }}>{formatMoney(order.total)}</Typography></Box>
            </Box>
          </Paper>
        </Box>
      </Box>

      <Paper sx={{ mt: 3, p: 3, borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
          Order Items
        </Typography>
        {missingMappedItems.length > 0 && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
            Select mapped items here, then use Generate Selected Items to create only the missing PDFs.
          </Alert>
        )}
        {allItems.map((item, index) => (
          <ItemSummary
            key={item.id}
            item={item}
            index={index}
            active={itemSourceId(item) === activeItemId}
            generationSelected={selectedGenerateItemIds.includes(itemSourceId(item))}
            onSelect={() => handleSelectItem(item)}
            onToggleGeneration={toggleGenerateSelection}
          />
        ))}
      </Paper>

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
            setSnack({ open: true, message: 'Order details updated. You can resend the order now.', severity: 'success' })
          }}
        />
      )}

      <Dialog open={regenerateConfirmOpen} onClose={() => setRegenerateConfirmOpen(false)}>
        <DialogTitle>Regenerate Checked PDFs</DialogTitle>
        <DialogContent>
          <Typography>
            Existing generated PDFs for {selectedRegenerateOrderIds.length} checked item{selectedRegenerateOrderIds.length === 1 ? '' : 's'} will be replaced with new files from the currently mapped product.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegenerateConfirmOpen(false)} sx={{ color: '#111827', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={regenerating ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            onClick={handleRegeneratePdfs}
            disabled={regenerating}
            sx={{ bgcolor: '#5B21D6', borderRadius: '6px', fontWeight: 800, '&:hover': { bgcolor: '#4C1D95' } }}
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>

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
