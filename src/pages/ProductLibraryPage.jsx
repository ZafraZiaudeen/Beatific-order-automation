import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import { alpha } from '@mui/material/styles'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'

function ProductFormDialog({ open, onClose, product, onSaved }) {
  const { activeStore } = useAuthStore()
  const [form, setForm] = useState({
    listingId: '',
    title: '',
    coverImageUrl: '',
    interiorPdfUrl: '',
    podPackageId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setForm({
        listingId: product.listingId || '',
        title: product.title || '',
        coverImageUrl: product.coverImageUrl || '',
        interiorPdfUrl: product.interiorPdfUrl || '',
        podPackageId: product.podPackageId || '',
      })
    } else {
      setForm({ listingId: '', title: '', coverImageUrl: '', interiorPdfUrl: '', podPackageId: '' })
    }
    setError('')
  }, [product, open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.listingId.trim() || !form.title.trim()) {
      setError('Listing ID and Title are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (product) {
        await api.patch(`/products/${product._id}`, {
          title: form.title,
          coverImageUrl: form.coverImageUrl || null,
          interiorPdfUrl: form.interiorPdfUrl || null,
          podPackageId: form.podPackageId || null,
        })
      } else {
        await api.post('/products', {
          ...form,
          storeId: activeStore?._id,
          coverImageUrl: form.coverImageUrl || null,
          interiorPdfUrl: form.interiorPdfUrl || null,
          podPackageId: form.podPackageId || null,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {product ? 'Edit Product' : 'Add Product'}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Etsy Listing ID"
          value={form.listingId}
          onChange={set('listingId')}
          disabled={!!product}
          fullWidth
          required
          helperText="The listing ID from your Etsy shop"
        />
        <TextField
          label="Product Title"
          value={form.title}
          onChange={set('title')}
          fullWidth
          required
        />
        <TextField
          label="Cover Image URL"
          value={form.coverImageUrl}
          onChange={set('coverImageUrl')}
          fullWidth
          placeholder="https://res.cloudinary.com/..."
          helperText="Full-resolution PNG or PDF no compression"
        />
        <TextField
          label="Interior PDF URL"
          value={form.interiorPdfUrl}
          onChange={set('interiorPdfUrl')}
          fullWidth
          placeholder="https://res.cloudinary.com/..."
        />
        <TextField
          label="Lulu Pod Package ID"
          value={form.podPackageId}
          onChange={set('podPackageId')}
          fullWidth
          placeholder="e.g. 0850X1100BWSTDLW060UW444MNG"
          helperText="From Lulu's product catalogue"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : product ? 'Update' : 'Add Product'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function ProductLibraryPage() {
  const { activeStore } = useAuthStore()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = activeStore ? { storeId: activeStore._id } : {}
      const { data } = await api.get('/products', { params })
      setProducts(data)
    } catch {
      // handle error
    } finally {
      setLoading(false)
    }
  }, [activeStore])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`)
      setDeleteId(null)
      fetchProducts()
    } catch {
      // handle
    }
  }

  const filtered = products.filter((p) =>
    p.listingId?.toLowerCase().includes(search.toLowerCase()) ||
    p.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Product Library</Typography>
          <Typography variant="body2" color="text.secondary">
            Map Etsy listing IDs to cover images and Lulu print specifications.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditProduct(null); setDialogOpen(true) }}
        >
          Add Product
        </Button>
      </Box>

      <Card>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            placeholder="Search by listing ID or title..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 320 }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Listing ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell align="center">Cover</TableCell>
                <TableCell align="center">Interior</TableCell>
                <TableCell>Pod Package ID</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <ImageOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" color="text.secondary">
                      {search ? 'No products match your search' : 'No products yet'}
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      Add your first product to get started
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => {
                  const isReady = product.coverImageUrl && product.podPackageId
                  return (
                    <TableRow key={product._id} hover>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                          {product.listingId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {product.title}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {product.coverImageUrl ? (
                          <Tooltip title="Cover image uploaded">
                            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                          </Tooltip>
                        ) : (
                          <Tooltip title="No cover image">
                            <ErrorOutlineIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {product.interiorPdfUrl ? (
                          <Tooltip title="Interior PDF uploaded">
                            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                          </Tooltip>
                        ) : (
                          <Tooltip title="No interior PDF">
                            <ErrorOutlineIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: product.podPackageId ? 'text.primary' : 'text.disabled' }}>
                          {product.podPackageId || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={isReady ? 'Ready' : 'Incomplete'}
                          size="small"
                          color={isReady ? 'success' : 'warning'}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => { setEditProduct(product); setDialogOpen(true) }}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => setDeleteId(product._id)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <ProductFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        product={editProduct}
        onSaved={fetchProducts}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>Are you sure? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)} color="inherit">Cancel</Button>
          <Button onClick={() => handleDelete(deleteId)} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
