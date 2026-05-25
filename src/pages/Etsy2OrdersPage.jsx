import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Pagination,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SyncIcon from '@mui/icons-material/Sync'
import AddIcon from '@mui/icons-material/Add'
import PrintIcon from '@mui/icons-material/Print'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import Etsy2OrdersTable from '../components/etsy2/Etsy2OrdersTable'
import Etsy2GeneratedOrdersTable from '../components/etsy2/Etsy2GeneratedOrdersTable'
import OrderKanban from '../components/orders/OrderKanban'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { ITEM_STATUSES, ORDER_FILTERS } from '../lib/etsy2Constants'
import { getGeneratedOrderSourceIds } from '../lib/generatedOrders'
import { buildOrderGroups, getPresetDateRange, toEtsy2Order } from '../lib/etsy2Orders'

const ITEMS_PER_PAGE = 10

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '1y', label: 'This year' },
]

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
  const [generatingOrderIds, setGeneratingOrderIds] = useState({})
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [sendingOrderIds, setSendingOrderIds] = useState({})
  const [bulkSending, setBulkSending] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/orders', {
        params: {
          page: 1,
          limit: view === 'board' ? 200 : 500,
          ...(activeStore?._id ? { storeId: activeStore._id } : {}),
          ...(search ? { search } : {}),
          ...getPresetDateRange(dateRange),
        },
      })
      setOrders(data.orders || [])
    } catch {
      setSnack({ open: true, message: 'Failed to load orders', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [activeStore?._id, dateRange, search, view])

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

  useEffect(() => {
    setPage(1)
    setSelectedOrderIds([])
  }, [activeFilter, dateRange, search, activeStore?._id, view])

  const etsy2Orders = useMemo(
    () => buildOrderGroups(orders).map(toEtsy2Order),
    [orders]
  )

  const filterCounts = useMemo(
    () => ORDER_FILTERS.map((filter) => {
      if (filter.value === 'all') return { ...filter, count: etsy2Orders.length }
      const count = etsy2Orders.filter((order) =>
        order.items?.some((item) => item.status === filter.value)
      ).length
      return { ...filter, count }
    }),
    [etsy2Orders]
  )

  const filteredOrders = useMemo(
    () => etsy2Orders.filter((order) => (
      activeFilter === 'all' ||
      order.items?.some((item) => item.status === activeFilter)
    )),
    [activeFilter, etsy2Orders]
  )

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

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

    setGeneratingOrderIds((current) => ({ ...current, [etsyOrderId]: true }))
    try {
      const { data } = await api.post(`/orders/group/${encodeURIComponent(etsyOrderId)}/generate-pdf`)
      const hasErrors = (data.results || []).some((result) => !result.success)
      const firstError = (data.results || []).find((result) => !result.success)?.error
      await Promise.all([fetchOrders(), fetchCounts()])
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
      setGeneratingOrderIds((current) => {
        const next = { ...current }
        delete next[etsyOrderId]
        return next
      })
    }
  }

  const handleBulkGenerate = async () => {
    if (selectedOrderIds.length === 0) return
    setBulkGenerating(true)
    const results = []
    setGeneratingOrderIds((current) => selectedOrderIds.reduce((next, id) => ({ ...next, [id]: true }), { ...current }))

    for (const etsyOrderId of selectedOrderIds) {
      try {
        const { data } = await api.post(`/orders/group/${encodeURIComponent(etsyOrderId)}/generate-pdf`)
        const hasErrors = (data.results || []).some((result) => !result.success)
        const firstError = (data.results || []).find((result) => !result.success)?.error
        results.push({
          etsyOrderId,
          success: !hasErrors,
          message: hasErrors ? firstError || data.message || 'Generation completed with errors' : data.message || 'Generated',
        })
      } catch (err) {
        results.push({
          etsyOrderId,
          success: false,
          message: err.response?.data?.error || err.response?.data?.message || err.message || 'Generation failed',
        })
      }
      setGeneratingOrderIds((current) => {
        const next = { ...current }
        delete next[etsyOrderId]
        return next
      })
    }

    await Promise.all([fetchOrders(), fetchCounts()])
    setBulkGenerating(false)
    setSelectedOrderIds([])
    setSnack({
      open: true,
      message: `Generated ${results.filter((result) => result.success).length} of ${results.length} selected order groups`,
      severity: results.some((result) => !result.success) ? 'warning' : 'success',
    })
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
      checked
        ? [...new Set([...current, orderId])]
        : current.filter((id) => id !== orderId)
    ))
  }

  const handleToggleVisible = (checked) => {
    const visibleIds = paginatedOrders.map((order) => order.orderId)
    setSelectedOrderIds((current) => (
      checked
        ? [...new Set([...current, ...visibleIds])]
        : current.filter((id) => !visibleIds.includes(id))
    ))
  }

  const selectedVisibleCount = paginatedOrders.filter((order) => selectedOrderIds.includes(order.orderId)).length
  const generatedFilterActive = activeFilter === ITEM_STATUSES.GENERATED

  const openGeneratedPreview = (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId || order?.firstOrder?.etsyOrderId
    if (etsyOrderId) navigate(`/orders/etsy2/${encodeURIComponent(etsyOrderId)}?view=generated`)
  }

  const handleEditCanvas = (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId || order?.firstOrder?.etsyOrderId
    if (etsyOrderId) navigate(`/orders/etsy2/${encodeURIComponent(etsyOrderId)}/canvas`)
  }

  const handleSendToLulu = async (order) => {
    const sourceIds = getGeneratedOrderSourceIds(order)
    if (sourceIds.length === 0) {
      setSnack({ open: true, message: 'No generated PDFs are ready for Lulu on this order.', severity: 'warning' })
      return
    }

    setSendingOrderIds((current) => ({ ...current, [order.orderId]: true }))
    try {
      const { data } = await api.post('/lulu/bulk-submit', { orderIds: sourceIds })
      await Promise.all([fetchOrders(), fetchCounts()])
      setSnack({
        open: true,
        message: `Sent ${data.submitted || 0} of ${sourceIds.length} generated item${sourceIds.length === 1 ? '' : 's'} to Lulu.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to send order to Lulu',
        severity: 'error',
      })
    } finally {
      setSendingOrderIds((current) => {
        const next = { ...current }
        delete next[order.orderId]
        return next
      })
    }
  }

  const handleBulkSendToLulu = async () => {
    const selectedOrders = filteredOrders.filter((order) => selectedOrderIds.includes(order.orderId))
    const sourceIds = selectedOrders.flatMap(getGeneratedOrderSourceIds)
    if (sourceIds.length === 0) {
      setSnack({ open: true, message: 'Select generated orders with cover and inside PDFs first.', severity: 'warning' })
      return
    }

    setBulkSending(true)
    setSendingOrderIds((current) => selectedOrders.reduce((next, order) => ({ ...next, [order.orderId]: true }), { ...current }))
    try {
      const { data } = await api.post('/lulu/bulk-submit', { orderIds: sourceIds })
      await Promise.all([fetchOrders(), fetchCounts()])
      setSelectedOrderIds([])
      setSnack({
        open: true,
        message: `Sent ${data.submitted || 0} of ${sourceIds.length} generated item${sourceIds.length === 1 ? '' : 's'} to Lulu.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to send selected orders to Lulu',
        severity: 'error',
      })
    } finally {
      setBulkSending(false)
      setSendingOrderIds({})
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: '#F97316',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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
                sx={{
                  bgcolor: '#FFFFFF',
                  borderRadius: '8px',
                  '& fieldset': { borderColor: '#E3E3E7' },
                }}
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {canManage && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setManualOpen(true)}
                sx={{
                  borderColor: '#E3E3E7',
                  color: '#27272A',
                  '&:hover': { borderColor: '#D4D4D8', bgcolor: '#FAFAFA' },
                }}
              >
                Add Order
              </Button>
            )}
            {canManage && !generatedFilterActive && (
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handleBulkGenerate}
                disabled={selectedOrderIds.length === 0 || bulkGenerating}
                sx={{ bgcolor: '#F97316', '&:hover': { bgcolor: '#EA580C' } }}
              >
                {bulkGenerating ? 'Generating...' : 'Generate Selected'}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing}
              sx={{
                borderColor: '#E3E3E7',
                color: '#27272A',
                '&:hover': {
                  borderColor: '#D4D4D8',
                  bgcolor: '#FAFAFA',
                },
              }}
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
              '& fieldset': {
                borderColor: '#E3E3E7',
              },
              '&:hover fieldset': {
                borderColor: '#D4D4D8',
              },
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
                '&:hover': {
                  bgcolor: activeFilter === filter.value ? '#EA580C' : '#FAFAFA',
                },
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
          {canManage && !generatedFilterActive && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: '#FFFFFF',
                border: '1px solid #E3E3E7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#27272A' }}>
                  {activeFilter === 'all' ? 'Orders' : `${filterCounts.find((filter) => filter.value === activeFilter)?.label || 'Filtered'} Orders`} ({filteredOrders.length})
                </Typography>
                <Typography variant="body2" sx={{ color: '#71717A' }}>
                  Select mapped order groups and generate their print PDFs together.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={bulkGenerating ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
                onClick={handleBulkGenerate}
                disabled={selectedOrderIds.length === 0 || bulkGenerating}
                sx={{ bgcolor: '#F97316', '&:hover': { bgcolor: '#EA580C' } }}
              >
                {bulkGenerating ? 'Generating...' : `Generate PDFs for Selected${selectedOrderIds.length ? ` (${selectedOrderIds.length})` : ''}`}
              </Button>
            </Box>
          )}

          {generatedFilterActive ? (
            <Box
              sx={{
                mb: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  display: 'flex',
                  alignItems: { xs: 'stretch', lg: 'flex-end' },
                  justifyContent: 'space-between',
                  gap: 2,
                  flexDirection: { xs: 'column', lg: 'row' },
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>
                    Generated Orders ({filteredOrders.length})
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                    PDFs have been successfully generated and are ready to preview, edit, or send to Lulu.
                  </Typography>
                  {canManage && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        startIcon={bulkSending ? <CircularProgress size={16} color="inherit" /> : <LocalShippingOutlinedIcon />}
                        onClick={handleBulkSendToLulu}
                        disabled={selectedOrderIds.length === 0 || bulkSending}
                        sx={{
                          bgcolor: '#5B21D6',
                          fontWeight: 800,
                          borderRadius: '6px',
                          px: 2.5,
                          '&:hover': { bgcolor: '#4C1D95' },
                        }}
                      >
                        {bulkSending ? 'Sending...' : 'Send Selected to Lulu'}
                      </Button>
                      <Button
                        variant="outlined"
                        endIcon={<KeyboardArrowDownIcon />}
                        startIcon={<FileDownloadOutlinedIcon />}
                        sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700, borderRadius: '6px' }}
                      >
                        Export
                      </Button>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Search orders..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#94A3B8' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      minWidth: { xs: '100%', sm: 320 },
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        '& fieldset': { borderColor: '#E5E7EB' },
                      },
                    }}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FilterListOutlinedIcon />}
                    endIcon={<KeyboardArrowDownIcon />}
                    sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700, borderRadius: '6px', minHeight: 40 }}
                  >
                    Filters
                  </Button>
                </Box>
              </Box>

              <Etsy2GeneratedOrdersTable
                orders={paginatedOrders}
                onPreview={openGeneratedPreview}
                onEditCanvas={handleEditCanvas}
                onSendToLulu={handleSendToLulu}
                canManage={canManage}
                selectedOrderIds={selectedOrderIds}
                onToggleOrder={handleToggleOrder}
                onToggleVisible={handleToggleVisible}
                allVisibleSelected={paginatedOrders.length > 0 && selectedVisibleCount === paginatedOrders.length}
                partiallyVisibleSelected={selectedVisibleCount > 0 && selectedVisibleCount < paginatedOrders.length}
                sendingOrderIds={sendingOrderIds}
              />
            </Box>
          ) : (
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
              generatingOrderIds={generatingOrderIds}
            />
          )}

          {filteredOrders.length === 0 && (
            <Box
              sx={{
                mt: 2,
                p: 4,
                bgcolor: '#FFFFFF',
                border: '1px solid #E3E3E7',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#27272A' }}>
                No orders found
              </Typography>
              <Typography variant="body2" sx={{ color: '#71717A', mt: 0.5 }}>
                Try another filter or sync email orders.
              </Typography>
            </Box>
          )}

          {filteredOrders.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(page * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} orders
              </Typography>
              {totalPages > 1 && (
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      borderRadius: '8px',
                    },
                  }}
                />
              )}
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
