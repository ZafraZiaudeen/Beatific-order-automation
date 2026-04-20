import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
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
import { alpha } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import StatusBadge from '../components/orders/StatusBadge'
import OrderKanban from '../components/orders/OrderKanban'
import OrderDetailDrawer from '../components/orders/OrderDetailDrawer'
import { ETSY_ORDER_STATUSES } from '../lib/constants'

const TABS = [
  { value: '', label: 'All' },
  ...ETSY_ORDER_STATUSES,
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '1y', label: 'This year' },
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


export default function EtsyOrdersPage() {
  const { activeStore } = useAuthStore()
  const [tab, setTab] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState({})
  const [selected, setSelected] = useState([])
  const [detailOrder, setDetailOrder] = useState(null)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuOrder, setMenuOrder] = useState(null)
  const [view, setView] = useState(() => localStorage.getItem('beatific_order_view') || 'list')
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const dateParams = getPresetDateRange(dateRange)
      const params = {
        page,
        limit: view === 'board' ? 200 : 50, // load more for kanban
        ...(activeStore && { storeId: activeStore._id }),
        ...(tab && { etsyStatus: tab }),
        ...(search && { search }),
        ...dateParams,
      }
      const { data } = await api.get('/orders', { params })
      setOrders(data.orders || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [activeStore, tab, search, page, view, dateRange])

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

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { fetchCounts() }, [fetchCounts])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus })
      fetchOrders()
      fetchCounts()
      setMenuAnchor(null)
    } catch {
      //
    }
  }

  const handleBulkStatus = async (status) => {
    if (selected.length === 0) return
    try {
      await api.post('/orders/bulk-status', { orderIds: selected, status })
      setSelected([])
      fetchOrders()
      fetchCounts()
      setSnack({ open: true, message: `${selected.length} orders moved to ${status.replace(/_/g, ' ')}`, severity: 'success' })
    } catch {
      setSnack({ open: true, message: 'Failed to update orders', severity: 'error' })
    }
  }

  const handleBulkDelete = async () => {
    if (selected.length === 0) return
    const count = selected.length
    const confirmed = window.confirm(`Delete ${count} selected order${count === 1 ? '' : 's'}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await api.delete('/orders/bulk', { data: { orderIds: selected } })
      setSelected([])
      fetchOrders()
      fetchCounts()
      setSnack({ open: true, message: `${count} order${count === 1 ? '' : 's'} deleted`, severity: 'success' })
    } catch {
      setSnack({ open: true, message: 'Failed to delete selected orders', severity: 'error' })
    }
  }

  const handleViewChange = (_, val) => {
    if (!val) return
    setView(val)
    localStorage.setItem('beatific_order_view', val)
  }

  const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Etsy Orders</Typography>
          <Typography variant="body2" color="text.secondary">{total} orders total</Typography>
        </Box>
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

      <Card>
        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setPage(1); setSelected([]) }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 48 },
          }}
        >
          {TABS.map((t) => {
            const count = t.value === '' ? allCount : (statusCounts[t.value] || 0)
            return (
              <Tab
                key={t.value}
                value={t.value}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {t.label}
                    {count > 0 && (
                      <Chip
                        label={count}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          bgcolor: tab === t.value ? 'primary.main' : alpha('#919EAB', 0.16),
                          color: tab === t.value ? '#fff' : 'text.secondary',
                        }}
                      />
                    )}
                  </Box>
                }
              />
            )
          })}
        </Tabs>

        {/* Search + Bulk */}
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search orders..."
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
            sx={{ width: 280 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
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
          <Box sx={{ flex: 1 }} />
          {selected.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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

        {/* Content */}
        {view === 'board' ? (
          <Box sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Loading orders...</Typography>
              </Box>
            ) : (
              <OrderKanban
                orders={orders}
                onOrderClick={setDetailOrder}
                onOrdersChange={() => { fetchOrders(); fetchCounts() }}
                statusCounts={statusCounts}
              />
            )}
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selected.length > 0 && selected.length < orders.length}
                        checked={orders.length > 0 && selected.length === orders.length}
                        onChange={(e) => setSelected(e.target.checked ? orders.map((o) => o._id) : [])}
                      />
                    </TableCell>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell>Ship By</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                        <ShoppingCartOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="subtitle1" color="text.secondary">No orders found</Typography>
                        <Typography variant="body2" color="text.disabled">Import orders from the Import page</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => (
                      <TableRow key={order._id} hover selected={selected.includes(order._id)}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selected.includes(order._id)}
                            onChange={(e) => setSelected((prev) =>
                              e.target.checked ? [...prev, order._id] : prev.filter((id) => id !== order._id)
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            #{order.etsyOrderId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{order.customerName}</Typography>
                          {order.shippingAddress?.city && (
                            <Typography variant="caption" color="text.secondary">
                              {order.shippingAddress.city}, {order.shippingAddress.state}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.productTitle}
                          </Typography>
                          {!order.isProductMapped && (
                            <Chip label="Unmapped" size="small" color="warning" variant="outlined" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{order.quantity}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: order.shipByDate && new Date(order.shipByDate) < new Date() ? 'error.main' : 'text.primary' }}>
                            {formatDate(order.shipByDate)}
                          </Typography>
                        </TableCell>
                        <TableCell><StatusBadge status={order.etsyStatus} /></TableCell>
                        <TableCell align="right">
                          <Tooltip title="View details">
                            <IconButton size="small" onClick={() => setDetailOrder(order)}>
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuOrder(order) }}>
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
              </Box>
            )}
          </>
        )}
      </Card>

      {/* Status change menu */}
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}>
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>Move to</Typography>
        {ETSY_ORDER_STATUSES.map((s) => (
          <MenuItem
            key={s.value}
            disabled={menuOrder?.etsyStatus === s.value}
            onClick={() => handleStatusChange(menuOrder?._id, s.value)}
          >
            {s.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Detail drawer */}
      <OrderDetailDrawer
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        onRefresh={() => { fetchOrders(); fetchCounts() }}
      />

      {/* Snackbar */}
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
