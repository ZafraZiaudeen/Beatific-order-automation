import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/Add'
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
import {
  SoftPageHeader,
  SoftCard,
  SoftButton,
  SoftBadge,
  SoftAvatar,
  SoftInput,
  SoftTable,
  SoftTableHead,
  SoftTableBody,
  SoftTableRow,
  SoftTableCell,
  SoftEmptyState,
} from '../components/soft-ui'

const DEFAULT_TEMPLATE_POLICY = { cover: 'inherit', interior: 'inherit', fields: 'inherit' }
const BLANK_VARIANT = { name: '', podPackageId: '', priceLabel: '', templatePolicy: DEFAULT_TEMPLATE_POLICY }

const normalizeVariant = (variant = {}) => ({
  ...variant,
  name: variant.name || '',
  podPackageId: variant.podPackageId || '',
  priceLabel: variant.priceLabel || '',
  templatePolicy: { ...DEFAULT_TEMPLATE_POLICY, ...(variant.templatePolicy || {}) },
})

const productInitials = (title = '') =>
  title.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P'

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
              <SoftButton
                variant="outlined"
                size="small"
                startIcon={<ContentPasteIcon />}
                onClick={() => setPasteOpen((value) => !value)}
              >
                Paste Etsy Variants
              </SoftButton>
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
                  <SoftButton variant="contained" size="small" onClick={applyVariantPaste}>
                    Add Parsed Variants
                  </SoftButton>
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
              <SoftButton
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={addVariant}
              >
                Add Variant
              </SoftButton>
            </Stack>
          </Collapse>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <SoftButton onClick={onClose} color="dark" variant="outlined">Cancel</SoftButton>
        <SoftButton onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : product ? 'Update' : 'Add Product'}
        </SoftButton>
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
      <SoftPageHeader
        title="Product Library"
        subtitle="Map Etsy listings to shared print templates, labeled personalization fields, and Lulu print codes."
        actions={canManage && (
          <SoftButton
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setEditProduct(null); setDialogOpen(true) }}
          >
            Add Product
          </SoftButton>
        )}
      />

      <Box sx={{ mb: 3 }}>
        <SoftInput
          placeholder="Search by listing ID or title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />
      </Box>

      <SoftCard>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Products
          </Typography>
          <Typography variant="body2" sx={{ color: '#71717a' }}>
            Etsy listings, template readiness, and Lulu print package mappings.
          </Typography>
        </Box>
        <Box>
          <SoftTable>
            <SoftTableHead>
              <SoftTableRow>
                <SoftTableCell>Listing ID</SoftTableCell>
                <SoftTableCell>Title</SoftTableCell>
                <SoftTableCell>Pod Package ID</SoftTableCell>
                <SoftTableCell align="center">Variants</SoftTableCell>
                <SoftTableCell align="center">Template PDFs</SoftTableCell>
                <SoftTableCell align="center">Fields</SoftTableCell>
                <SoftTableCell align="center">Status</SoftTableCell>
                {canManage && <SoftTableCell align="right">Actions</SoftTableCell>}
              </SoftTableRow>
            </SoftTableHead>
            <SoftTableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SoftTableRow key={i}>
                    {Array.from({ length: canManage ? 8 : 7 }).map((__, j) => (
                      <SoftTableCell key={j}><Skeleton /></SoftTableCell>
                    ))}
                  </SoftTableRow>
                ))
              ) : filtered.length === 0 ? (
                <SoftTableRow>
                  <SoftTableCell colSpan={canManage ? 8 : 7} sx={{ p: 0 }}>
                    <SoftEmptyState
                      icon={ImageOutlinedIcon}
                      title={search ? 'No products match your search' : 'No products yet'}
                      description="Add your first product to get started."
                    />
                  </SoftTableCell>
                </SoftTableRow>
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
                    <SoftTableRow key={product._id}>
                      <SoftTableCell>
                        <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                          {product.listingId}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5, minWidth: 0 }}>
                          <SoftAvatar
                            size={34}
                            color="dark"
                          >
                            {productInitials(product.title)}
                          </SoftAvatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {product.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Etsy listing {product.listingId}
                            </Typography>
                          </Box>
                        </Box>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: hasPodPackage ? 'text.primary' : 'text.disabled' }}>
                          {podPackageDisplay}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell align="center">
                        {variants.length > 0 ? (
                          <SoftBadge
                            label={`${variants.length}${overrideCount ? ` / ${overrideCount} override` : ''}`}
                            size="small"
                            color={overrideCount ? 'info' : 'primary'}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">-</Typography>
                        )}
                      </SoftTableCell>
                      <SoftTableCell align="center">
                        <SoftBadge
                          icon={templateSourcesReady || hasLegacyAssets ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
                          label={templatePdfLabel}
                          size="small"
                          color={templateSourcesReady ? 'success' : hasLegacyAssets ? 'info' : 'default'}
                        />
                      </SoftTableCell>
                      <SoftTableCell align="center">
                        <SoftBadge
                          label={templateFieldCount ? `Default ${templateFieldCount}` : 'None'}
                          size="small"
                          color={templateFieldCount ? 'success' : 'warning'}
                        />
                      </SoftTableCell>
                      <SoftTableCell align="center">
                        <SoftBadge
                          label={isReady ? 'Ready' : missingPodCount ? `${missingPodCount} missing POD` : 'Needs template'}
                          size="small"
                          color={isReady ? 'success' : 'warning'}
                        />
                      </SoftTableCell>
                      {canManage && (
                        <SoftTableCell align="right">
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
                        </SoftTableCell>
                      )}
                    </SoftTableRow>
                  )
                })
              )}
            </SoftTableBody>
          </SoftTable>
        </Box>
      </SoftCard>

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
          <SoftButton onClick={() => setDeleteId(null)} color="dark" variant="outlined">Cancel</SoftButton>
          <SoftButton onClick={() => handleDelete(deleteId)} color="error" variant="contained">Delete</SoftButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
