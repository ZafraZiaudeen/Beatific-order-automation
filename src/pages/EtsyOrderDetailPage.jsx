import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
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

function InfoPanel({ icon, title, children }) {
  return (
    <Card sx={{ p: 2.25, border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)', borderRadius: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', mb: 1.5, color: 'text.secondary' }}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{title}</Typography>
      </Box>
      {children}
    </Card>
  )
}

function ItemCard({ item, index, onFillTemplate, onAssetChange, canManage }) {
  const personalization = Object.entries(item.personalization || {})
  const isCustom = item.etsyStatus === 'custom_orders'
  const canFillTemplate = canManage && item.etsyStatus === 'in_progress' && item.productId
  const itemAiFlags = (item.aiFlags || []).filter((flag) => flag !== 'Missing Product Mapping')
  return (
    <Card sx={{ p: 1.75, border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.035)', borderRadius: 2.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '96px 1.4fr 1fr 1fr auto' }, gap: 2, alignItems: 'center' }}>
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: 2,
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
            <Box component="img" src={item.coverImageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Typography variant="caption" color="text.disabled">No cover</Typography>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.35 }}>
            {item.productTitle || `Item ${index + 1}`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Listing ID: {item.listingId || '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Transaction ID: {item.etsyItemId || '-'}
          </Typography>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary', mb: 0.75 }}>Options</Typography>
          {[item.option1Value && [item.option1Name || 'Option 1', item.option1Value], item.option2Value && [item.option2Name || 'Option 2', item.option2Value]]
            .filter(Boolean)
            .map(([label, value]) => (
              <Typography key={label} variant="body2">{label}: {value}</Typography>
            ))}
          {!item.option1Value && !item.option2Value && <Typography variant="body2" color="text.disabled">No options</Typography>}
        </Box>

        <Box>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: 'text.secondary', mb: 0.75 }}>Personalization</Typography>
          {personalization.length ? personalization.map(([label, value]) => (
            <Typography key={label} variant="body2">{label}: {value}</Typography>
          )) : <Typography variant="body2" color="text.disabled">No personalization</Typography>}
        </Box>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' }, minWidth: 110 }}>
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
    </Card>
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Skeleton height={160} />
          <Skeleton height={160} />
          <Skeleton height={160} />
        </Box>
        <Skeleton height={160} />
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
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders/etsy')} sx={{ mb: 2, color: 'primary.main', fontWeight: 700 }}>
        Back to Orders
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'stretch', md: 'center' }, flexDirection: { xs: 'column', md: 'row' }, mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: '-0.03em' }}>Order #{group.etsyOrderId}</Typography>
            <StatusBadge
              status={group.status}
              label={waitingLabel({ status: group.status, hasUnmapped: group.hasUnmapped, hasAiFlags: reviewFlags.length > 0 })}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {fmtDate(group.orderedAt, true)} · {group.totalItems} item{group.totalItems === 1 ? '' : 's'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 1.15fr' }, gap: 2, mb: 3 }}>
        <InfoPanel icon={<PersonOutlineOutlinedIcon fontSize="small" />} title="Customer">
          <Typography variant="body1" sx={{ fontWeight: 700 }}>{group.customerName || '-'}</Typography>
          <Typography variant="body2" sx={{ color: 'primary.main', mt: 0.5 }}>{group.customerEmail || '-'}</Typography>
        </InfoPanel>

        <InfoPanel icon={<LocalShippingOutlinedIcon fontSize="small" />} title="Shipping Address">
          {detailLines(group.shippingAddress).length ? detailLines(group.shippingAddress).map((line) => (
            <Typography key={line} variant="body2">{line}</Typography>
          )) : <Typography variant="body2" color="text.disabled">No shipping address</Typography>}
        </InfoPanel>

        <InfoPanel icon={<CalendarTodayOutlinedIcon fontSize="small" />} title="Order Summary">
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.8 }}>
            <Typography variant="body2" color="text.secondary">Status</Typography>
            <StatusBadge
              status={group.status}
              size="small"
              label={waitingLabel({ status: group.status, hasUnmapped: group.hasUnmapped, hasAiFlags: reviewFlags.length > 0 })}
            />
            <Typography variant="body2" color="text.secondary">Shop</Typography>
            <Typography variant="body2">{group.shop || '-'}</Typography>
            <Typography variant="body2" color="text.secondary">Payment Date</Typography>
            <Typography variant="body2">{fmtDate(group.orderedAt)}</Typography>
            <Typography variant="body2" color="text.secondary">Ship By</Typography>
            <Typography variant="body2">{fmtDate(group.shipByDate)}</Typography>
          </Box>
        </InfoPanel>
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>Items ({group.items.length})</Typography>
      <Stack spacing={1.5}>
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
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 0.8fr 0.8fr' }, gap: 2, mt: 2.5 }}>
        <Card sx={{ p: 2.25, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>Notes</Typography>
          <Typography variant="body2" color={group.notes ? 'text.primary' : 'text.disabled'} sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {group.notes || 'No notes for this order yet.'}
          </Typography>
        </Card>

        <Card sx={{ p: 2.25, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Totals</Typography>
          {[
            ['Subtotal', subtotal],
            ['Shipping', shipping],
            ['Tax', tax],
            ['Discount', -discount],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="body2">{money(value)}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Total</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main' }}>{money(total)} USD</Typography>
          </Box>
        </Card>

        <Card sx={{ p: 2.25, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Order Timeline</Typography>
          <Stack spacing={1.5}>
            {group.events?.length ? group.events.slice(0, 6).map((event) => (
              <Box key={event._id} sx={{ display: 'grid', gridTemplateColumns: '16px 1fr', gap: 1.5 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: event.toStatus === 'completed' ? 'success.main' : 'primary.main', mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {event.toStatus ? event.toStatus.replace(/_/g, ' ') : 'Order updated'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{fmtDate(event.createdAt, true)}</Typography>
                </Box>
              </Box>
            )) : <Typography variant="body2" color="text.disabled">No activity yet.</Typography>}
          </Stack>
        </Card>
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
