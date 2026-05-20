import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import { alpha } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { buildAssetThumbnailUrl } from '../lib/assets'
import StatusBadge from '../components/orders/StatusBadge'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import LuluReviewDialog from '../components/orders/LuluReviewDialog'
import TemplatePersonalizationDialog from '../components/orders/TemplatePersonalizationDialog'
import AssetInputField from '../components/common/AssetInputField'
import { ETSY_ORDER_STATUSES } from '../lib/constants'

const fmtDate = (value, withTime = false) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

const money = (value) => Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const detailLines = (address = {}) => [
  address.name,
  address.street1,
  address.street2,
  [address.city, address.state, address.zip].filter(Boolean).join(', '),
  address.country,
].filter(Boolean)

const waitingLabel = ({ status, hasUnmapped, hasAiFlags, isProductMapped }) => {
  if (status !== 'waiting') return undefined
  if (hasUnmapped || isProductMapped === false) return 'Waiting (Unmapped)'
  if (hasAiFlags) return 'Waiting (AI Flagged)'
  return 'Waiting'
}

const ORDER_FLOW = [
  { label: 'Review order' },
  { label: 'Preparing order' },
  { label: 'Ready for Lulu' },
  { label: 'Delivered' },
]

const flowIndex = (status) => {
  if (status === 'completed') return 2
  if (status === 'in_progress') return 1
  return 0
}

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'

const avatarColor = (name = '') => {
  const colors = ['#00A76F', '#00B8D9', '#637381', '#FF5630', '#B64839']
  return colors[(name.charCodeAt(0) || 0) % colors.length]
}

function DetailPanel({ icon, title, action, children, sx }) {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: '0 10px 26px rgba(15, 23, 42, 0.035)',
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {icon && (
            <Box sx={{ width: 30, height: 30, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: 'grey.100', color: 'text.secondary' }}>
              {icon}
            </Box>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>{title}</Typography>
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  )
}

function SidePanel({ icon, title, children, accent = false }) {
  return (
    <Box
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: accent ? alpha('#B64839', 0.24) : 'divider',
        borderRadius: 1,
        bgcolor: accent ? alpha('#B64839', 0.045) : 'background.paper',
        boxShadow: '0 8px 22px rgba(15, 23, 42, 0.035)',
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{title}</Typography>
      </Box>
      {children}
    </Box>
  )
}

function ProgressStrip({ status, shop, shipByDate }) {
  const activeIndex = flowIndex(status)
  return (
    <DetailPanel
      title="Fulfillment Progress"
      icon={<LocalShippingOutlinedIcon fontSize="small" />}
      action={shipByDate && (
        <Typography variant="caption" color="text.secondary">
          Ship by {fmtDate(shipByDate)}
        </Typography>
      )}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">Return to {shop || 'store'}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 800 }}>Estimated print prep: 1-3 business days</Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: `repeat(${ORDER_FLOW.length}, 1fr)` }, gap: { xs: 1.25, sm: 0 } }}>
        {ORDER_FLOW.map((step, index) => {
          const complete = index <= activeIndex
          return (
            <Box key={step.label} sx={{ position: 'relative', pb: { sm: 1 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {complete ? (
                  <Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: 'primary.main', display: 'grid', placeItems: 'center' }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'background.paper' }} />
                  </Box>
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                )}
                <Typography variant="caption" sx={{ fontWeight: complete ? 900 : 700, color: complete ? 'text.primary' : 'text.secondary' }}>
                  {step.label}
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 3,
                  borderRadius: 999,
                  bgcolor: complete ? 'primary.main' : 'grey.200',
                  mr: { sm: index === ORDER_FLOW.length - 1 ? 0 : 1.25 },
                }}
              />
            </Box>
          )
        })}
      </Box>
    </DetailPanel>
  )
}

function InfoLine({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      <Box sx={{ color: 'text.disabled', lineHeight: 0, mt: 0.25 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{value || '-'}</Typography>
      </Box>
    </Box>
  )
}

function PaymentRow({ label, value, strong }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant={strong ? 'subtitle1' : 'body2'} sx={{ fontWeight: strong ? 900 : 800, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  )
}

function ItemCard({ item, index, onFillTemplate, onAssetChange, canManage }) {
  const personalization = Object.entries(item.personalization || {})
  const isCustom = item.etsyStatus === 'custom_orders'
  const canFillTemplate = canManage && item.etsyStatus === 'in_progress' && item.productId
  const itemAiFlags = (item.aiFlags || []).filter((flag) => flag !== 'Missing Product Mapping')

  return (
    <Box sx={{ py: 2.25, borderTop: index === 0 ? 0 : '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '88px minmax(0, 1.4fr) minmax(180px, 0.8fr) auto' }, gap: 2, alignItems: 'center' }}>
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {item.coverImageUrl ? (
            <Box component="img" src={buildAssetThumbnailUrl(item.coverImageUrl)} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Typography variant="caption" color="text.disabled">No cover</Typography>
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, fontSize: '0.98rem', lineHeight: 1.35 }}>
            {item.productTitle || `Item ${index + 1}`}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 0.75 }}>
            <Chip label={`SKU: ${item.listingId || '-'}`} size="small" variant="outlined" />
            <Chip label={`Txn: ${item.etsyItemId || '-'}`} size="small" variant="outlined" />
            {!item.isProductMapped && (
              <Chip
                icon={<WarningAmberOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                label="Unmapped"
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary', mb: 0.75 }}>Details</Typography>
          {[item.option1Value && [item.option1Name || 'Option 1', item.option1Value], item.option2Value && [item.option2Name || 'Option 2', item.option2Value]]
            .filter(Boolean)
            .map(([label, value]) => (
              <Typography key={label} variant="body2">{label}: {value}</Typography>
            ))}
          {!item.option1Value && !item.option2Value && <Typography variant="body2" color="text.disabled">No options</Typography>}
          {personalization.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {personalization.length} personalization field{personalization.length === 1 ? '' : 's'}
            </Typography>
          )}
        </Box>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' }, minWidth: 112 }}>
          <StatusBadge
            status={item.etsyStatus}
            size="small"
            label={waitingLabel({
              status: item.etsyStatus,
              isProductMapped: item.isProductMapped,
              hasAiFlags: itemAiFlags.length > 0,
            })}
          />
          {itemAiFlags.length > 0 && (
            <Chip
              icon={<WarningAmberOutlinedIcon sx={{ fontSize: '13px !important' }} />}
              label={`${itemAiFlags.length} AI flag${itemAiFlags.length === 1 ? '' : 's'}`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ mt: 0.75, mb: 0.5, fontWeight: 700 }}
            />
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{money(item.price)}</Typography>
          <Typography variant="body2" color="text.secondary">x {item.quantity || 1}</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.5 }}>
            {money(Number(item.price || 0) * Number(item.quantity || 1))}
          </Typography>
        </Box>
      </Box>

      {personalization.length > 0 && (
        <Box sx={{ mt: 1.5, ml: { md: '104px' }, p: 1.5, borderRadius: 1, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 900, color: 'text.secondary', mb: 0.75 }}>Personalization</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
            {personalization.map(([label, value]) => (
              <Box key={label}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{value}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {(canFillTemplate || (canManage && isCustom)) && (
        <Box sx={{ mt: 1.75, pt: 1.75, borderTop: '1px solid', borderColor: 'divider' }}>
          {canFillTemplate && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Template PDF editing</Typography>
                <Typography variant="body2" color="text.secondary">
                  Fill the marked product-library fields for this transaction item.
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => onFillTemplate(item)}>
                Fill Template
              </Button>
            </Box>
          )}

          {canManage && isCustom && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mt: canFillTemplate ? 2 : 0 }}>
              <AssetInputField
                label="Cover PDF"
                value={item.coverImageUrl || ''}
                folder="covers"
                accept="application/pdf,.pdf"
                allowPdf
                helperText="Upload or link the finished cover PDF for this custom item."
                openLabel="Open cover PDF"
                onChange={(value) => onAssetChange(item, 'coverImageUrl', value)}
              />
              <AssetInputField
                label="Inside Pages PDF"
                value={item.interiorPdfUrl || ''}
                folder="interiors"
                accept="application/pdf,.pdf"
                allowPdf
                helperText="Upload or link the finished inside-pages PDF for this custom item."
                openLabel="Open inside pages PDF"
                onChange={(value) => onAssetChange(item, 'interiorPdfUrl', value)}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default function EtsyOrderDetailPage() {
  const { etsyOrderId } = useParams()
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [luluOpen, setLuluOpen] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateOrder, setTemplateOrder] = useState(null)
  const [templateProduct, setTemplateProduct] = useState(null)

  const fetchGroup = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/orders/group/${encodeURIComponent(etsyOrderId)}`)
      setGroup(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }, [etsyOrderId])

  useEffect(() => { fetchGroup() }, [fetchGroup])

  const first = group?.firstOrder
  const reviewFlags = (group?.aiFlags || []).filter((flag) => flag !== 'Missing Product Mapping')
  const pricing = first?.pricing || {}
  const subtotal = useMemo(() => (
    group?.items?.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0) || 0
  ), [group])
  const shipping = Number(pricing.shipping ?? first?.shippingCost ?? 0)
  const tax = Number(pricing.salesTax || 0)
  const discount = Number(pricing.discount || 0)
  const total = Number(pricing.orderTotal || subtotal + shipping + tax - discount)
  const canSubmitToLulu = first?.etsyStatus === 'completed' && first?.coverImageUrl && first?.interiorPdfUrl && first?.podPackageId
  const shippingLines = detailLines(group?.shippingAddress)
  const statusLabel = waitingLabel({ status: group?.status, hasUnmapped: group?.hasUnmapped, hasAiFlags: reviewFlags.length > 0 })
  const orderNote = group?.notes || first?.buyerNote || first?.notes
  const sideTags = [group?.shop, first?.shippingLevel, first?.luluStatus].filter(Boolean)

  const handleBulkStatus = async (status) => {
    if (!group?.orderIds?.length) return
    setStatusSaving(true)
    try {
      await api.post('/orders/bulk-status', { orderIds: group.orderIds, status })
      await fetchGroup()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status')
    } finally {
      setStatusSaving(false)
    }
  }

  const handleOpenTemplate = async (item) => {
    if (!item?.productId) {
      setError('Map this item to a product before filling template fields.')
      return
    }

    setTemplateOrder(item)
    setTemplateProduct(null)
    setTemplateOpen(true)
    setError('')

    try {
      const { data } = await api.get(`/products/${item.productId}`)
      setTemplateProduct(data)
    } catch (err) {
      setTemplateOpen(false)
      setError(err.response?.data?.message || 'Failed to load mapped product template')
    }
  }

  const handleAssetChange = async (item, field, value) => {
    await api.patch(`/orders/${item._id}`, {
      [field]: value || null,
      hasCustomArtwork: true,
    })
    await fetchGroup()
  }

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton width={180} height={32} />
        <Skeleton width="45%" height={58} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' }, gap: 3 }}>
          <Skeleton height={380} />
          <Skeleton height={380} />
        </Box>
      </Stack>
    )
  }

  if (error && !group) {
    return (
      <Stack spacing={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders/etsy')} sx={{ alignSelf: 'flex-start' }}>Back to Orders</Button>
        <Alert severity="error">{error}</Alert>
      </Stack>
    )
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'stretch', md: 'flex-start' }, flexDirection: { xs: 'column', md: 'row' }, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <IconButton
            onClick={() => navigate('/orders/etsy')}
            sx={{
              mt: 0.25,
              bgcolor: 'grey.100',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'grey.200' },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.15 }}>Order #{group.etsyOrderId}</Typography>
              <StatusBadge status={group.status} label={statusLabel} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Order date {fmtDate(group.orderedAt, true)} / Order from {group.customerName || 'Unknown customer'} / {group.totalItems} item{group.totalItems === 1 ? '' : 's'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
          {canManage && (
            <>
              <FormControl size="small" disabled={statusSaving} sx={{ minWidth: 180 }}>
                <Select value="" displayEmpty onChange={(e) => handleBulkStatus(e.target.value)}>
                  <MenuItem value="" disabled>Move all items...</MenuItem>
                  {ETSY_ORDER_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditOpen(true)}>Edit</Button>
              {canSubmitToLulu ? (
                <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={() => setLuluOpen(true)}>
                  Send to Lulu
                </Button>
              ) : (
                <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} onClick={() => handleBulkStatus('in_progress')} disabled={statusSaving || group.status === 'in_progress'}>
                  Move to In Progress
                </Button>
              )}
            </>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {reviewFlags.length > 0 && (
        <Alert severity="warning" icon={<WarningAmberOutlinedIcon />} sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>AI flagged personalization</Typography>
          <Stack spacing={0.5}>
            {reviewFlags.map((flag) => (
              <Typography key={flag} variant="body2">{flag}</Typography>
            ))}
          </Stack>
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' }, gap: 3, alignItems: 'start' }}>
        <Stack spacing={2.5}>
          <ProgressStrip status={group.status} shop={group.shop} shipByDate={group.shipByDate} />

          <DetailPanel
            title={`Products (${group.items.length})`}
            icon={<Inventory2OutlinedIcon fontSize="small" />}
            action={<StatusBadge status={group.status} size="small" label={statusLabel} />}
          >
            {group.items.map((item, index) => (
              <ItemCard
                key={item._id}
                item={item}
                index={index}
                onFillTemplate={handleOpenTemplate}
                onAssetChange={handleAssetChange}
                canManage={canManage}
              />
            ))}
          </DetailPanel>

          <DetailPanel title="Payment Details" icon={<ReceiptLongOutlinedIcon fontSize="small" />}>
            <Stack spacing={1.25}>
              <PaymentRow label="Payment method" value={pricing.paymentMethod || first?.paymentMethod || 'Etsy checkout'} />
              <PaymentRow label="Subtotal" value={money(subtotal)} />
              <PaymentRow label="Shipping fee" value={money(shipping)} />
              <PaymentRow label="Sales tax" value={money(tax)} />
              <PaymentRow label="Discount" value={`-${money(discount)}`} />
              <Divider sx={{ my: 0.75 }} />
              <PaymentRow label={`${group.totalItems} item${group.totalItems === 1 ? '' : 's'} total`} value={money(total)} strong />
            </Stack>
          </DetailPanel>

          <DetailPanel title="Order Timeline" icon={<CalendarTodayOutlinedIcon fontSize="small" />}>
            <Stack spacing={0}>
              {group.events?.length ? group.events.slice(0, 8).map((event, index) => (
                <Box key={event._id} sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: event.toStatus === 'completed' ? 'success.main' : 'primary.main', mt: 0.5 }} />
                    {index < Math.min(group.events.length, 8) - 1 && (
                      <Box sx={{ width: 1, flex: 1, bgcolor: 'divider', my: 0.75 }} />
                    )}
                  </Box>
                  <Box sx={{ pb: index < Math.min(group.events.length, 8) - 1 ? 2 : 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {event.toStatus ? event.toStatus.replace(/_/g, ' ') : 'Order updated'}
                    </Typography>
                    {event.note && <Typography variant="body2" color="text.secondary">{event.note}</Typography>}
                    <Typography variant="caption" color="text.secondary">{fmtDate(event.createdAt, true)}</Typography>
                  </Box>
                </Box>
              )) : <Typography variant="body2" color="text.disabled">No activity yet.</Typography>}
            </Stack>
          </DetailPanel>
        </Stack>

        <Stack spacing={2}>
          <SidePanel icon={<NotesOutlinedIcon fontSize="small" />} title="Order Note" accent>
            <Typography variant="body2" sx={{ lineHeight: 1.65, whiteSpace: 'pre-wrap' }} color={orderNote ? 'text.primary' : 'text.secondary'}>
              {orderNote || 'No note for this order yet.'}
            </Typography>
          </SidePanel>

          <SidePanel icon={<PersonOutlineOutlinedIcon fontSize="small" />} title="Customer">
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Avatar sx={{ width: 46, height: 46, bgcolor: avatarColor(group.customerName), fontWeight: 900 }}>
                {getInitials(group.customerName)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{group.customerName || '-'}</Typography>
                <Typography variant="caption" color="text.secondary">Total: {group.totalItems} item{group.totalItems === 1 ? '' : 's'}</Typography>
              </Box>
            </Box>
          </SidePanel>

          <SidePanel icon={<LocationOnOutlinedIcon fontSize="small" />} title="Shipping Address">
            {shippingLines.length ? shippingLines.map((line, index) => (
              <Typography key={`${line}-${index}`} variant="body2" sx={{ color: index === 0 ? 'text.primary' : 'text.secondary', lineHeight: 1.65, fontWeight: index === 0 ? 800 : 500 }}>
                {line}
              </Typography>
            )) : <Typography variant="body2" color="text.disabled">No shipping address</Typography>}
          </SidePanel>

          <SidePanel icon={<EmailOutlinedIcon fontSize="small" />} title="Contact Information">
            <Stack spacing={1}>
              <InfoLine icon={<EmailOutlinedIcon fontSize="small" />} label="Email" value={group.customerEmail} />
              <InfoLine icon={<PhoneOutlinedIcon fontSize="small" />} label="Phone" value={group.shippingAddress?.phone} />
            </Stack>
          </SidePanel>

          <SidePanel icon={<LocalShippingOutlinedIcon fontSize="small" />} title="Order Summary">
            <Stack spacing={1}>
              <PaymentRow label="Shop" value={group.shop || '-'} />
              <PaymentRow label="Ordered" value={fmtDate(group.orderedAt)} />
              <PaymentRow label="Ship by" value={fmtDate(group.shipByDate)} />
              <PaymentRow label="Total" value={`${money(total)} USD`} strong />
            </Stack>
            {sideTags.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
                {sideTags.map((tag) => (
                  <Chip key={tag} label={String(tag).replace(/_/g, ' ')} size="small" variant="outlined" />
                ))}
              </Stack>
            )}
          </SidePanel>
        </Stack>
      </Box>

      {canManage && (
        <OrderFormDialog
          open={editOpen}
          mode="edit"
          orderGroup={group}
          activeStore={activeStore}
          onClose={() => setEditOpen(false)}
          onSaved={fetchGroup}
        />
      )}

      {canManage && (
        <LuluReviewDialog
          open={luluOpen}
          onClose={() => setLuluOpen(false)}
          order={first}
          onSubmitted={() => {
            setLuluOpen(false)
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
    </Box>
  )
}
