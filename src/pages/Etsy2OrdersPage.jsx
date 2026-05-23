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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  LinearProgress,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import SyncIcon from '@mui/icons-material/Sync'
import AddIcon from '@mui/icons-material/Add'
import PrintIcon from '@mui/icons-material/Print'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined'
import Etsy2OrdersTable from '../components/etsy2/Etsy2OrdersTable'
import OrderKanban from '../components/orders/OrderKanban'
import OrderFormDialog from '../components/orders/OrderFormDialog'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { ORDER_FILTERS } from '../lib/etsy2Constants'
import { buildOrderGroups, getPresetDateRange, reviewFlagsFor, toEtsy2Order } from '../lib/etsy2Orders'

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
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkSelected, setBulkSelected] = useState([])
  const [bulkResults, setBulkResults] = useState([])
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

  const readyForGeneration = useMemo(() => {
    const groups = buildOrderGroups(orders)
    return groups
      .map((group) => {
        const readyItems = group.items.filter((item) => (
          item.requiresTemplateFinalization &&
          item.isProductMapped &&
          !item.templateFinalizedAt &&
          reviewFlagsFor(item).length === 0 &&
          item.podPackageId
        ))
        return { group, order: toEtsy2Order(group), readyItems }
      })
      .filter((entry) => entry.readyItems.length > 0)
  }, [orders])

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

    try {
      const { data } = await api.post(`/orders/group/${encodeURIComponent(etsyOrderId)}/template-finalize`)
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
    }
  }

  const openBulkGenerate = () => {
    const ids = readyForGeneration.map((entry) => entry.group.etsyOrderId)
    setBulkSelected(ids)
    setBulkResults([])
    setBulkOpen(true)
  }

  const handleBulkGenerate = async () => {
    if (bulkSelected.length === 0) return
    setBulkGenerating(true)
    setBulkResults([])

    const results = []
    for (const etsyOrderId of bulkSelected) {
      try {
        const { data } = await api.post(`/orders/group/${encodeURIComponent(etsyOrderId)}/template-finalize`)
        const hasErrors = (data.results || []).some((result) => !result.success)
        results.push({
          etsyOrderId,
          success: !hasErrors,
          message: data.message || 'Generated',
        })
      } catch (err) {
        results.push({
          etsyOrderId,
          success: false,
          message: err.response?.data?.message || err.message || 'Generation failed',
        })
      }
      setBulkResults([...results])
    }

    await Promise.all([fetchOrders(), fetchCounts()])
    setBulkGenerating(false)
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
            {canManage && (
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={openBulkGenerate}
                disabled={readyForGeneration.length === 0}
                sx={{ bgcolor: '#F97316', '&:hover': { bgcolor: '#EA580C' } }}
              >
                Bulk Generate
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
          <Etsy2OrdersTable
            orders={paginatedOrders}
            onViewOrder={openEtsy2Detail}
            onGenerateOrder={handleGenerate}
          />

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

      <Dialog open={bulkOpen} onClose={bulkGenerating ? undefined : () => setBulkOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Bulk Generate Print PDFs
          <Typography variant="body2" sx={{ color: '#71717A', mt: 0.5 }}>
            Ready orders have mapped products, no review flags, and a Lulu POD package ID.
          </Typography>
        </DialogTitle>
        {bulkGenerating && <LinearProgress />}
        <DialogContent dividers>
          {readyForGeneration.length === 0 ? (
            <Alert severity="info">No orders are ready for PDF generation.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {readyForGeneration.map(({ group, order: readyOrder, readyItems }) => {
                const checked = bulkSelected.includes(group.etsyOrderId)
                const result = bulkResults.find((item) => item.etsyOrderId === group.etsyOrderId)
                return (
                  <Box
                    key={group.etsyOrderId}
                    sx={{
                      p: 1.5,
                      border: '1px solid #E3E3E7',
                      borderRadius: '10px',
                      bgcolor: '#FFFFFF',
                      display: 'flex',
                      gap: 1.5,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={bulkGenerating}
                      onChange={(event) => {
                        setBulkSelected((current) => (
                          event.target.checked
                            ? [...new Set([...current, group.etsyOrderId])]
                            : current.filter((id) => id !== group.etsyOrderId)
                        ))
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ color: '#27272A', fontWeight: 700 }}>
                        #{group.etsyOrderId} / {readyOrder.buyerName || 'Unknown customer'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#71717A' }}>
                        {readyItems.length} ready item{readyItems.length === 1 ? '' : 's'} / {readyOrder.shop || 'Etsy'}
                      </Typography>
                      {result && (
                        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 1, borderRadius: '8px' }}>
                          {result.message}
                        </Alert>
                      )}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkGenerating} color="inherit">Close</Button>
          <Button
            variant="contained"
            onClick={handleBulkGenerate}
            disabled={bulkGenerating || bulkSelected.length === 0}
            sx={{ bgcolor: '#F97316', '&:hover': { bgcolor: '#EA580C' } }}
          >
            {bulkGenerating ? 'Generating...' : `Generate ${bulkSelected.length} Order${bulkSelected.length === 1 ? '' : 's'}`}
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
