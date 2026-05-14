import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RefreshIcon from '@mui/icons-material/RefreshOutlined'
import ReplayIcon from '@mui/icons-material/ReplayOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import StatusBadge from '../components/orders/StatusBadge'
import LuluReviewDialog from '../components/orders/LuluReviewDialog'
import { LULU_ORDER_STATUSES } from '../lib/constants'

const LULU_TABS = [
  { value: '', label: 'All' },
  ...LULU_ORDER_STATUSES,
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

export default function LuluOrdersPage() {
  const { activeStore } = useAuthStore()
  const [tab, setTab] = useState('')
  const [orders, setOrders] = useState([])
  const [readyOrders, setReadyOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [selectedSubmitted, setSelectedSubmitted] = useState([])
  const [reviewOrder, setReviewOrder] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [refreshingId, setRefreshingId] = useState(null)
  const [retryingId, setRetryingId] = useState(null)
  const [dateRange, setDateRange] = useState('all')
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const dateParams = getPresetDateRange(dateRange)
      const params = {
        limit: 100,
        ...(activeStore && { storeId: activeStore._id }),
        ...dateParams,
      }

      // Fetch submitted orders
      const { data } = await api.get('/orders', { params })
      const allOrders = data.orders || []

      // Show only orders that were actually submitted to Lulu.
      const luluFiltered = allOrders.filter((o) => Boolean(o.luluJobId || o.luluStatus))
      const statusFiltered = tab ? luluFiltered.filter((o) => o.luluStatus === tab) : luluFiltered
      setOrders(statusFiltered)

      // Ready to submit
      setReadyOrders(allOrders.filter((o) =>
        o.etsyStatus === 'completed' &&
        !o.luluStatus &&
        !o.luluJobId &&
        o.coverImageUrl &&
        o.interiorPdfUrl &&
        o.podPackageId
      ))
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [activeStore, tab, dateRange])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleBulkSubmit = async () => {
    if (selected.length === 0) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/lulu/bulk-submit', { orderIds: selected })
      setSelected([])
      fetchOrders()
      setSnack({ open: true, message: `${data.submitted} orders submitted to Lulu${data.failed > 0 ? `, ${data.failed} failed` : ''}`, severity: data.failed > 0 ? 'warning' : 'success' })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to submit orders', severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefreshStatus = async (orderId) => {
    setRefreshingId(orderId)
    try {
      await api.get(`/lulu/status/${orderId}`)
      fetchOrders()
      setSnack({ open: true, message: 'Status refreshed', severity: 'success' })
    } catch {
      setSnack({ open: true, message: 'Failed to refresh status', severity: 'error' })
    } finally {
      setRefreshingId(null)
    }
  }

  const handleRetry = async (orderId) => {
    setRetryingId(orderId)
    try {
      await api.post(`/lulu/retry/${orderId}`)
      fetchOrders()
      setSnack({ open: true, message: 'Order resubmitted to Lulu', severity: 'success' })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to retry', severity: 'error' })
    } finally {
      setRetryingId(null)
    }
  }

  const handleBulkDeleteSubmitted = async () => {
    if (selectedSubmitted.length === 0) return
    const count = selectedSubmitted.length
    const confirmed = window.confirm(`Delete ${count} Lulu order${count === 1 ? '' : 's'}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await api.delete('/orders/bulk', { data: { orderIds: selectedSubmitted } })
      setSelectedSubmitted([])
      fetchOrders()
      setSnack({ open: true, message: `${count} order${count === 1 ? '' : 's'} deleted`, severity: 'success' })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to delete selected orders', severity: 'error' })
    }
  }

  const formatDate = (d) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const eligibleForSubmit = readyOrders.filter((o) => o.coverImageUrl && o.interiorPdfUrl && o.podPackageId)
  const missingFiles = readyOrders.filter((o) => !o.coverImageUrl || !o.interiorPdfUrl || !o.podPackageId)

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Lulu Orders</Typography>
        <Typography variant="body2" color="text.secondary">
          Submit orders to Lulu Print API and track their production status.
        </Typography>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value)
              setSelected([])
              setSelectedSubmitted([])
            }}
          >
            {DATE_RANGE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Ready to Submit */}
      {readyOrders.length > 0 && (
        <Card sx={{ mb: 3, border: '1px solid', borderColor: 'primary.light' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SendOutlinedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Ready to Submit ({readyOrders.length})
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LocalPrintshopOutlinedIcon />}
                disabled={submitting || selected.length === 0}
                onClick={handleBulkSubmit}
              >
                {submitting ? 'Submitting...' : `Submit ${selected.length > 0 ? selected.length : ''} to Lulu`}
              </Button>
            </Box>

            {missingFiles.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {missingFiles.length} order(s) cannot be submitted missing cover image, interior PDF, or Pod Package ID.
                Go to Etsy Orders to upload files/paste asset URLs and set the Pod Package ID.
              </Alert>
            )}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < eligibleForSubmit.length}
                      checked={eligibleForSubmit.length > 0 && selected.length === eligibleForSubmit.length}
                      onChange={(e) => setSelected(e.target.checked ? eligibleForSubmit.map((o) => o._id) : [])}
                    />
                  </TableCell>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Cover</TableCell>
                  <TableCell>Interior</TableCell>
                  <TableCell>Preview</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {readyOrders.map((order) => {
                  const isEligible = Boolean(order.coverImageUrl && order.interiorPdfUrl && order.podPackageId)
                  return (
                    <TableRow key={order._id} sx={{ opacity: isEligible ? 1 : 0.5 }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(order._id)}
                          disabled={!isEligible}
                          onChange={(e) => setSelected((prev) =>
                            e.target.checked ? [...prev, order._id] : prev.filter((id) => id !== order._id)
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>#{order.etsyOrderId}</Typography>
                      </TableCell>
                      <TableCell><Typography variant="body2">{order.customerName}</Typography></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.productTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {order.coverImageUrl
                          ? <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          : <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
                      </TableCell>
                      <TableCell>
                        {order.interiorPdfUrl
                          ? <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          : <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
                      </TableCell>
                      <TableCell>
                        {isEligible && (
                          <Button size="small" variant="outlined" onClick={() => setReviewOrder(order)} sx={{ fontSize: '0.72rem', py: 0.25 }}>
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Submitted orders */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v)
            setSelectedSubmitted([])
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {LULU_TABS.map((t) => (
            <Tab key={t.value} value={t.value} label={t.label} />
          ))}
        </Tabs>

        {selectedSubmitted.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{selectedSubmitted.length} selected</Typography>
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleBulkDeleteSubmitted}
            >
              Delete selected
            </Button>
          </Box>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedSubmitted.length > 0 && selectedSubmitted.length < orders.length}
                    checked={orders.length > 0 && selectedSubmitted.length === orders.length}
                    onChange={(e) => setSelectedSubmitted(e.target.checked ? orders.map((o) => o._id) : [])}
                  />
                </TableCell>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Lulu Job ID</TableCell>
                <TableCell>Lulu Status</TableCell>
                <TableCell>Tracking</TableCell>
                <TableCell>Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                    <LocalPrintshopOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" color="text.secondary">No Lulu orders yet</Typography>
                    <Typography variant="body2" color="text.disabled">
                      Orders will appear here once submitted to Lulu Print
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order._id} hover selected={selectedSubmitted.includes(order._id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedSubmitted.includes(order._id)}
                        onChange={(e) => setSelectedSubmitted((prev) =>
                          e.target.checked ? [...prev, order._id] : prev.filter((id) => id !== order._id)
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>#{order.etsyOrderId}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{order.customerName}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.productTitle}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {order.luluJobId ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{order.luluJobId}</Typography>
                          <Tooltip title="Copy"> 
                            <IconButton size="small" onClick={() => navigator.clipboard.writeText(order.luluJobId)}>
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled"></Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.luluStatus || 'pending'} />
                    </TableCell>
                    <TableCell>
                      {order.trackingNumber ? (
                        <Chip label={order.trackingNumber} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                      ) : (
                        <Typography variant="caption" color="text.disabled"></Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{formatDate(order.updatedAt)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={order.luluJobId ? 'Refresh status from Lulu' : 'Not submitted to Lulu'}>
                        <IconButton
                          size="small"
                          disabled={refreshingId === order._id || !order.luluJobId}
                          onClick={() => handleRefreshStatus(order._id)}
                        >
                          {refreshingId === order._id
                            ? <CircularProgress size={14} />
                            : <RefreshIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      {order.luluStatus === 'failed' && (
                        <Tooltip title="Retry submission">
                          <IconButton
                            size="small"
                            color="warning"
                            disabled={retryingId === order._id}
                            onClick={() => handleRetry(order._id)}
                          >
                            {retryingId === order._id
                              ? <CircularProgress size={14} />
                              : <ReplayIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <LuluReviewDialog
        open={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        order={reviewOrder}
        onSubmitted={() => { fetchOrders(); setReviewOrder(null) }}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  )
}
