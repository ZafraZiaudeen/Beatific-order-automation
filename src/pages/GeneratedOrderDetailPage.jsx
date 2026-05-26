import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import api from '../lib/api'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import Etsy2StatusBadge from '../components/etsy2/Etsy2StatusBadge'
import { buildAssetThumbnailUrl } from '../lib/assets'
import {
  getGeneratedOrderItems,
  getGeneratedOrderSourceIds,
} from '../lib/generatedOrders'
import {
  addressLines,
  buildOrderFileUrl,
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

function GeneratedPdfPreview({ asset }) {
  if (!asset?.url) {
    return (
      <Box sx={{ height: { xs: 420, lg: 620 }, bgcolor: '#1F2933', borderRadius: '8px', display: 'grid', placeItems: 'center', color: '#CBD5E1' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>No generated PDF available</Typography>
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

function GeneratedThumb({ asset, active, index, onClick }) {
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
        }}
      >
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

function ItemSummary({ item, index }) {
  const source = item.sourceOrder || {}
  const flags = reviewFlagsFor(source)

  return (
    <Box>
      {index > 0 && <Divider sx={{ my: 2 }} />}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#111827' }}>
              {item.name}
            </Typography>
            <Etsy2StatusBadge status={item.status} showIcon={false} />
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
  const [activeAssetId, setActiveAssetId] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchGroup = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/orders/group/${encodeURIComponent(orderId)}`)
      setGroup(data)
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to load generated order', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  const order = useMemo(() => (group ? toEtsy2GroupOrder(group) : null), [group])
  const generatedItems = useMemo(() => getGeneratedOrderItems(order), [order])

  const previewAssets = useMemo(
    () => generatedItems.flatMap((item) => {
      const source = item.sourceOrder || {}
      return [
        source.coverImageUrl ? {
          id: `${item.id}-cover`,
          itemId: source._id,
          item,
          kind: 'cover',
          label: `${item.name} Cover`,
          url: buildOrderFileUrl(source.coverImageUrl),
          fileName: `${item.name || 'Cover'}.pdf`,
        } : null,
        source.interiorPdfUrl ? {
          id: `${item.id}-interior`,
          itemId: source._id,
          item,
          kind: 'interior',
          label: `${item.name} Inside`,
          url: buildOrderFileUrl(source.interiorPdfUrl),
          fileName: `${item.name || 'Inside Pages'} inside.pdf`,
        } : null,
      ].filter(Boolean)
    }),
    [generatedItems]
  )

  useEffect(() => {
    if (!previewAssets.length) {
      setActiveAssetId('')
      return
    }
    if (!previewAssets.some((asset) => asset.id === activeAssetId)) {
      setActiveAssetId(previewAssets[0].id)
    }
  }, [activeAssetId, previewAssets])

  const activeAsset = previewAssets.find((asset) => asset.id === activeAssetId) || previewAssets[0] || null
  const activeItem = activeAsset?.item || generatedItems[0] || null
  const activeSource = activeItem?.sourceOrder || {}
  const shippingLines = addressLines(group?.shippingAddress)
  const subtotal = group?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0) || 0
  const shipping = Number(group?.pricing?.shipping || group?.items?.[0]?.shippingCost || 0)
  const tax = Number(group?.pricing?.tax || 0)

  const handleEditPdf = () => {
    const itemQuery = activeAsset?.itemId ? `?source=generated&itemId=${encodeURIComponent(activeAsset.itemId)}` : '?source=generated'
    navigate(`/orders/etsy2/${encodeURIComponent(order.orderId)}/canvas${itemQuery}`)
  }

  const handleSendToLulu = async () => {
    const sourceIds = getGeneratedOrderSourceIds(order)
    if (sourceIds.length === 0) {
      setSnack({ open: true, message: 'No generated PDFs are available to send.', severity: 'warning' })
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

  const handleDownloadPdfs = () => {
    if (previewAssets.length === 0) {
      setSnack({ open: true, message: 'No generated PDFs are available to download.', severity: 'warning' })
      return
    }

    previewAssets.forEach((asset) => {
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
              Generated files for {generatedItems.length} item{generatedItems.length === 1 ? '' : 's'} with {previewAssets.length} PDF preview{previewAssets.length === 1 ? '' : 's'}.
            </Typography>
          </Box>

          {activeSource.luluStatus === 'failed' && activeSource.luluErrorMessage && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>
              Lulu rejected this item: {activeSource.luluErrorMessage}
            </Alert>
          )}

          <GeneratedPdfPreview asset={activeAsset} />

          <Box sx={{ display: 'flex', gap: 2, mt: 2.5, flexWrap: 'wrap' }}>
            {previewAssets.map((asset, index) => (
              <GeneratedThumb
                key={asset.id}
                asset={asset}
                index={index}
                active={asset.id === activeAsset?.id}
                onClick={() => setActiveAssetId(asset.id)}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Paper sx={{ p: 2.5, borderRadius: '10px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
              Active PDF Details
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
                <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={handleEditPdf} sx={{ bgcolor: '#5B21D6', borderRadius: '6px', fontWeight: 800, '&:hover': { bgcolor: '#4C1D95' } }}>
                  Edit PDF
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
                  {sending ? 'Sending...' : activeItem?.status === 'failed' ? 'Resend to Lulu' : 'Send to Lulu'}
                </Button>
              )}
              <Button variant="outlined" startIcon={<OpenInNewOutlinedIcon />} onClick={() => activeAsset?.url && window.open(activeAsset.url, '_blank', 'noopener,noreferrer')} disabled={!activeAsset?.url} sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}>
                Preview PDF
              </Button>
              <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={handleDownloadPdfs} sx={{ borderColor: '#E5E7EB', color: '#111827', borderRadius: '6px', fontWeight: 800 }}>
                Download PDFs
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
          Generated Items
        </Typography>
        {generatedItems.map((item, index) => (
          <ItemSummary key={item.id} item={item} index={index} />
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
