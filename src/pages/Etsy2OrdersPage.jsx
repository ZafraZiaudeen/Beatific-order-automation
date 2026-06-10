import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Snackbar,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SyncIcon from '@mui/icons-material/Sync'
import AddIcon from '@mui/icons-material/Add'
import PrintIcon from '@mui/icons-material/Print'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import Etsy2OrdersTable from '../components/etsy2/Etsy2OrdersTable'
import OrderKanban from '../components/orders/OrderKanban'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { ITEM_STATUSES, ORDER_FILTERS } from '../lib/etsy2Constants'
import { buildOrderGroups, getPresetDateRange, toEtsy2Order } from '../lib/etsy2Orders'
import {
  cancelPdfGenerationJob,
  isPdfGenerationJobActive,
  listPdfGenerationJobs,
  startPdfGenerationJob,
} from '../lib/pdfGenerationJobs'

const ITEMS_PER_PAGE = 10
const ORDER_FETCH_LIMIT = 2000

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '1y', label: 'This year' },
]

const LIST_FILTERS = ORDER_FILTERS.filter((filter) => filter.value !== ITEM_STATUSES.GENERATED)

const orderWithOnlyStatusItems = (order, status) => {
  if (status === 'all') return order
  const items = (order.items || []).filter((item) => item.status === status)
  if (items.length === 0) return null

  return {
    ...order,
    items,
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    total: items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0),
    hasUnmapped: items.some((item) => item.status === ITEM_STATUSES.UNMAPPED),
    hasAiFlags: items.some((item) => item.status === ITEM_STATUSES.AI_FLAGGED),
    reviewFlags: [...new Set(items.flatMap((item) => item.aiFlags || []))],
  }
}

const canGenerateItemPdf = (item) =>
  [ITEM_STATUSES.MAPPED, ITEM_STATUSES.FAILED, ITEM_STATUSES.GENERATED].includes(item.status)

const shouldForceGenerateOrder = (order) =>
  order.items?.some((item) => [ITEM_STATUSES.FAILED, ITEM_STATUSES.GENERATED].includes(item.status))

export default function Etsy2OrdersPage() {
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [page, setPage] = useState(1)
  const [view, setView] = useState(() => localStorage.getItem('beatific_etsy2_order_view') || 'list')
  const [statusCounts, setStatusCounts] = useState({})
  const [syncing, setSyncing] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [generationJobs, setGenerationJobs] = useState({})
  const completedGenerationJobIdsRef = useRef(new Set())
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        limit: ORDER_FETCH_LIMIT,
        ...(activeStore?._id ? { storeId: activeStore._id } : {}),
        ...(search ? { search } : {}),
        ...getPresetDateRange(dateRange),
      }
      const { data } = await api.get('/orders', {
        params: {
          ...params,
          page: 1,
        },
      })
      const totalPages = Math.max(1, Number(data.totalPages || 1))
      const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => index + 2)
      const remainingResults = await Promise.all(
        remainingPages.map((nextPage) => api.get('/orders', { params: { ...params, page: nextPage } }))
      )
      setOrders([
        ...(data.orders || []),
        ...remainingResults.flatMap((result) => result.data?.orders || []),
      ])
    } catch {
      setSnack({ open: true, message: 'Failed to load orders', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [activeStore?._id, dateRange, search])

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/status-counts', {
        params: {
          ...(activeStore?._id ? { storeId: activeStore._id } : {}),
          ...getPresetDateRange(dateRange),
        },
      })
      setStatusCounts(data || {})
    } catch {
      setStatusCounts({})
    }
  }, [activeStore?._id, dateRange])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  const refreshGenerationJobs = useCallback(async () => {
    try {
      const jobs = await listPdfGenerationJobs()
      setGenerationJobs((current) => {
        const next = { ...current }
        for (const job of jobs) next[job.etsyOrderId] = job
        return next
      })

      const newlyFinished = jobs.filter((job) =>
        ['succeeded', 'failed', 'cancelled'].includes(job.status) &&
        !completedGenerationJobIdsRef.current.has(job.id)
      )
      if (newlyFinished.length > 0) {
        newlyFinished.forEach((job) => completedGenerationJobIdsRef.current.add(job.id))
        await Promise.all([fetchOrders(), fetchCounts()])
      }
    } catch {
      // Keep the list usable if polling fails briefly.
    }
  }, [fetchCounts, fetchOrders])

  useEffect(() => {
    refreshGenerationJobs()
  }, [refreshGenerationJobs])

  useEffect(() => {
    const hasActiveJobs = Object.values(generationJobs).some(isPdfGenerationJobActive)
    if (!hasActiveJobs) return undefined
    const timer = window.setInterval(refreshGenerationJobs, 2500)
    return () => window.clearInterval(timer)
  }, [generationJobs, refreshGenerationJobs])

  useEffect(() => {
    setPage(1)
    setSelectedOrderIds([])
  }, [activeFilter, dateRange, search, activeStore?._id, view])

  const etsy2Orders = useMemo(
    () => buildOrderGroups(orders).map(toEtsy2Order),
    [orders]
  )

  const filterCounts = useMemo(
    () => LIST_FILTERS.map((filter) => {
      if (filter.value === 'all') return { ...filter, count: etsy2Orders.length }
      const count = etsy2Orders.filter((order) => order.items?.some((item) => item.status === filter.value)).length
      return { ...filter, count }
    }),
    [etsy2Orders]
  )

  const filteredOrders = useMemo(
    () => etsy2Orders.map((order) => orderWithOnlyStatusItems(order, activeFilter)).filter(Boolean),
    [activeFilter, etsy2Orders]
  )

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))
  const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const handleViewChange = (_, nextView) => {
    if (!nextView) return
    setView(nextView)
    localStorage.setItem('beatific_etsy2_order_view', nextView)
  }

  const handleSync = async () => {
    if (!activeStore?._id) {
      setSnack({ open: true, message: 'Select a store before syncing email orders.', severity: 'warning' })
      return
    }

    setSyncing(true)
    try {
      const { data } = await api.post('/email-orders/fetch', { storeId: activeStore._id })
      await Promise.all([fetchOrders(), fetchCounts()])
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

  const handleGenerate = async (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId
    if (!etsyOrderId) return
    if (!order.items?.some(canGenerateItemPdf)) {
      setSnack({ open: true, message: 'Only mapped or failed generated order items can generate PDFs.', severity: 'warning' })
      return
    }

    try {
      const job = await startPdfGenerationJob(etsyOrderId, { force: shouldForceGenerateOrder(order) })
      setGenerationJobs((current) => ({ ...current, [etsyOrderId]: job }))
      setSnack({
        open: true,
        message: 'PDF generation started. You can leave this page and it will keep running.',
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

  const selectedMappedOrderIds = useMemo(
    () => filteredOrders
      .filter((order) =>
        selectedOrderIds.includes(order.orderId) &&
        order.items?.some(canGenerateItemPdf)
      )
      .map((order) => order.orderId),
    [filteredOrders, selectedOrderIds]
  )

  const handleBulkGenerate = async () => {
    if (selectedMappedOrderIds.length === 0) {
      setSnack({ open: true, message: 'Select mapped order groups before generating PDFs.', severity: 'warning' })
      return
    }

    setBulkGenerating(true)
    try {
      const jobs = await Promise.all(selectedMappedOrderIds.map((etsyOrderId) => {
        const order = filteredOrders.find((item) => item.orderId === etsyOrderId)
        return startPdfGenerationJob(etsyOrderId, { force: shouldForceGenerateOrder(order || {}) })
      }))
      setGenerationJobs((current) => {
        const next = { ...current }
        for (const job of jobs) next[job.etsyOrderId] = job
        return next
      })
      setSelectedOrderIds([])
      setSnack({
        open: true,
        message: `Started PDF generation for ${jobs.length} selected order group${jobs.length === 1 ? '' : 's'}.`,
        severity: 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to start selected PDF generation',
        severity: 'error',
      })
    } finally {
      setBulkGenerating(false)
    }
  }

  const handleCancelGeneration = async (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId
    const job = generationJobs[etsyOrderId]
    if (!job?.id) return

    try {
      const cancelledJob = await cancelPdfGenerationJob(job.id)
      setGenerationJobs((current) => ({ ...current, [etsyOrderId]: cancelledJob }))
      setSnack({ open: true, message: 'PDF generation cancellation requested.', severity: 'info' })
      refreshGenerationJobs()
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.message || 'Failed to cancel PDF generation',
        severity: 'error',
      })
    }
  }

  const openEtsy2Detail = (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId || order?.firstOrder?.etsyOrderId
    if (etsyOrderId) navigate(`/orders/etsy2/${encodeURIComponent(etsyOrderId)}`)
  }

  const handleFilterChange = (filterValue) => {
    setActiveFilter(filterValue)
    setPage(1)
    setSelectedOrderIds([])
  }

  const handleToggleOrder = (orderId, checked) => {
    setSelectedOrderIds((current) => (
      checked ? [...new Set([...current, orderId])] : current.filter((id) => id !== orderId)
    ))
  }

  const handleToggleVisible = (checked) => {
    const visibleIds = paginatedOrders.map((order) => order.orderId)
    setSelectedOrderIds((current) => (
      checked ? [...new Set([...current, ...visibleIds])] : current.filter((id) => !visibleIds.includes(id))
    ))
  }

  const selectedVisibleCount = paginatedOrders.filter((order) => selectedOrderIds.includes(order.orderId)).length
  const activeGeneratingOrderIds = useMemo(
    () => Object.fromEntries(
      Object.entries(generationJobs)
        .filter(([, job]) => isPdfGenerationJobActive(job))
        .map(([etsyOrderId]) => [etsyOrderId, true])
    ),
    [generationJobs]
  )

  const deleteGroupedOrders = async (orderIds, label = 'selected order groups') => {
    if (!orderIds.length) return

    const orderGroups = etsy2Orders.filter((order) => orderIds.includes(order.orderId))
    const sourceOrderIds = [...new Set(orderGroups.flatMap((order) => order.sourceGroup?.orderIds || []))]
    if (!sourceOrderIds.length) {
      setSnack({ open: true, message: 'No order items were found to delete.', severity: 'warning' })
      return
    }

    const confirmed = window.confirm(
      `Delete ${orderIds.length} ${label}? This removes all items inside those Etsy2 orders and cannot be undone.`
    )
    if (!confirmed) return

    try {
      await api.delete('/orders/bulk', { data: { orderIds: sourceOrderIds } })
      setSelectedOrderIds((current) => current.filter((id) => !orderIds.includes(id)))
      await Promise.all([fetchOrders(), fetchCounts()])
      setSnack({
        open: true,
        message: `${orderIds.length} order group${orderIds.length === 1 ? '' : 's'} deleted`,
        severity: 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to delete selected orders',
        severity: 'error',
      })
    }
  }

  const handleDeleteOrder = async (order) => {
    if (!order?.orderId) return
    await deleteGroupedOrders([order.orderId], 'order group')
  }

  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return
    await deleteGroupedOrders(selectedOrderIds, 'selected order groups')
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, bgcolor: '#F97316', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: '20px', color: '#FFFFFF', fontWeight: 700 }}>E</Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#27272A' }}>
                Orders
              </Typography>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                {loading ? 'Loading Etsy orders...' : `${etsy2Orders.length} grouped orders`}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                sx={{ bgcolor: '#FFFFFF', borderRadius: '8px', '& fieldset': { borderColor: '#E3E3E7' } }}
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<DescriptionOutlinedIcon />}
              onClick={() => navigate('/orders/generated')}
              sx={{ borderColor: '#E3E3E7', color: '#27272A', '&:hover': { borderColor: '#D4D4D8', bgcolor: '#FAFAFA' } }}
            >
              Generated PDFs
            </Button>
            {canManage && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setManualOpen(true)}
                sx={{ borderColor: '#E3E3E7', color: '#27272A', '&:hover': { borderColor: '#D4D4D8', bgcolor: '#FAFAFA' } }}
              >
                Add Order
              </Button>
            )}
            {canManage && (
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handleBulkGenerate}
                disabled={selectedMappedOrderIds.length === 0 || bulkGenerating}
                size="small"
                sx={{ bgcolor: '#F97316', minHeight: 32, px: 1.5, fontSize: '0.8125rem', '&:hover': { bgcolor: '#EA580C' } }}
              >
                {bulkGenerating ? 'Generating...' : 'Generate Selected'}
              </Button>
            )}
            {canManage && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={handleBulkDelete}
                disabled={selectedOrderIds.length === 0}
                size="small"
                sx={{ borderRadius: '8px', minHeight: 32, px: 1.5, fontSize: '0.8125rem' }}
              >
                Delete Selected
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing}
              sx={{ borderColor: '#E3E3E7', color: '#27272A', '&:hover': { borderColor: '#D4D4D8', bgcolor: '#FAFAFA' } }}
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
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
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search orders by ID, buyer, email, item, SKU, or shop..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#71717A' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#FFFFFF',
              borderRadius: '10px',
              '& fieldset': { borderColor: '#E3E3E7' },
              '&:hover fieldset': { borderColor: '#D4D4D8' },
            },
          }}
        />
      </Box>

      {view === 'list' && (
        <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {filterCounts.map((filter) => (
            <Chip
              key={filter.value}
              label={`${filter.label} ${filter.count}`}
              onClick={() => handleFilterChange(filter.value)}
              sx={{
                bgcolor: activeFilter === filter.value ? '#F97316' : '#FFFFFF',
                color: activeFilter === filter.value ? '#FFFFFF' : '#27272A',
                border: '1px solid',
                borderColor: activeFilter === filter.value ? '#F97316' : '#E3E3E7',
                fontWeight: 500,
                fontSize: '0.875rem',
                '&:hover': { bgcolor: activeFilter === filter.value ? '#EA580C' : '#FAFAFA' },
              }}
            />
          ))}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : view === 'board' ? (
        <Box sx={{ p: 2, bgcolor: '#FFFFFF', border: '1px solid #E3E3E7', borderRadius: '12px' }}>
          <OrderKanban
            orders={orders}
            onOrderClick={openEtsy2Detail}
            onOrdersChange={() => {
              fetchOrders()
              fetchCounts()
            }}
            statusCounts={statusCounts}
            readOnly={!canManage}
          />
        </Box>
      ) : (
        <>
          {canManage && (
            <Box sx={{ mb: 2, p: 2, bgcolor: '#FFFFFF', border: '1px solid #E3E3E7', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#27272A' }}>
                  {activeFilter === 'all' ? 'Orders' : `${filterCounts.find((filter) => filter.value === activeFilter)?.label || 'Filtered'} Orders`} ({filteredOrders.length})
                </Typography>
                <Typography variant="body2" sx={{ color: '#71717A' }}>
                  Generate PDFs from mapped orders here. Preview, edit, and resend print-ready files from the separate Generated PDFs page.
                </Typography>
              </Box>
            </Box>
          )}

          <Etsy2OrdersTable
            orders={paginatedOrders}
            onViewOrder={openEtsy2Detail}
            onGenerateOrder={handleGenerate}
            canManage={canManage}
            selectedOrderIds={selectedOrderIds}
            onToggleOrder={handleToggleOrder}
            onToggleVisible={handleToggleVisible}
            allVisibleSelected={paginatedOrders.length > 0 && selectedVisibleCount === paginatedOrders.length}
            partiallyVisibleSelected={selectedVisibleCount > 0 && selectedVisibleCount < paginatedOrders.length}
            generatingOrderIds={activeGeneratingOrderIds}
            onCancelGeneration={handleCancelGeneration}
            onDeleteOrder={handleDeleteOrder}
          />

          {filteredOrders.length === 0 && (
            <Alert severity="info" sx={{ mt: 2, borderRadius: '12px' }}>
              No orders found. Try another filter or sync email orders.
            </Alert>
          )}

          {filteredOrders.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
              </Typography>
              {totalPages > 1 && <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" />}
            </Box>
          )}
        </>
      )}

      {canManage && (
        <OrderFormDialog
          open={manualOpen}
          mode="create"
          activeStore={activeStore}
          onClose={() => setManualOpen(false)}
          onSaved={() => {
            setManualOpen(false)
            fetchOrders()
            fetchCounts()
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
