import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
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
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import DesignServicesIcon from '@mui/icons-material/DesignServicesOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ContentPasteIcon from '@mui/icons-material/ContentPasteOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import ProductTemplateEditor from '../components/products/ProductTemplateEditor'

const DEFAULT_TEMPLATE_POLICY = { cover: 'inherit', interior: 'inherit', fields: 'inherit' }
const BLANK_VARIANT = { name: '', podPackageId: '', priceLabel: '', templatePolicy: DEFAULT_TEMPLATE_POLICY }

const normalizeVariant = (variant = {}) => ({
  ...variant,
  name: variant.name || '',
  podPackageId: variant.podPackageId || '',
  priceLabel: variant.priceLabel || '',
  templatePolicy: { ...DEFAULT_TEMPLATE_POLICY, ...(variant.templatePolicy || {}) },
})

const parseVariantPaste = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const priceMatch = line.match(/\s*\(([^()]*)\)\s*$/)
      return {
        ...BLANK_VARIANT,
        name: priceMatch ? line.slice(0, priceMatch.index).trim() : line,
        priceLabel: priceMatch ? priceMatch[1].trim() : '',
      }
    })

function ProductFormDialog({ open, onClose, product, onSaved }) {
  const { activeStore } = useAuthStore()
  const [form, setForm] = useState({
    listingId: '',
    title: '',
    podPackageId: '',
  })
  const [variants, setVariants] = useState([])
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [variantPaste, setVariantPaste] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (product) {
      setForm({
        listingId: product.listingId || '',
        title: product.title || '',
        podPackageId: product.podPackageId || '',
      })
      setVariants(product.variants?.length ? product.variants.map(normalizeVariant) : [])
      setVariantsOpen(Boolean(product.variants?.length))
    } else {
      setForm({ listingId: '', title: '', podPackageId: '' })
      setVariants([])
      setVariantsOpen(false)
    }
    setPasteOpen(false)
    setVariantPaste('')
    setError('')
  }, [product, open])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const setVariant = (idx, key, value) =>
    setVariants((vs) => vs.map((v, i) => (i === idx ? { ...v, [key]: value } : v)))
  const addVariant = () => setVariants((vs) => [...vs, { ...BLANK_VARIANT }])
  const removeVariant = (idx) => setVariants((vs) => vs.filter((_, i) => i !== idx))
  const applyVariantPaste = () => {
    const parsed = parseVariantPaste(variantPaste)
    if (!parsed.length) {
      setError('Paste at least one Etsy variant line')
      return
    }
    setVariants((current) => {
      const names = new Set(current.map((variant) => String(variant.name || '').toLowerCase()))
      return [
        ...current,
        ...parsed.filter((variant) => !names.has(variant.name.toLowerCase())),
      ]
    })
    setVariantsOpen(true)
    setPasteOpen(false)
    setVariantPaste('')
    setError('')
  }

  const handleSubmit = async () => {
    if (!form.listingId.trim() || !form.title.trim()) {
      setError('Listing ID and Title are required')
      return
    }
    // Validate variants
    for (const v of variants) {
      if (!String(v.name || '').trim()) {
        setError('Each variant needs a name')
        return
      }
    }
    setLoading(true)
    setError('')
    try {
      const payload = {
        title: form.title,
        podPackageId: form.podPackageId || null,
        variants: variants.map((v) => ({
          ...(v._id ? { _id: v._id } : {}),
          name: String(v.name || '').trim(),
          podPackageId: String(v.podPackageId || '').trim() || null,
          priceLabel: String(v.priceLabel || '').trim() || null,
          templatePolicy: { ...DEFAULT_TEMPLATE_POLICY, ...(v.templatePolicy || {}) },
          ...(v.printTemplate ? { printTemplate: v.printTemplate } : {}),
        })),
      }
      if (product) {
        await api.patch(`/products/${product._id}`, payload)
      } else {
        await api.post('/products', {
          listingId: form.listingId,
          storeId: activeStore?._id,
          ...payload,
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
          label="Default Lulu Pod Package ID"
          value={form.podPackageId}
          onChange={set('podPackageId')}
          fullWidth
          placeholder="e.g. 0850X1100BWSTDLW060UW444MNG"
          helperText="Use Lulu's 27-character pod_package_id. Do not paste shorthand codes like PB-0850X1100-STDCOLOR-PBW-GL."
        />

        {/* Variants section */}
        <Box>
          <Box
            onClick={() => setVariantsOpen((v) => !v)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', userSelect: 'none', mb: variantsOpen ? 1.5 : 0 }}
          >
            <ExpandMoreIcon
              sx={{ fontSize: 18, color: 'text.secondary', transform: variantsOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Size / Type Variants
            </Typography>
            {variants.length > 0 && (
              <Chip label={variants.length} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
            )}
          </Box>
          <Collapse in={variantsOpen}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              Add one variant per size or cover type. Variants only affect order matching and the
              Lulu Pod Package ID; template PDFs can inherit defaults or override in Template Designer.
            </Typography>
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentPasteIcon />}
                onClick={() => setPasteOpen((value) => !value)}
                sx={{ alignSelf: 'flex-start' }}
              >
                Paste Etsy Variants
              </Button>
              <Collapse in={pasteOpen}>
                <Stack spacing={1}>
                  <TextField
                    label="Etsy variant lines"
                    value={variantPaste}
                    onChange={(event) => setVariantPaste(event.target.value)}
                    multiline
                    minRows={5}
                    placeholder="Size - A5 (5.8 x 8.3 inches) - 150 Pages Softcover (Rp 395,495)"
                    helperText="One line per option. Price text in parentheses is stored separately."
                    fullWidth
                  />
                  <Button variant="contained" size="small" onClick={applyVariantPaste} sx={{ alignSelf: 'flex-start' }}>
                    Add Parsed Variants
                  </Button>
                </Stack>
              </Collapse>
            </Stack>
            <Stack spacing={2}>
              {variants.map((v, idx) => (
                <Box key={idx} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      VARIANT {idx + 1}
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => removeVariant(idx)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Stack spacing={1.5}>
                    <TextField
                      label="Variant name"
                      value={v.name}
                      onChange={(e) => setVariant(idx, 'name', e.target.value)}
                      size="small"
                      fullWidth
                      placeholder="e.g. A5 Softcover 100 Pages"
                      helperText="Short label matched against the order's size/type options"
                    />
                    <TextField
                      label="Pod Package ID"
                      value={v.podPackageId}
                      onChange={(e) => setVariant(idx, 'podPackageId', e.target.value)}
                      size="small"
                      fullWidth
                      placeholder="e.g. 0850X1100BWSTDLW060UW444MNG"
                      helperText={v.priceLabel ? `Etsy price: ${v.priceLabel}. Use the 27-character Lulu pod_package_id.` : 'Falls back to default POD ID when left blank'}
                    />
                    <TextField
                      label="Etsy price label"
                      value={v.priceLabel || ''}
                      onChange={(e) => setVariant(idx, 'priceLabel', e.target.value)}
                      size="small"
                      fullWidth
                      placeholder="Rp 395,495"
                    />
                  </Stack>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={addVariant}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Variant
              </Button>
            </Stack>
          </Collapse>
        </Box>
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
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [templateProduct, setTemplateProduct] = useState(null)

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

  if (templateProduct && canManage) {
    return (
      <ProductTemplateEditor
        product={templateProduct}
        onBack={() => setTemplateProduct(null)}
        onSaved={(updatedProduct) => {
          setTemplateProduct(updatedProduct)
          setProducts((current) => current.map((item) => item._id === updatedProduct._id ? updatedProduct : item))
        }}
      />
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Product Library</Typography>
          <Typography variant="body2" color="text.secondary">
            Map Etsy listings to shared print templates, labeled personalization fields, and Lulu print codes.
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditProduct(null); setDialogOpen(true) }}
          >
            Add Product
          </Button>
        )}
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
                <TableCell>Pod Package ID</TableCell>
                <TableCell align="center">Variants</TableCell>
                <TableCell align="center">Template PDFs</TableCell>
                <TableCell align="center">Fields</TableCell>
                <TableCell align="center">Status</TableCell>
                {canManage && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: canManage ? 8 : 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 8 : 7} align="center" sx={{ py: 8 }}>
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
                  const variants = product.variants || []
                  const hasTemplateCover = Boolean(product.printTemplate?.cover?.sourcePdfUrl)
                  const hasTemplateInterior = Boolean(product.printTemplate?.interior?.sourcePdfUrl)
                  const templateFieldCount = product.printTemplate?.fields?.length || 0
                  const hasVariantInteriorPdf = Boolean(
                    variants.some((variant) => Boolean(variant?.interiorPdfUrl))
                  )
                  const hasVariantPodPackage = Boolean(
                    variants.some((variant) => Boolean(variant?.podPackageId))
                  )
                  const overrideCount = variants.filter((variant) => {
                    const policy = { ...DEFAULT_TEMPLATE_POLICY, ...(variant.templatePolicy || {}) }
                    return policy.cover === 'override' || policy.interior === 'override' || policy.fields === 'override'
                  }).length
                  const missingPodCount = variants.filter((variant) => !variant.podPackageId && !product.podPackageId).length
                  const hasLegacyAssets = Boolean(product.coverImageUrl && (product.interiorPdfUrl || hasVariantInteriorPdf))
                  const hasPodPackage = Boolean(product.podPackageId || hasVariantPodPackage)
                  const templateSourcesReady = Boolean(hasTemplateCover && hasTemplateInterior)
                  const templateReady = Boolean(templateSourcesReady && templateFieldCount > 0)
                  const isReady = Boolean(hasPodPackage && (templateReady || hasLegacyAssets))

                  const podPackageDisplay = product.podPackageId
                    ? product.podPackageId
                    : hasVariantPodPackage
                      ? 'Variant mapped'
                      : '-'
                  const templatePdfLabel = templateSourcesReady
                    ? 'Cover + inside'
                    : hasTemplateCover || hasTemplateInterior
                      ? 'Partial'
                      : hasLegacyAssets
                        ? 'Legacy assets'
                        : 'Not imported'
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
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: hasPodPackage ? 'text.primary' : 'text.disabled' }}>
                          {podPackageDisplay}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {variants.length > 0 ? (
                          <Chip
                            label={`${variants.length}${overrideCount ? ` / ${overrideCount} override` : ''}`}
                            size="small"
                            color={overrideCount ? 'secondary' : 'primary'}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={templateSourcesReady || hasLegacyAssets ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                          label={templatePdfLabel}
                          size="small"
                          color={templateSourcesReady ? 'success' : hasLegacyAssets ? 'info' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={templateFieldCount ? `Default ${templateFieldCount}` : 'None'}
                          size="small"
                          color={templateFieldCount ? 'success' : 'warning'}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={isReady ? 'Ready' : missingPodCount ? `${missingPodCount} missing POD` : 'Needs template'}
                          size="small"
                          color={isReady ? 'success' : 'warning'}
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell align="right">
                          <Tooltip title="Template designer">
                            <IconButton size="small" color="primary" onClick={() => setTemplateProduct(product)}>
                              <DesignServicesIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {canManage && (
        <ProductFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          product={editProduct}
          onSaved={fetchProducts}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={canManage && !!deleteId} onClose={() => setDeleteId(null)}>
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
