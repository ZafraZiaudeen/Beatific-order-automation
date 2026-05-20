import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import Pagination from '@mui/material/Pagination'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined'
import AddIcon from '@mui/icons-material/Add'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import StatusBadge from '../components/orders/StatusBadge'
import OrderKanban from '../components/orders/OrderKanban'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import { ETSY_ORDER_STATUSES } from '../lib/constants'

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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Etsy Orders</Typography>
          <Typography variant="body2" color="text.secondary">
            {view === 'board' ? `${total} order items total` : `${groups.length} grouped orders from ${allCount || total} order items`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {canManage && (
            <>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setManualOpen(true)}
              >
                Add Order
              </Button>
              <Button
                variant="contained"
                startIcon={emailFetching ? <CircularProgress size={16} color="inherit" /> : <CloudSyncOutlinedIcon />}
                disabled={emailFetching}
                onClick={handleFetchEmailOrders}
              >
                {emailFetching ? 'Fetching...' : 'Fetch Email Orders'}
              </Button>
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
        </Box>
      </Box>

      <Card sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 1fr) 180px auto' }, gap: 1.5, alignItems: 'center' }}>
          <TextField
            placeholder="Search by order #, customer, listing, product, email, or shop..."
            size="small"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
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
          {canManage && selected.length > 0 && (
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
          )}
        </Box>
      </Card>

      {view === 'list' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
          {CATEGORY_DEFINITIONS.map((definition) => {
            const active = category === definition.value
            return (
              <Card
                key={definition.value}
                onClick={() => setCategory(definition.value)}
                sx={{
                  p: 1.75,
                  border: '1px solid',
                  borderColor: active ? 'primary.main' : 'divider',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  bgcolor: active ? alpha('#00A76F', 0.08) : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{definition.label}</Typography>
                  <Chip
                    label={categoryCounts[definition.value] || 0}
                    size="small"
                    sx={{ bgcolor: active ? 'primary.main' : alpha('#919EAB', 0.16), color: active ? '#fff' : 'text.secondary', fontWeight: 800 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {definition.description}
                </Typography>
              </Card>
            )
          })}
        </Box>
      )}

      {emailLogs.length > 0 && view === 'list' && (
        <Card sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: alpha('#0F172A', 0.015) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mr: 0.5 }}>Recent Email Imports</Typography>
            {emailLogs.slice(0, 4).map((log) => (
              <Chip
                key={log._id}
                size="small"
                label={`${log.status}: ${log.orderNumbers?.[0] || log.subject || 'email'}`}
                color={log.status === 'failed' ? 'error' : log.status === 'skipped' ? 'default' : 'success'}
                variant="outlined"
                sx={{ maxWidth: 260 }}
              />
            ))}
          </Box>
        </Card>
      )}

      <Card>
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {canManage && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selected.length > 0 && selected.length < visibleGroups.flatMap((group) => group.orderIds).length}
                          checked={visibleGroups.length > 0 && visibleGroups.every((group) => group.orderIds.every((id) => selected.includes(id)))}
                          onChange={(e) => {
                            const ids = visibleGroups.flatMap((group) => group.orderIds)
                            setSelected(e.target.checked ? ids : [])
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>Order #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Shop</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Ship By</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: canManage ? 9 : 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : visibleGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 9 : 8} align="center" sx={{ py: 8 }}>
                        <ShoppingCartOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="subtitle1" color="text.secondary">No orders found</Typography>
                        <Typography variant="body2" color="text.disabled">
                          {canManage ? 'Fetch email orders or add a manual order to get started.' : 'No orders match this view.'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleGroups.map((group) => {
                      const checked = group.orderIds.every((id) => selected.includes(id))
                      const partiallyChecked = !checked && group.orderIds.some((id) => selected.includes(id))
                      return (
                        <TableRow key={group.etsyOrderId} hover selected={checked}>
                          {canManage && (
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={checked}
                                indeterminate={partiallyChecked}
                                onChange={(e) => setSelected((prev) => {
                                  if (e.target.checked) return [...new Set([...prev, ...group.orderIds])]
                                  return prev.filter((id) => !group.orderIds.includes(id))
                                })}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontSize: '0.86rem', color: 'primary.main' }}>
                              #{group.etsyOrderId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.totalItems} item{group.totalItems === 1 ? '' : 's'} / Qty {group.totalQuantity}
                            </Typography>
                            {group.hasAiFlags && (
                              <Chip
                                icon={<WarningAmberOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                label="AI flagged"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ display: 'flex', width: 'fit-content', mt: 0.5, height: 20, fontWeight: 700 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{group.customerName || '-'}</Typography>
                            {group.customerEmail && (
                              <Typography variant="caption" color="text.secondary">{group.customerEmail}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{group.shop || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{formatDate(group.orderedAt, true)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: group.shipByDate && new Date(group.shipByDate) < new Date() && group.status !== 'completed' ? 'error.main' : 'text.primary' }}>
                              {formatDate(group.shipByDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{formatMoney(group.total)}</Typography>
                          </TableCell>
                          <TableCell><StatusBadge status={group.status} label={getEtsyStatusLabel(group)} /></TableCell>
                          <TableCell align="right">
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
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

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
      </Card>

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
