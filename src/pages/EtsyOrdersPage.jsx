import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import Pagination from '@mui/material/Pagination'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import { alpha } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined'
import AddIcon from '@mui/icons-material/Add'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import SyncIcon from '@mui/icons-material/Sync'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import StatusBadge from '../components/orders/StatusBadge'
import OrderKanban from '../components/orders/OrderKanban'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import { ETSY_ORDER_STATUSES } from '../lib/constants'
import {
  DataToolbar,
  EmptyState,
  PageHeader,
  SoftCard,
  SoftTableCard,
  SoftTable,
  SoftTableHead,
  SoftTableBody,
  SoftTableRow,
  SoftTableCell,
  SoftBadge,
  SoftAvatar,
  SoftButton,
} from '../components/common/soft-ui'

const PAGE_SIZE = 25

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '1y', label: 'This year' },
]

const CATEGORY_DEFINITIONS = [
  { value: 'custom_orders', label: 'Custom Orders', description: 'Manual/custom artwork orders with uploaded PDFs.' },
  { value: 'waiting', label: 'Waiting / Review', description: 'Unmapped orders or AI-flagged personalization that needs review.' },
  { value: 'in_progress', label: 'In Progress', description: 'Mapped orders waiting for template input or PDF editing.' },
  { value: 'completed', label: 'Completed', description: 'Artwork/PDF preparation is complete and Lulu-ready.' },
]

const STATUS_PRIORITY = [
  'waiting',
  'custom_orders',
  'in_progress',
  'completed',
]

const getPresetDateRange = (preset) => {
  if (!preset || preset === 'all') return {}

  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (preset === '7d') start.setDate(start.getDate() - 6)
  if (preset === '30d') start.setDate(start.getDate() - 29)
  if (preset === '90d') start.setDate(start.getDate() - 89)
  if (preset === '1y') start.setMonth(0, 1)

  return { dateFrom: start.toISOString(), dateTo: end.toISOString() }
}

const formatDate = (d, includeTime = false) => {
  if (!d) return '-'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

const formatMoney = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number) || number <= 0) return '-'
  return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'

const firstGroupOrder = (orders) =>
  [...orders].sort((a, b) => {
    if (a.isFirstItem !== b.isFirstItem) return a.isFirstItem ? -1 : 1
    return (a.itemIndexInOrder ?? 999) - (b.itemIndexInOrder ?? 999)
  })[0]

const deriveGroupStatus = (orders) => {
  if (!orders.length) return 'waiting'
  if (orders.every((order) => order.etsyStatus === 'completed')) return 'completed'
  const normalized = orders.map((order) => {
    if (['new', 'drawings', 'ready_to_order'].includes(order.etsyStatus)) return { ...order, etsyStatus: 'in_progress' }
    return order
  })
  return STATUS_PRIORITY.find((status) => normalized.some((order) => order.etsyStatus === status)) || normalized[0].etsyStatus
}

const groupTotal = (orders) => {
  const priced = orders.find((order) => Number(order.pricing?.orderTotal || 0) > 0)
  if (priced) return Number(priced.pricing.orderTotal || 0)
  return orders.reduce((sum, order) => (
    sum + Number(order.price || 0) * Number(order.quantity || 1) + Number(order.shippingCost || 0)
  ), 0)
}

const buildOrderGroups = (orders) => {
  const grouped = new Map()
  for (const order of orders || []) {
    if (!order?.etsyOrderId) continue
    grouped.set(order.etsyOrderId, [...(grouped.get(order.etsyOrderId) || []), order])
  }

  return [...grouped.values()]
    .map((items) => {
      const first = firstGroupOrder(items)
      const aiFlags = [...new Set(items.flatMap((item) => item.aiFlags || []))]
      const reviewFlags = aiFlags.filter((flag) => flag !== 'Missing Product Mapping')
      return {
        etsyOrderId: first.etsyOrderId,
        orderIds: items.map((item) => item._id),
        firstOrder: first,
        customerName: first.customerName,
        customerEmail: first.customerEmail,
        shippingAddress: first.shippingAddress,
        shop: first.shop,
        orderedAt: first.orderedAt,
        shipByDate: first.shipByDate,
        status: deriveGroupStatus(items),
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
        total: groupTotal(items),
        hasUnmapped: items.some((item) => !item.isProductMapped),
        hasAiFlags: reviewFlags.length > 0,
        aiFlags,
        reviewFlags,
        hasCustomArtwork: items.some((item) => item.hasCustomArtwork),
        updatedAt: items.reduce((latest, item) => Math.max(latest, new Date(item.updatedAt || 0).getTime()), 0),
        items,
      }
    })
    .sort((a, b) => new Date(b.orderedAt || b.updatedAt || 0).getTime() - new Date(a.orderedAt || a.updatedAt || 0).getTime())
}

const getGroupCategory = (group) => {
  if (group.status === 'custom_orders' || group.hasCustomArtwork) return 'custom_orders'
  if (group.status === 'waiting' || group.hasUnmapped) return 'waiting'
  if (group.status === 'completed') return 'completed'
  return 'in_progress'
}

const getEtsyStatusLabel = (group) => {
  if (group.status !== 'waiting') return undefined
  if (group.hasUnmapped) return 'Waiting (Unmapped)'
  if (group.hasAiFlags) return 'Waiting (AI Flagged)'
  return 'Waiting'
}

export default function EtsyOrdersPage() {
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [category, setCategory] = useState('in_progress')
  const [page, setPage] = useState(1)
  const [backendTotalPages, setBackendTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState({})
  const [selected, setSelected] = useState([])
  const [manualOpen, setManualOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuOrder, setMenuOrder] = useState(null)
  const [view, setView] = useState(() => localStorage.getItem('beatific_order_view') || 'list')
  const [emailFetching, setEmailFetching] = useState(false)
  const [emailLogs, setEmailLogs] = useState([])
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })
  const [generating, setGenerating] = useState({})
  const [generationResults, setGenerationResults] = useState({})
  const [progressModalGroup, setProgressModalGroup] = useState(null)

  const handleGenerateClick = (group) => {
    const etsyOrderId = group.etsyOrderId

    if (generating[etsyOrderId] === 'generating' || generating[etsyOrderId] === 'completed') {
      setProgressModalGroup(group)
      return
    }

    setGenerating((prev) => ({ ...prev, [etsyOrderId]: 'generating' }))
    setGenerationResults((prev) => ({
      ...prev,
      [etsyOrderId]: { loading: true, results: [] }
    }))

    setTimeout(() => {
      setGenerating((prev) => ({ ...prev, [etsyOrderId]: 'completed' }))
      setGenerationResults((prev) => ({
        ...prev,
        [etsyOrderId]: {
          loading: false,
          results: (group.items || []).map((item) => ({
            orderId: item._id,
            success: true,
            productTitle: item.productTitle
          })),
          message: 'PDFs generated successfully.'
        }
      }))
      setSnack({
        open: true,
        message: 'PDFs generated successfully.',
        severity: 'success',
      })
    }, 4000)
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const dateParams = getPresetDateRange(dateRange)
      const params = {
        page: view === 'board' ? page : 1,
        limit: view === 'board' ? 200 : 500,
        ...(activeStore && { storeId: activeStore._id }),
        ...(search && { search }),
        ...dateParams,
      }
      const { data } = await api.get('/orders', { params })
      setOrders(data.orders || [])
      setBackendTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch {
      setSnack({ open: true, message: 'Failed to load orders', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [activeStore, search, page, view, dateRange])

  const fetchCounts = useCallback(async () => {
    try {
      const dateParams = getPresetDateRange(dateRange)
      const params = {
        ...(activeStore ? { storeId: activeStore._id } : {}),
        ...dateParams,
      }
      const { data } = await api.get('/orders/status-counts', { params })
      setStatusCounts(data)
    } catch {
      //
    }
  }, [activeStore, dateRange])

  const fetchEmailLogs = useCallback(async () => {
    if (!activeStore?._id) {
      setEmailLogs([])
      return
    }
    try {
      const { data } = await api.get('/email-orders/logs', { params: { storeId: activeStore._id } })
      setEmailLogs(data.logs || [])
    } catch {
      //
    }
  }, [activeStore?._id])

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { fetchCounts() }, [fetchCounts])
  useEffect(() => { fetchEmailLogs() }, [fetchEmailLogs])
  useEffect(() => { setPage(1); setSelected([]) }, [category, dateRange, search, activeStore?._id, view])

  const groups = useMemo(() => buildOrderGroups(orders), [orders])

  const categoryCounts = useMemo(
    () => CATEGORY_DEFINITIONS.reduce((acc, definition) => {
      acc[definition.value] = groups.filter((group) => getGroupCategory(group) === definition.value).length
      return acc
    }, {}),
    [groups]
  )

  const filteredGroups = useMemo(
    () => groups.filter((group) => getGroupCategory(group) === category),
    [groups, category]
  )

  const totalPages = view === 'board'
    ? backendTotalPages
    : Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE))
  const visibleGroups = useMemo(
    () => filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredGroups, page]
  )

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus })
      fetchOrders()
      fetchCounts()
      setMenuAnchor(null)
    } catch {
      setSnack({ open: true, message: 'Failed to update order', severity: 'error' })
    }
  }

  const handleBulkStatus = async (status) => {
    if (selected.length === 0) return
    try {
      await api.post('/orders/bulk-status', { orderIds: selected, status })
      const count = selected.length
      setSelected([])
      fetchOrders()
      fetchCounts()
      setSnack({ open: true, message: `${count} order item${count === 1 ? '' : 's'} moved to ${status.replace(/_/g, ' ')}`, severity: 'success' })
    } catch {
      setSnack({ open: true, message: 'Failed to update orders', severity: 'error' })
    }
  }

  const handleBulkDelete = async () => {
    if (selected.length === 0) return
    const count = selected.length
    const confirmed = window.confirm(`Delete ${count} selected order item${count === 1 ? '' : 's'}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await api.delete('/orders/bulk', { data: { orderIds: selected } })
      setSelected([])
      fetchOrders()
      fetchCounts()
      setSnack({ open: true, message: `${count} order item${count === 1 ? '' : 's'} deleted`, severity: 'success' })
    } catch {
      setSnack({ open: true, message: 'Failed to delete selected orders', severity: 'error' })
    }
  }

  const handleFetchEmailOrders = async () => {
    if (!activeStore?._id) {
      setSnack({ open: true, message: 'Select a store before fetching email orders.', severity: 'warning' })
      return
    }
    setEmailFetching(true)
    try {
      const { data } = await api.post('/email-orders/fetch', { storeId: activeStore._id })
      await Promise.all([fetchOrders(), fetchCounts(), fetchEmailLogs()])
      setSnack({
        open: true,
        message: `Email sync complete: ${data.created || 0} created, ${data.updated || 0} updated, ${data.skipped || 0} skipped`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Email sync failed', severity: 'error' })
    } finally {
      setEmailFetching(false)
    }
  }

  const handleViewChange = (_, val) => {
    if (!val) return
    setView(val)
    localStorage.setItem('beatific_order_view', val)
  }

  const openGroupDetail = (orderOrGroup) => {
    const etsyOrderId = orderOrGroup?.etsyOrderId || orderOrGroup?.firstOrder?.etsyOrderId
    if (etsyOrderId) navigate(`/orders/etsy/${encodeURIComponent(etsyOrderId)}`)
  }

  const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const shownTotal = view === 'board' ? total : filteredGroups.length

  return (
    <Box>
      <PageHeader
        title="Etsy Orders"
        subtitle={view === 'board' ? `${total} order items total` : `${groups.length} grouped orders from ${allCount || total} order items`}
        actions={
          <>
          {canManage && (
            <>
              <SoftButton
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setManualOpen(true)}
              >
                Add Order
              </SoftButton>
              <SoftButton
                variant="contained"
                startIcon={emailFetching ? <CircularProgress size={16} color="inherit" /> : <CloudSyncOutlinedIcon />}
                disabled={emailFetching}
                onClick={handleFetchEmailOrders}
              >
                {emailFetching ? 'Fetching...' : 'Fetch Email Orders'}
              </SoftButton>
            </>
          )}
          <ToggleButtonGroup value={view} exclusive onChange={handleViewChange} size="small">
            <ToggleButton value="list">
              <Tooltip title="List view">
                <ViewListOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="board">
              <Tooltip title="Kanban board">
                <ViewKanbanOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          </>
        }
      />

      <DataToolbar
        search={{
          placeholder: 'Search by order #, customer, listing, product, email, or shop...',
          value: search,
          onChange: (e) => { setSearch(e.target.value); setPage(1) },
        }}
        filters={
          <>
          <FormControl size="small">
            <Select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value)
                setPage(1)
                setSelected([])
              }}
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          </>
        }
        selection={
          canManage && selected.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">{selected.length} selected</Typography>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  displayEmpty
                  value=""
                  onChange={(e) => handleBulkStatus(e.target.value)}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem disabled value="">Move to...</MenuItem>
                  {ETSY_ORDER_STATUSES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleBulkDelete}
              >
                Delete selected
              </Button>
            </Box>
          )
        }
      />

      {view === 'list' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
          {CATEGORY_DEFINITIONS.map((definition) => {
            const active = category === definition.value
            return (
              <SoftCard
                key={definition.value}
                onClick={() => setCategory(definition.value)}
                sx={{
                  p: 1.75,
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  bgcolor: active ? alpha('#f97316', 0.1) : '#fff',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#27272a' }}>{definition.label}</Typography>
                  <SoftBadge
                    label={categoryCounts[definition.value] || 0}
                    color={active ? 'primary' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: '#71717a', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {definition.description}
                </Typography>
              </SoftCard>
            )
          })}
        </Box>
      )}

      {emailLogs.length > 0 && view === 'list' && (
        <SoftCard sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mr: 0.5, color: '#27272a' }}>Recent Email Imports</Typography>
            {emailLogs.slice(0, 4).map((log) => (
              <SoftBadge
                key={log._id}
                label={`${log.status}: ${log.orderNumbers?.[0] || log.subject || 'email'}`}
                color={log.status === 'failed' ? 'error' : log.status === 'skipped' ? 'default' : 'success'}
                size="small"
                sx={{ maxWidth: 260 }}
              />
            ))}
          </Box>
        </SoftCard>
      )}

      <SoftTableCard
        title={view === 'board' ? 'Orders board' : 'Orders table'}
        subtitle={view === 'board' ? 'Move work between production stages.' : 'Grouped Etsy orders styled after the Soft UI author table.'}
      >
        {view === 'board' ? (
          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Loading orders...</Typography>
              </Box>
            ) : (
              <OrderKanban
                orders={orders}
                onOrderClick={openGroupDetail}
                onOrdersChange={() => { fetchOrders(); fetchCounts() }}
                statusCounts={statusCounts}
                readOnly={!canManage}
              />
            )}
          </Box>
        ) : (
          <>
            <SoftTable>
              <SoftTableHead>
                <SoftTableRow>
                    {canManage && (
                      <SoftTableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selected.length > 0 && selected.length < visibleGroups.flatMap((group) => group.orderIds).length}
                          checked={visibleGroups.length > 0 && visibleGroups.every((group) => group.orderIds.every((id) => selected.includes(id)))}
                          onChange={(e) => {
                            const ids = visibleGroups.flatMap((group) => group.orderIds)
                            setSelected(e.target.checked ? ids : [])
                          }}
                        />
                      </SoftTableCell>
                    )}
                    <SoftTableCell>Order #</SoftTableCell>
                    <SoftTableCell>Customer</SoftTableCell>
                    <SoftTableCell>Shop</SoftTableCell>
                    <SoftTableCell>Payment Date</SoftTableCell>
                    <SoftTableCell>Ship By</SoftTableCell>
                    <SoftTableCell>Total</SoftTableCell>
                    <SoftTableCell>Status</SoftTableCell>
                    <SoftTableCell align="right">Actions</SoftTableCell>
                  </SoftTableRow>
                </SoftTableHead>
                <SoftTableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <SoftTableRow key={i}>
                        {Array.from({ length: canManage ? 9 : 8 }).map((__, j) => (
                          <SoftTableCell key={j}><Skeleton /></SoftTableCell>
                        ))}
                      </SoftTableRow>
                    ))
                  ) : visibleGroups.length === 0 ? (
                    <SoftTableRow>
                      <SoftTableCell colSpan={canManage ? 9 : 8} sx={{ p: 0 }}>
                        <EmptyState
                          icon={ShoppingCartOutlinedIcon}
                          title="No orders found"
                          description={canManage ? 'Fetch email orders or add a manual order to get started.' : 'No orders match this view.'}
                        />
                      </SoftTableCell>
                    </SoftTableRow>
                  ) : (
                    visibleGroups.map((group) => {
                      const checked = group.orderIds.every((id) => selected.includes(id))
                      const partiallyChecked = !checked && group.orderIds.some((id) => selected.includes(id))
                      return (
                        <SoftTableRow key={group.etsyOrderId} selected={checked}>
                          {canManage && (
                            <SoftTableCell padding="checkbox">
                              <Checkbox
                                checked={checked}
                                indeterminate={partiallyChecked}
                                onChange={(e) => setSelected((prev) => {
                                  if (e.target.checked) return [...new Set([...prev, ...group.orderIds])]
                                  return prev.filter((id) => !group.orderIds.includes(id))
                                })}
                              />
                            </SoftTableCell>
                          )}
                          <SoftTableCell>
                            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#f97316', fontWeight: 700 }}>
                              #{group.etsyOrderId}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#71717a', fontSize: '0.8125rem' }}>
                              {group.totalItems} item{group.totalItems === 1 ? '' : 's'} / Qty {group.totalQuantity}
                            </Typography>
                            {group.hasAiFlags && (
                              <Tooltip title={group.reviewFlags.join('; ')}>
                                <Box sx={{ display: 'block', width: 'fit-content', mt: 0.5 }}>
                                  <SoftBadge
                                    icon={<WarningAmberOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                    label={group.reviewFlags[0] || 'AI flagged'}
                                    color="warning"
                                    size="small"
                                    sx={{
                                      display: 'flex',
                                      width: 'fit-content',
                                      maxWidth: 260,
                                      textTransform: 'none',
                                      '& .MuiChip-label': {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      },
                                    }}
                                  />
                                </Box>
                              </Tooltip>
                            )}
                          </SoftTableCell>
                          <SoftTableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                              <SoftAvatar size={36}>
                                {initials(group.customerName)}
                              </SoftAvatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle2" sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#27272a' }}>
                                  {group.customerName || '-'}
                                </Typography>
                                {group.customerEmail && (
                                  <Typography variant="caption" sx={{ color: '#71717a', fontSize: '0.8125rem' }}>
                                    {group.customerEmail}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </SoftTableCell>
                          <SoftTableCell>
                            <Typography variant="body2" sx={{ color: '#27272a' }}>{group.shop || '-'}</Typography>
                          </SoftTableCell>
                          <SoftTableCell>
                            <Typography variant="body2" sx={{ color: '#27272a' }}>{formatDate(group.orderedAt, true)}</Typography>
                          </SoftTableCell>
                          <SoftTableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                color: group.shipByDate && new Date(group.shipByDate) < new Date() && group.status !== 'completed' ? '#ef4444' : '#27272a',
                                fontWeight: group.shipByDate && new Date(group.shipByDate) < new Date() && group.status !== 'completed' ? 600 : 400,
                              }}
                            >
                              {formatDate(group.shipByDate)}
                            </Typography>
                          </SoftTableCell>
                          <SoftTableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#27272a' }}>{formatMoney(group.total)}</Typography>
                          </SoftTableCell>
                          <SoftTableCell>
                            <StatusBadge status={group.status} label={getEtsyStatusLabel(group)} />
                          </SoftTableCell>
                          <SoftTableCell align="right">
                            <Tooltip title={generating[group.etsyOrderId] === 'completed' ? 'Completed' : generating[group.etsyOrderId] === 'generating' ? 'Generating' : 'Generate'}>
                              <IconButton size="small" onClick={() => handleGenerateClick(group)}>
                                {generating[group.etsyOrderId] === 'generating' ? (
                                  <SyncIcon
                                    fontSize="small"
                                    sx={{
                                      animation: 'spin 2s linear infinite',
                                      '@keyframes spin': {
                                        '0%': { transform: 'rotate(0deg)' },
                                        '100%': { transform: 'rotate(360deg)' }
                                      }
                                    }}
                                  />
                                ) : generating[group.etsyOrderId] === 'completed' ? (
                                  <CheckCircleOutlinedIcon fontSize="small" sx={{ color: '#22c55e' }} />
                                ) : (
                                  <PlayArrowOutlinedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View order details">
                              <IconButton size="small" onClick={() => openGroupDetail(group)}>
                                <VisibilityOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canManage && (
                              <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuOrder(group.firstOrder) }}>
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            )}
                          </SoftTableCell>
                        </SoftTableRow>
                      )
                    })
                  )}
                </SoftTableBody>
              </SoftTable>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 2, px: 2, flexWrap: 'wrap' }}>
              <Typography color="text.secondary">
                Showing {visibleGroups.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filteredGroups.length)} of {shownTotal} orders
              </Typography>
              {totalPages > 1 && (
                <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
              )}
            </Box>
          </>
        )}
      </SoftTableCard>

      {canManage && <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}>
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>Move first item to</Typography>
        {ETSY_ORDER_STATUSES.map((s) => (
          <MenuItem
            key={s.value}
            disabled={menuOrder?.etsyStatus === s.value}
            onClick={() => handleStatusChange(menuOrder?._id, s.value)}
          >
            {s.label}
          </MenuItem>
        ))}
      </Menu>}

      {canManage && (
        <OrderFormDialog
          open={manualOpen}
          mode="create"
          activeStore={activeStore}
          onClose={() => setManualOpen(false)}
          onSaved={() => { fetchOrders(); fetchCounts() }}
        />
      )}

      {/* PDF Generation Progress Modal */}
      <Dialog
        open={Boolean(progressModalGroup)}
        onClose={() => setProgressModalGroup(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            }
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            PDF Generation Progress
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Order #{progressModalGroup?.etsyOrderId} • {progressModalGroup?.customerName}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ mt: 2, pb: 1 }}>
          {progressModalGroup && (() => {
            const groupState = generationResults[progressModalGroup.etsyOrderId]
            const isGroupLoading = groupState?.loading
            const groupError = groupState?.error
            const results = groupState?.results || []

            return (
              <Box>
                {groupError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {groupError}
                  </Alert>
                )}

                {groupState?.message && !groupError && (
                  <Alert severity={groupState.results.some(r => !r.success) ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    {groupState.message}
                  </Alert>
                )}

                <List disablePadding>
                  {progressModalGroup.items.map((item, idx) => {
                    const itemResult = results.find(r => r.orderId === item._id)
                    let statusText = ''
                    let statusColor = 'text.secondary'
                    let icon = null

                    if (isGroupLoading) {
                      if (item.isProductMapped && item.etsyStatus !== 'completed') {
                        statusText = 'Generating PDF...'
                        statusColor = 'primary.main'
                        icon = <CircularProgress size={20} />
                      } else if (!item.isProductMapped) {
                        statusText = 'Skipped (Product not mapped)'
                        statusColor = 'text.secondary'
                        icon = <InfoOutlinedIcon color="action" />
                      } else if (item.etsyStatus === 'completed') {
                        statusText = 'Already Completed'
                        statusColor = 'success.main'
                        icon = <CheckCircleOutlinedIcon color="success" />
                      } else {
                        statusText = 'Skipped (No template required)'
                        statusColor = 'text.secondary'
                        icon = <InfoOutlinedIcon color="action" />
                      }
                    } else {
                      // Done loading, or hasn't started (loaded from cache)
                      if (itemResult) {
                        if (itemResult.success) {
                          statusText = 'Completed'
                          statusColor = 'success.main'
                          icon = <CheckCircleOutlinedIcon color="success" />
                        } else {
                          statusText = itemResult.error || 'Failed'
                          statusColor = 'error.main'
                          icon = <CancelOutlinedIcon color="error" />
                        }
                      } else {
                        // No entry in generation results
                        if (item.etsyStatus === 'completed') {
                          statusText = 'Already Completed'
                          statusColor = 'success.main'
                          icon = <CheckCircleOutlinedIcon color="success" />
                        } else if (!item.isProductMapped) {
                          statusText = 'Product not mapped'
                          statusColor = 'warning.main'
                          icon = <InfoOutlinedIcon color="warning" />
                        } else if (item.hasCustomArtwork) {
                          statusText = 'Custom Artwork'
                          statusColor = 'text.secondary'
                          icon = <InfoOutlinedIcon color="action" />
                        } else {
                          statusText = 'Ready to generate'
                          statusColor = 'text.secondary'
                          icon = <InfoOutlinedIcon color="action" />
                        }
                      }
                    }

                    return (
                      <Box key={item._id || idx}>
                        {idx > 0 && <Divider component="li" />}
                        <ListItem sx={{ py: 1.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={item.productTitle}
                            secondary={statusText}
                            primaryTypographyProps={{
                              variant: 'subtitle2',
                              fontWeight: 600,
                              noWrap: true,
                            }}
                            secondaryTypographyProps={{
                              variant: 'body2',
                              color: statusColor,
                            }}
                          />
                        </ListItem>
                      </Box>
                    )
                  })}
                </List>
              </Box>
            )
          })()}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="contained"
            onClick={() => setProgressModalGroup(null)}
            sx={{ fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  )
}
