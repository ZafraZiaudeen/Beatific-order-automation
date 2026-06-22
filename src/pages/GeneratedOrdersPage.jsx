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
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import PrintIcon from '@mui/icons-material/Print'
import CircularProgressIcon from '@mui/icons-material/AutorenewOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import Etsy2GeneratedOrdersTable from '../components/etsy2/Etsy2GeneratedOrdersTable'
import { ITEM_STATUSES } from '../lib/etsy2Constants'
import {
  getGeneratedOrderItems,
  getGeneratedOrderSourceIds,
  hasGeneratedOrderItems,
  isGeneratedPdfUrl,
} from '../lib/generatedOrders'
import { getCancelableLuluSourceIds } from '../lib/luluOrders'
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

const STATUS_FILTERS = [
  { value: 'all', label: 'All PDFs' },
  { value: ITEM_STATUSES.GENERATED, label: 'Generated' },
  { value: ITEM_STATUSES.FAILED, label: 'Failed' },
  { value: ITEM_STATUSES.SHIPPED, label: 'Shipped' },
]

export default function GeneratedOrdersPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [generationJobs, setGenerationJobs] = useState({})
  const completedGenerationJobIdsRef = useRef(new Set())
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkCancelling, setBulkCancelling] = useState(false)
  const [sendingOrderIds, setSendingOrderIds] = useState({})
  const [cancellingOrderIds, setCancellingOrderIds] = useState({})
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/orders', {
        params: {
          page: 1,
          limit: ORDER_FETCH_LIMIT,
          generatedOnly: true,
          ...(search ? { search } : {}),
          ...getPresetDateRange(dateRange),
        },
      })
      const firstPageOrders = data.orders || []
      const totalPages = Math.max(1, Number(data.totalPages || 1))
      if (totalPages === 1) {
        setOrders(firstPageOrders)
        return
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          api.get('/orders', {
            params: {
              page: index + 2,
              limit: ORDER_FETCH_LIMIT,
              generatedOnly: true,
              ...(search ? { search } : {}),
              ...getPresetDateRange(dateRange),
            },
          })
        )
      )
      setOrders([
        ...firstPageOrders,
        ...remainingPages.flatMap((response) => response.data.orders || []),
      ])
    } catch {
      setSnack({ open: true, message: 'Failed to load generated PDFs', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [dateRange, search])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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
        await fetchOrders()
      }
    } catch {
      // Keep the generated list usable if polling briefly fails.
    }
  }, [fetchOrders])

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
  }, [dateRange, search, statusFilter])

  const groupedOrders = useMemo(
    () => buildOrderGroups(orders).map(toEtsy2Order),
    [orders]
  )

  const generatedOrders = useMemo(
    () => groupedOrders.filter(hasGeneratedOrderItems),
    [groupedOrders]
  )

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return generatedOrders
    return generatedOrders.filter((order) =>
      order.items.some((item) => item.status === statusFilter)
    )
  }, [generatedOrders, statusFilter])

  const statusCounts = useMemo(
    () => STATUS_FILTERS.map((filter) => ({
      ...filter,
      count: filter.value === 'all'
        ? generatedOrders.length
        : generatedOrders.filter((order) => order.items.some((item) => item.status === filter.value)).length,
    })),
    [generatedOrders]
  )

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))
  const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const handleToggleOrder = (orderId, checked) => {
    setSelectedOrderIds((current) => (
      checked ? [...new Set([...current, orderId])] : current.filter((id) => id !== orderId)
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

  const openGeneratedDetail = (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId || order?.firstOrder?.etsyOrderId
    if (etsyOrderId) navigate(`/orders/generated/${encodeURIComponent(etsyOrderId)}`)
  }

  const handleEditCanvas = (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId || order?.firstOrder?.etsyOrderId
    if (!etsyOrderId) return
    const firstGeneratedItem = getGeneratedOrderItems(order)[0]
    const source = firstGeneratedItem?.sourceOrder || firstGeneratedItem || {}
    const itemId = source?._id || firstGeneratedItem?.id
    if (!itemId) {
      navigate(`/orders/generated/${encodeURIComponent(etsyOrderId)}`)
      return
    }
    const kind = isGeneratedPdfUrl(source.coverImageUrl) ? 'cover' : 'interior'
    navigate(`/orders/etsy2/${encodeURIComponent(etsyOrderId)}/canvas?source=generated&itemId=${encodeURIComponent(itemId)}&kind=${kind}`)
  }

  const handleSendToLulu = async (order) => {
    const sourceIds = getGeneratedOrderSourceIds(order)
    if (sourceIds.length === 0) {
      setSnack({ open: true, message: 'No generated PDFs are available on this order.', severity: 'warning' })
      return
    }

    setSendingOrderIds((current) => ({ ...current, [order.orderId]: true }))
    try {
      const { data } = await api.post('/lulu/bulk-submit', { orderIds: sourceIds })
      await fetchOrders()
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
      setSendingOrderIds((current) => {
        const next = { ...current }
        delete next[order.orderId]
        return next
      })
    }
  }

  const canGenerateOrderPdf = useCallback((order) =>
    order?.items?.some((item) => item.sourceOrder?.isProductMapped), [])

  const handleGenerate = async (order) => {
    const etsyOrderId = order?.orderId || order?.etsyOrderId
    if (!etsyOrderId) return
    if (!canGenerateOrderPdf(order)) {
      setSnack({ open: true, message: 'Only mapped generated order items can regenerate PDFs.', severity: 'warning' })
      return
    }

    try {
      const job = await startPdfGenerationJob(etsyOrderId, { force: true })
      setGenerationJobs((current) => ({ ...current, [etsyOrderId]: job }))
      setSnack({
        open: true,
        message: 'PDF generation started. You can leave this page and it will keep running.',
        severity: 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate PDFs',
        severity: 'error',
      })
    }
  }

  const selectedGeneratableOrderIds = useMemo(
    () => filteredOrders
      .filter((order) => selectedOrderIds.includes(order.orderId) && canGenerateOrderPdf(order))
      .map((order) => order.orderId),
    [canGenerateOrderPdf, filteredOrders, selectedOrderIds]
  )

  const handleBulkGenerate = async () => {
    if (selectedGeneratableOrderIds.length === 0) {
      setSnack({ open: true, message: 'Select generated orders before regenerating PDFs.', severity: 'warning' })
      return
    }

    setBulkGenerating(true)
    try {
      const jobs = await Promise.all(selectedGeneratableOrderIds.map((etsyOrderId) =>
        startPdfGenerationJob(etsyOrderId, { force: true })
      ))
      setGenerationJobs((current) => {
        const next = { ...current }
        for (const job of jobs) next[job.etsyOrderId] = job
        return next
      })
      setSnack({
        open: true,
        message: `Started PDF generation for ${jobs.length} selected order group${jobs.length === 1 ? '' : 's'}.`,
        severity: 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to start PDF generation',
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

  const activeGeneratingOrderIds = useMemo(
    () => Object.fromEntries(
      Object.entries(generationJobs)
        .filter(([, job]) => isPdfGenerationJobActive(job))
        .map(([etsyOrderId]) => [etsyOrderId, true])
    ),
    [generationJobs]
  )

  const handleBulkSendToLulu = async () => {
    const selectedOrders = filteredOrders.filter((order) => selectedOrderIds.includes(order.orderId))
    const sourceIds = selectedOrders.flatMap(getGeneratedOrderSourceIds)
    if (sourceIds.length === 0) {
      setSnack({ open: true, message: 'Select generated orders with saved PDFs first.', severity: 'warning' })
      return
    }

    setBulkSending(true)
    try {
      const { data } = await api.post('/lulu/bulk-submit', { orderIds: sourceIds })
      await fetchOrders()
      setSelectedOrderIds([])
      setSnack({
        open: true,
        message: `${data.submitted || 0} of ${sourceIds.length} item${sourceIds.length === 1 ? '' : 's'} sent to Lulu.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to send selected orders',
        severity: 'error',
      })
    } finally {
      setBulkSending(false)
    }
  }

  const handleCancelLulu = async (order) => {
    const sourceIds = getCancelableLuluSourceIds(order)
    if (sourceIds.length === 0) {
      setSnack({ open: true, message: 'This order has no Lulu jobs that can still be cancelled.', severity: 'warning' })
      return
    }
    if (!window.confirm(`Cancel ${sourceIds.length} Lulu print job${sourceIds.length === 1 ? '' : 's'} for order #${order.orderId}?`)) return

    setCancellingOrderIds((current) => ({ ...current, [order.orderId]: true }))
    try {
      const { data } = await api.post('/lulu/bulk-cancel', { orderIds: sourceIds })
      await fetchOrders()
      setSnack({
        open: true,
        message: `${data.cancelled || 0} of ${sourceIds.length} Lulu job${sourceIds.length === 1 ? '' : 's'} cancelled.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to cancel Lulu order',
        severity: 'error',
      })
    } finally {
      setCancellingOrderIds((current) => {
        const next = { ...current }
        delete next[order.orderId]
        return next
      })
    }
  }

  const selectedCancelableSourceIds = useMemo(
    () => filteredOrders
      .filter((order) => selectedOrderIds.includes(order.orderId))
      .flatMap(getCancelableLuluSourceIds),
    [filteredOrders, selectedOrderIds]
  )

  const handleBulkCancelLulu = async () => {
    if (selectedCancelableSourceIds.length === 0) {
      setSnack({ open: true, message: 'Select generated orders with cancelable Lulu jobs first.', severity: 'warning' })
      return
    }
    if (!window.confirm(`Cancel ${selectedCancelableSourceIds.length} selected Lulu print job${selectedCancelableSourceIds.length === 1 ? '' : 's'}?`)) return

    setBulkCancelling(true)
    try {
      const { data } = await api.post('/lulu/bulk-cancel', { orderIds: selectedCancelableSourceIds })
      await fetchOrders()
      setSelectedOrderIds([])
      setSnack({
        open: true,
        message: `${data.cancelled || 0} of ${selectedCancelableSourceIds.length} Lulu job${selectedCancelableSourceIds.length === 1 ? '' : 's'} cancelled.`,
        severity: data.failed > 0 ? 'warning' : 'success',
      })
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.message || err.response?.data?.error || 'Failed to cancel selected Lulu orders',
        severity: 'error',
      })
    } finally {
      setBulkCancelling(false)
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '10px', bgcolor: '#5B21D6', color: '#FFFFFF', display: 'grid', placeItems: 'center' }}>
              <DescriptionOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#27272A' }}>
                Generated PDFs
              </Typography>
              <Typography variant="body2" sx={{ color: '#71717A' }}>
                {loading ? 'Loading generated print files...' : `${generatedOrders.length} grouped orders with print-ready PDFs`}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              {DATE_RANGE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {canManage && (
            <Button
              variant="outlined"
              startIcon={bulkGenerating ? <CircularProgress size={16} /> : <PrintIcon />}
              onClick={handleBulkGenerate}
              disabled={selectedGeneratableOrderIds.length === 0 || bulkGenerating}
              sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 800 }}
            >
              {bulkGenerating ? 'Generating...' : 'Generate Selected'}
            </Button>
          )}
          {canManage && (
            <Button
              variant="contained"
              startIcon={bulkSending ? <CircularProgress size={16} color="inherit" /> : <LocalShippingOutlinedIcon />}
              onClick={handleBulkSendToLulu}
              disabled={selectedOrderIds.length === 0 || bulkSending}
              sx={{ bgcolor: '#5B21D6', '&:hover': { bgcolor: '#4C1D95' }, fontWeight: 800 }}
            >
              {bulkSending ? 'Sending...' : 'Send Selected'}
            </Button>
          )}
          {canManage && (
            <Button
              variant="outlined"
              color="error"
              startIcon={bulkCancelling ? <CircularProgress size={16} /> : <CancelOutlinedIcon />}
              onClick={handleBulkCancelLulu}
              disabled={selectedCancelableSourceIds.length === 0 || bulkCancelling}
              sx={{ fontWeight: 800 }}
            >
              {bulkCancelling ? 'Cancelling...' : 'Cancel Selected Lulu'}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<CircularProgressIcon />}
            onClick={fetchOrders}
            sx={{ borderColor: '#E5E7EB', color: '#111827', fontWeight: 700 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search generated orders by ID, buyer, item, SKU, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            },
          }}
        />
      </Box>

      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {statusCounts.map((filter) => (
          <Chip
            key={filter.value}
            label={`${filter.label} ${filter.count}`}
            onClick={() => setStatusFilter(filter.value)}
            sx={{
              bgcolor: statusFilter === filter.value ? '#5B21D6' : '#FFFFFF',
              color: statusFilter === filter.value ? '#FFFFFF' : '#27272A',
              border: '1px solid',
              borderColor: statusFilter === filter.value ? '#5B21D6' : '#E3E3E7',
              fontWeight: 700,
            }}
          />
        ))}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredOrders.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          No generated PDFs match the current filters yet.
        </Alert>
      ) : (
        <>
          <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <Etsy2GeneratedOrdersTable
              orders={paginatedOrders}
              onPreview={openGeneratedDetail}
              onEditCanvas={handleEditCanvas}
              onGenerateOrder={handleGenerate}
              onCancelGeneration={handleCancelGeneration}
              onSendToLulu={handleSendToLulu}
              onCancelLulu={handleCancelLulu}
              canManage={canManage}
              selectedOrderIds={selectedOrderIds}
              onToggleOrder={handleToggleOrder}
              onToggleVisible={handleToggleVisible}
              allVisibleSelected={paginatedOrders.length > 0 && selectedVisibleCount === paginatedOrders.length}
              partiallyVisibleSelected={selectedVisibleCount > 0 && selectedVisibleCount < paginatedOrders.length}
              generatingOrderIds={activeGeneratingOrderIds}
              sendingOrderIds={sendingOrderIds}
              cancellingOrderIds={cancellingOrderIds}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: '#71717A' }}>
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length} generated orders
            </Typography>
            {totalPages > 1 && (
              <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
            )}
          </Box>
        </>
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
