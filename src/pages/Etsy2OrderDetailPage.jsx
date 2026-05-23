import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
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
import EditIcon from '@mui/icons-material/Edit'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PrintIcon from '@mui/icons-material/Print'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SyncIcon from '@mui/icons-material/Sync'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { buildAssetThumbnailUrl } from '../lib/assets'
import LuluReviewDialog from '../components/orders/LuluReviewDialog'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import TemplatePersonalizationDialog from '../components/orders/TemplatePersonalizationDialog'
import Etsy2StatusBadge from '../components/etsy2/Etsy2StatusBadge'
import { deriveBatchStatus } from '../lib/etsy2Constants'
import {
  addressLines,
  buildOrderFileUrl,
  formatDate,
  formatMoney,
  getInitials,
  getItemStatus,
  optionText,
  reviewFlagsFor,
  toEtsy2GroupOrder,
} from '../lib/etsy2Orders'

const valueOrDash = (value) => value || '-'

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

function ItemBlock({ item, index }) {
  const source = item.sourceOrder || {}
  const flags = reviewFlagsFor(source)
  const personalization = Object.entries(source.personalization || {})
  const status = getItemStatus(source)

  return (
    <Box>
      {index > 0 && <Divider sx={{ my: 2 }} />}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '88px minmax(0, 1fr) 160px' }, gap: 2 }}>
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
  const [generating, setGenerating] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateOrder, setTemplateOrder] = useState(null)
  const [templateProduct, setTemplateProduct] = useState(null)
  const [luluOpen, setLuluOpen] = useState(false)
  const [luluOrder, setLuluOrder] = useState(null)
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
    fetchGroup()
  }, [fetchGroup])

  const order = useMemo(() => (group ? toEtsy2GroupOrder(group) : null), [group])
  const batchStatus = order ? deriveBatchStatus(order.items) : null
  const hasAIFlag = order?.items?.some((item) => item.status === 'ai_flagged')
  const shippingLines = addressLines(group?.shippingAddress)
  const subtotal = group?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0) || 0
  const shipping = Number(group?.pricing?.shipping || group?.items?.[0]?.shippingCost || 0)
  const tax = Number(group?.pricing?.tax || 0)
  const generatedItems = group?.items?.filter((item) => item.templateFinalizedAt && (item.coverImageUrl || item.interiorPdfUrl)) || []

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

  const handleGenerate = async () => {
    if (!order?.orderId) return

    setGenerating(true)
    try {
      const { data } = await api.post(`/orders/group/${encodeURIComponent(order.orderId)}/template-finalize`)
      const hasErrors = (data.results || []).some((result) => !result.success)
      const firstError = (data.results || []).find((result) => !result.success)?.error
      await fetchGroup()
      setSnack({
        open: true,
        message: hasErrors ? firstError || 'PDF generation completed with errors.' : 'PDFs generated successfully.',
        severity: hasErrors ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || err.message || 'Failed to generate PDFs',
        severity: 'error',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleOpenTemplate = async (item) => {
    if (!item?.productId) {
      setSnack({ open: true, message: 'Map this item to a product before editing print PDFs.', severity: 'warning' })
      return
    }

    setTemplateOrder(item)
    setTemplateProduct(null)
    setTemplateOpen(true)

    try {
      const { data } = await api.get(`/products/${item.productId}`)
      setTemplateProduct(data)
    } catch (err) {
      setTemplateOpen(false)
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to load product template', severity: 'error' })
    }
  }

  const handleApproveLulu = (item) => {
    setLuluOrder(item)
    setLuluOpen(true)
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
              onClick={handleGenerate}
              disabled={generating}
              sx={{ borderColor: '#E3E3E7', color: '#27272A' }}
            >
              {generating ? 'Generating...' : 'Generate PDFs'}
            </Button>
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
          <DetailPanel title="Order Items" icon={<Inventory2OutlinedIcon sx={{ color: '#71717A' }} />}>
            {order.items.map((item, index) => (
              <ItemBlock key={item.id} item={item} index={index} />
            ))}
          </DetailPanel>

          <DetailPanel
            title="Generated Print PDFs"
            icon={<PictureAsPdfIcon sx={{ color: '#71717A' }} />}
            action={canManage && (
              <Button
                size="small"
                variant="outlined"
                startIcon={generating ? <CircularProgress size={14} /> : <PrintIcon />}
                onClick={handleGenerate}
                disabled={generating}
                sx={{ borderColor: '#E3E3E7', color: '#27272A' }}
              >
                Generate All
              </Button>
            )}
          >
            {group.items.map((item) => {
              const isGenerated = Boolean(item.templateFinalizedAt && (item.coverImageUrl || item.interiorPdfUrl))
              const canSendToLulu = Boolean(isGenerated && item.coverImageUrl && item.interiorPdfUrl && item.podPackageId)
              return (
                <Box key={item._id} sx={{ py: 2, borderTop: '1px solid #E3E3E7', '&:first-of-type': { borderTop: 0, pt: 0 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="subtitle2" sx={{ color: '#27272A', fontWeight: 700 }}>
                          {item.productTitle}
                        </Typography>
                        <Etsy2StatusBadge status={isGenerated ? 'generated' : getItemStatus(item)} />
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: '#71717A', mt: 0.5 }}>
                        POD package: {item.podPackageId || 'Missing'} / Txn {item.etsyItemId || '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {isGenerated && item.coverImageUrl && (
                        <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => window.open(buildOrderFileUrl(item.coverImageUrl), '_blank')}>
                          Generated Cover
                        </Button>
                      )}
                      {isGenerated && item.interiorPdfUrl && (
                        <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => window.open(buildOrderFileUrl(item.interiorPdfUrl), '_blank')}>
                          Generated Interior
                        </Button>
                      )}
                      {canManage && (
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleOpenTemplate(item)}>
                          Edit Values
                        </Button>
                      )}
                      {canManage && item.productId && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/product-library-2/product/${item.productId}/designer`)}
                        >
                          Product Canvas
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!canSendToLulu}
                          onClick={() => handleApproveLulu(item)}
                          sx={{ bgcolor: '#F97316', '&:hover': { bgcolor: '#EA580C' } }}
                        >
                          Approve & Send
                        </Button>
                      )}
                    </Box>
                  </Box>
                  {!canSendToLulu && (
                    <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '8px' }}>
                      Missing {[!isGenerated && 'generated PDFs', isGenerated && !item.coverImageUrl && 'generated cover', isGenerated && !item.interiorPdfUrl && 'generated interior', !item.podPackageId && 'POD package ID'].filter(Boolean).join(', ')} before Lulu submission.
                    </Alert>
                  )}
                </Box>
              )
            })}
            {generatedItems.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                No generated PDFs yet. Generate the ready items, then inspect or edit the cover/interior before approving for Lulu.
              </Alert>
            )}
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

      {canManage && (
        <TemplatePersonalizationDialog
          open={templateOpen}
          order={templateOrder}
          product={templateProduct}
          onClose={() => setTemplateOpen(false)}
          onFinalized={() => {
            setTemplateOpen(false)
            fetchGroup()
          }}
        />
      )}

      {canManage && (
        <LuluReviewDialog
          open={luluOpen}
          order={luluOrder}
          onClose={() => setLuluOpen(false)}
          onSubmitted={() => {
            setLuluOpen(false)
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
