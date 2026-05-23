import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import SearchIcon from '@mui/icons-material/Search'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import LuluReviewDialog from '../components/orders/LuluReviewDialog'
import TemplatePersonalizationDialog from '../components/orders/TemplatePersonalizationDialog'
import Etsy2StatusBadge from '../components/etsy2/Etsy2StatusBadge'
import {
  buildOrderGroups,
  buildOrderFileUrl,
  formatDate,
  formatMoney,
  getInitials,
  getPresetDateRange,
  getItemStatus,
  optionText,
} from '../lib/etsy2Orders'

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 3 months' },
  { value: '1y', label: 'This year' },
]

export default function GeneratedPdfsPage() {
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateOrder, setTemplateOrder] = useState(null)
  const [templateProduct, setTemplateProduct] = useState(null)
  const [luluOpen, setLuluOpen] = useState(false)
  const [luluOrder, setLuluOrder] = useState(null)
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/orders', {
        params: {
          page: 1,
          limit: 500,
          ...(activeStore?._id ? { storeId: activeStore._id } : {}),
          ...(search ? { search } : {}),
          ...getPresetDateRange(dateRange),
        },
      })
      setOrders(data.orders || [])
    } catch {
      setSnack({ open: true, message: 'Failed to load generated PDFs', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [activeStore?._id, dateRange, search])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const generatedItems = useMemo(() => (
    buildOrderGroups(orders).flatMap((group) => (
      group.items
        .filter((item) => item.templateFinalizedAt && (item.coverImageUrl || item.interiorPdfUrl))
        .map((item) => ({ group, item }))
    ))
  ), [orders])

  const handleOpenTemplate = async (item) => {
    if (!item?.productId) {
      setSnack({ open: true, message: 'Map this item to a product before editing print PDFs.', severity: 'warning' })
      return
    }

    setTemplateOrder(item)
    setTemplateProduct(null)
    setTemplateOpen(true)

    try {
      const { data } = await api.get(`/products/${item.productId}`)
      setTemplateProduct(data)
    } catch (err) {
      setTemplateOpen(false)
      setSnack({ open: true, message: err.response?.data?.message || 'Failed to load product template', severity: 'error' })
    }
  }

  const handleApproveLulu = (item) => {
    setLuluOrder(item)
    setLuluOpen(true)
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 3 }}>
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
              color: '#FFFFFF',
            }}
          >
            <PictureAsPdfIcon />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#27272A' }}>
              Generated PDFs
            </Typography>
            <Typography variant="body2" sx={{ color: '#71717A' }}>
              {loading ? 'Loading generated files...' : `${generatedItems.length} finalized print file${generatedItems.length === 1 ? '' : 's'}`}
            </Typography>
          </Box>
        </Box>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            sx={{ bgcolor: '#FFFFFF', borderRadius: '8px', '& fieldset': { borderColor: '#E3E3E7' } }}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TextField
        fullWidth
        placeholder="Search generated PDFs by order, customer, item, or shop..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
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
          mb: 3,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#FFFFFF',
            borderRadius: '10px',
            '& fieldset': { borderColor: '#E3E3E7' },
          },
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : generatedItems.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          No generated PDFs yet. Use Etsy 2 bulk generation or generate PDFs from an order detail page.
        </Alert>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
          {generatedItems.map(({ group, item }) => {
            const canSendToLulu = Boolean(item.coverImageUrl && item.interiorPdfUrl && item.podPackageId)
            return (
              <Box
                key={item._id}
                sx={{
                  p: 2,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E3E3E7',
                  borderRadius: '12px',
                  boxShadow: 'none',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Avatar sx={{ bgcolor: '#F97316', width: 38, height: 38, fontWeight: 700 }}>
                    {getInitials(group.customerName)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#F97316', fontWeight: 800, fontFamily: 'monospace' }}>
                          #{group.etsyOrderId}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#27272A', fontWeight: 700 }}>
                          {item.productTitle}
                        </Typography>
                      </Box>
                      <Etsy2StatusBadge status="generated" />
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', color: '#71717A', mt: 0.5 }}>
                      {group.customerName || 'Unknown customer'} / {group.shop || 'Etsy'} / {formatDate(item.templateFinalizedAt, true)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#71717A', mt: 0.5 }}>
                      {optionText(item) || 'No options'} / Qty {item.quantity || 1} / {formatMoney(Number(item.price || 0) * Number(item.quantity || 1))}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                      <Chip label={`POD: ${item.podPackageId || 'Missing'}`} size="small" variant="outlined" />
                      <Chip label={`Txn: ${item.etsyItemId || '-'}`} size="small" variant="outlined" />
                      <Chip label={String(getItemStatus(item)).replace(/_/g, ' ')} size="small" variant="outlined" />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                      {item.coverImageUrl && (
                        <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => window.open(buildOrderFileUrl(item.coverImageUrl), '_blank')}>
                          Generated Cover
                        </Button>
                      )}
                      {item.interiorPdfUrl && (
                        <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} onClick={() => window.open(buildOrderFileUrl(item.interiorPdfUrl), '_blank')}>
                          Generated Interior
                        </Button>
                      )}
                      {canManage && (
                        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleOpenTemplate(item)}>
                          Edit Values
                        </Button>
                      )}
                      {canManage && item.productId && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/product-library-2/product/${item.productId}/designer`)}
                        >
                          Product Canvas
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<LocalPrintshopOutlinedIcon />}
                          disabled={!canSendToLulu}
                          onClick={() => handleApproveLulu(item)}
                          sx={{ bgcolor: '#F97316', '&:hover': { bgcolor: '#EA580C' } }}
                        >
                          Approve & Send
                        </Button>
                      )}
                    </Box>

                    {!canSendToLulu && (
                      <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '8px' }}>
                        Missing {[!item.coverImageUrl && 'generated cover', !item.interiorPdfUrl && 'generated interior', !item.podPackageId && 'POD package ID'].filter(Boolean).join(', ')} before Lulu submission.
                      </Alert>
                    )}
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      {canManage && (
        <TemplatePersonalizationDialog
          open={templateOpen}
          order={templateOrder}
          product={templateProduct}
          onClose={() => setTemplateOpen(false)}
          onFinalized={() => {
            setTemplateOpen(false)
            fetchOrders()
          }}
        />
      )}

      {canManage && (
        <LuluReviewDialog
          open={luluOpen}
          order={luluOrder}
          onClose={() => setLuluOpen(false)}
          onSubmitted={() => {
            setLuluOpen(false)
            fetchOrders()
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
