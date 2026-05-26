import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Divider from '@mui/material/Divider'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RefreshIcon from '@mui/icons-material/RefreshOutlined'
import ReplayIcon from '@mui/icons-material/ReplayOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import LuluReviewDialog from '../components/orders/LuluReviewDialog'
import { LULU_ORDER_STATUSES } from '../lib/constants'
import {
  SoftPageHeader,
  SoftCard,
  SoftButton,
  SoftBadge,
  SoftTable,
  SoftTableHead,
  SoftTableBody,
  SoftTableRow,
  SoftTableCell,
  SoftEmptyState,
} from '../components/soft-ui'

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

const formatJson = (value) => {
  if (!value) return 'No saved details'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function FailureDetailDialog({
  order,
  open,
  onClose,
  onRetry,
  retrying,
  onExplain,
  explaining,
}) {
  if (!order) return null

  const errorDetails = formatJson(order.luluErrorDetails)
  const orderSnapshot = formatJson({
    etsyOrderId: order.etsyOrderId,
    customerName: order.customerName,
    productTitle: order.productTitle,
    quantity: order.quantity,
    podPackageId: order.podPackageId,
    shippingLevel: order.shippingLevel,
    coverImageUrl: order.coverImageUrl,
    interiorPdfUrl: order.interiorPdfUrl,
    shippingAddress: order.shippingAddress,
  })

  const copyFailure = () => {
    navigator.clipboard.writeText(formatJson({
      message: order.luluErrorMessage,
      failedAt: order.luluErrorAt,
      order: JSON.parse(orderSnapshot),
      details: order.luluErrorDetails,
      explanation: order.luluErrorExplanation,
    }))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Lulu failure log</Typography>
            <Typography variant="body2" color="text.secondary">
              Order #{order.etsyOrderId} - {order.customerName}
            </Typography>
          </Box>
          <Tooltip title="Copy complete failure log">
            <IconButton onClick={copyFailure}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Alert severity="error">
            {order.luluErrorMessage || 'No saved error message'}
          </Alert>

          {order.luluErrorExplanation && (
            <Alert severity="info" icon={<AutoFixHighOutlinedIcon />}>
              <Typography component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', font: 'inherit' }}>
                {order.luluErrorExplanation}
              </Typography>
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Order details</Typography>
            <Box component="pre" sx={{
              m: 0,
              p: 1.5,
              bgcolor: '#111827',
              color: '#f8fafc',
              borderRadius: 1,
              overflow: 'auto',
              fontSize: 12,
              lineHeight: 1.55,
              maxHeight: 240,
            }}>
              {orderSnapshot}
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Full Lulu response and request payload</Typography>
            <Box component="pre" sx={{
              m: 0,
              p: 1.5,
              bgcolor: '#111827',
              color: '#f8fafc',
              borderRadius: 1,
              overflow: 'auto',
              fontSize: 12,
              lineHeight: 1.55,
              maxHeight: 360,
            }}>
              {errorDetails}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <SoftButton onClick={onClose} variant="outlined">Close</SoftButton>
        <SoftButton
          onClick={() => onExplain(order)}
          variant="outlined"
          startIcon={explaining ? <CircularProgress size={14} /> : <AutoFixHighOutlinedIcon />}
          disabled={explaining}
        >
          {explaining ? 'Explaining...' : 'Explain with OpenRouter'}
        </SoftButton>
        <SoftButton
          onClick={() => onRetry(order._id)}
          color="warning"
          variant="contained"
          startIcon={retrying ? <CircularProgress size={14} /> : <ReplayIcon />}
          disabled={retrying}
          sx={{ color: '#fff' }}
        >
          {retrying ? 'Retrying...' : 'Retry'}
        </SoftButton>
      </DialogActions>
    </Dialog>
  )
}

export default function LuluOrdersPage() {
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
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
  const [detailOrder, setDetailOrder] = useState(null)
  const [explainingId, setExplainingId] = useState(null)
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
      setDetailOrder(null)
      setSnack({ open: true, message: 'Order resubmitted to Lulu', severity: 'success' })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to retry', severity: 'error' })
    } finally {
      setRetryingId(null)
    }
  }

  const handleExplainFailure = async (order) => {
    setExplainingId(order._id)
    try {
      const { data } = await api.post(`/lulu/explain/${order._id}`)
      const updatedOrder = {
        ...order,
        luluErrorExplanation: data.explanation,
      }
      setDetailOrder(updatedOrder)
      setOrders((prev) => prev.map((item) => item._id === order._id ? updatedOrder : item))
      setSnack({
        open: true,
        message: data.cached ? 'Using saved OpenRouter explanation' : 'OpenRouter explanation generated',
        severity: 'success',
      })
    } catch (err) {
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to explain Lulu error', severity: 'error' })
    } finally {
      setExplainingId(null)
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
      <SoftPageHeader
        title="Lulu Orders"
        subtitle="Submit orders to Lulu Print API and track production, shipping, and failed submissions."
        actions={
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
        }
      />

      {/* Ready to Submit */}
      {canManage && readyOrders.length > 0 && (
        <SoftCard sx={{ mb: 3, border: '1px solid', borderColor: 'primary.light' }}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SendOutlinedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Ready to Submit ({readyOrders.length})
                </Typography>
              </Box>
              <SoftButton
                variant="contained"
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LocalPrintshopOutlinedIcon />}
                disabled={submitting || selected.length === 0}
                onClick={handleBulkSubmit}
                sx={{ color: '#fff', '&.Mui-disabled': { color: '#fff' } }}
              >
                {submitting ? 'Submitting...' : `Submit ${selected.length > 0 ? selected.length : ''} to Lulu`}
              </SoftButton>
            </Box>

            {missingFiles.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {missingFiles.length} order(s) cannot be submitted missing cover image, interior PDF, or Pod Package ID.
                Go to Etsy 2 Orders to upload files, paste asset URLs, and set the Pod Package ID.
              </Alert>
            )}

            <SoftTable size="small">
              <SoftTableHead>
                <SoftTableRow>
                  <SoftTableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < eligibleForSubmit.length}
                      checked={eligibleForSubmit.length > 0 && selected.length === eligibleForSubmit.length}
                      onChange={(e) => setSelected(e.target.checked ? eligibleForSubmit.map((o) => o._id) : [])}
                    />
                  </SoftTableCell>
                  <SoftTableCell>Order ID</SoftTableCell>
                  <SoftTableCell>Customer</SoftTableCell>
                  <SoftTableCell>Product</SoftTableCell>
                  <SoftTableCell>Cover</SoftTableCell>
                  <SoftTableCell>Interior</SoftTableCell>
                  <SoftTableCell>Preview</SoftTableCell>
                </SoftTableRow>
              </SoftTableHead>
              <SoftTableBody>
                {readyOrders.map((order) => {
                  const isEligible = Boolean(order.coverImageUrl && order.interiorPdfUrl && order.podPackageId)
                  return (
                    <SoftTableRow key={order._id} sx={{ opacity: isEligible ? 1 : 0.5 }}>
                      <SoftTableCell padding="checkbox">
                        <Checkbox
                          checked={selected.includes(order._id)}
                          disabled={!isEligible}
                          onChange={(e) => setSelected((prev) =>
                            e.target.checked ? [...prev, order._id] : prev.filter((id) => id !== order._id)
                          )}
                        />
                      </SoftTableCell>
                      <SoftTableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>#{order.etsyOrderId}</Typography>
                      </SoftTableCell>
                      <SoftTableCell><Typography variant="body2">{order.customerName}</Typography></SoftTableCell>
                      <SoftTableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.productTitle}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        {order.coverImageUrl
                          ? <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          : <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
                      </SoftTableCell>
                      <SoftTableCell>
                        {order.interiorPdfUrl
                          ? <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          : <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
                      </SoftTableCell>
                      <SoftTableCell>
                        {isEligible && (
                          <SoftButton size="small" variant="outlined" onClick={() => setReviewOrder(order)}>
                            Review
                          </SoftButton>
                        )}
                      </SoftTableCell>
                    </SoftTableRow>
                  )
                })}
              </SoftTableBody>
            </SoftTable>
          </Box>
        </SoftCard>
      )}

      {/* Submitted orders */}
      <SoftCard>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Submitted Orders
          </Typography>
          <Typography variant="body2" sx={{ color: '#71717a' }}>
            Lulu jobs, production states, and tracking references.
          </Typography>
        </Box>

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

        {canManage && selectedSubmitted.length > 0 && (
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{selectedSubmitted.length} selected</Typography>
            <SoftButton
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineIcon />}
              onClick={handleBulkDeleteSubmitted}
            >
              Delete selected
            </SoftButton>
          </Box>
        )}

        <Box>
          <SoftTable>
            <SoftTableHead>
              <SoftTableRow>
                {canManage && (
                  <SoftTableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedSubmitted.length > 0 && selectedSubmitted.length < orders.length}
                      checked={orders.length > 0 && selectedSubmitted.length === orders.length}
                      onChange={(e) => setSelectedSubmitted(e.target.checked ? orders.map((o) => o._id) : [])}
                    />
                  </SoftTableCell>
                )}
                <SoftTableCell>Order ID</SoftTableCell>
                <SoftTableCell>Customer</SoftTableCell>
                <SoftTableCell>Product</SoftTableCell>
                <SoftTableCell>Lulu Job ID</SoftTableCell>
                <SoftTableCell>Lulu Status</SoftTableCell>
                <SoftTableCell>Tracking</SoftTableCell>
                <SoftTableCell>Updated</SoftTableCell>
                {canManage && <SoftTableCell align="right">Actions</SoftTableCell>}
              </SoftTableRow>
            </SoftTableHead>
            <SoftTableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SoftTableRow key={i}>
                    {Array.from({ length: canManage ? 9 : 7 }).map((__, j) => (
                      <SoftTableCell key={j}><Skeleton /></SoftTableCell>
                    ))}
                  </SoftTableRow>
                ))
              ) : orders.length === 0 ? (
                <SoftTableRow>
                  <SoftTableCell colSpan={canManage ? 9 : 7} sx={{ p: 0 }}>
                    <SoftEmptyState
                      icon={LocalPrintshopOutlinedIcon}
                      title="No Lulu orders yet"
                      description="Orders will appear here once submitted to Lulu Print."
                    />
                  </SoftTableCell>
                </SoftTableRow>
              ) : (
                orders.map((order) => (
                  <SoftTableRow key={order._id} selected={selectedSubmitted.includes(order._id)}>
                    {canManage && (
                      <SoftTableCell padding="checkbox">
                        <Checkbox
                          checked={selectedSubmitted.includes(order._id)}
                          onChange={(e) => setSelectedSubmitted((prev) =>
                            e.target.checked ? [...prev, order._id] : prev.filter((id) => id !== order._id)
                          )}
                        />
                      </SoftTableCell>
                    )}
                    <SoftTableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>#{order.etsyOrderId}</Typography>
                    </SoftTableCell>
                    <SoftTableCell><Typography variant="body2">{order.customerName}</Typography></SoftTableCell>
                    <SoftTableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.productTitle}
                      </Typography>
                    </SoftTableCell>
                    <SoftTableCell>
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
                    </SoftTableCell>
                    <SoftTableCell>
                      <SoftBadge label={order.luluStatus || 'pending'} color={
                        order.luluStatus === 'shipped' ? 'success' :
                        order.luluStatus === 'failed' ? 'error' :
                        order.luluStatus === 'in_production' ? 'info' :
                        'default'
                      } />
                    </SoftTableCell>
                    <SoftTableCell>
                      {order.trackingNumber ? (
                        <SoftBadge label={order.trackingNumber} variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 600 }} />
                      ) : (
                        <Typography variant="caption" color="text.disabled"></Typography>
                      )}
                    </SoftTableCell>
                    <SoftTableCell>
                      <Typography variant="body2" color="text.secondary">{formatDate(order.updatedAt)}</Typography>
                    </SoftTableCell>
                    {canManage && (
                      <SoftTableCell align="right">
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
                          <Tooltip title="View Lulu failure log">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDetailOrder(order)}
                            >
                              <WarningAmberIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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
                      </SoftTableCell>
                    )}
                  </SoftTableRow>
                ))
              )}
            </SoftTableBody>
          </SoftTable>
        </Box>
      </SoftCard>

      {canManage && (
        <LuluReviewDialog
          open={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          order={reviewOrder}
          onSubmitted={() => { fetchOrders(); setReviewOrder(null) }}
          onFailed={fetchOrders}
        />
      )}

      {canManage && (
        <FailureDetailDialog
          open={!!detailOrder}
          onClose={() => setDetailOrder(null)}
          order={detailOrder}
          onRetry={handleRetry}
          retrying={Boolean(detailOrder && retryingId === detailOrder._id)}
          onExplain={handleExplainFailure}
          explaining={Boolean(detailOrder && explainingId === detailOrder._id)}
        />
      )}

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
