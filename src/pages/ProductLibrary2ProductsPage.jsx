import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TableContainer from '@mui/material/TableContainer'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import DesignServicesOutlinedIcon from '@mui/icons-material/DesignServicesOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import ProductTemplateEditor from '../components/products/ProductTemplateEditor'
import placeholderImage from '../assets/vecteezy_abstract-cover-design-vectors-illustrations_26300277.svg'
import {
  SoftButton,
  SoftCard,
  SoftEmptyState,
  SoftInput,
  SoftPageHeader,
  SoftTable,
  SoftTableBody,
  SoftTableCell,
  SoftTableHead,
  SoftTableRow,
} from '../components/soft-ui'

const productInitials = (title = '') =>
  title.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'P'

const EMPTY_LULU_OPTIONS = { packages: [] }
const FINISH_OPTIONS = [
  { value: 'MATTE', label: 'Matte' },
  { value: 'GLOSSY', label: 'Glossy' },
]
const DEFAULT_LULU_PRINT_SPEC = {
  trimSizeKey: '',
  bindingType: '',
  interiorColor: '',
  paperType: '',
  printQuality: 'STD',
  coverFinish: 'MATTE',
  pageCount: '',
  podPackageId: '',
}

const normalizeLuluPrintSpec = (spec = {}) => ({
  ...DEFAULT_LULU_PRINT_SPEC,
  ...spec,
  pageCount: spec?.pageCount ? String(spec.pageCount) : '',
})

function AssetOptionCard(props) {
  const { option, icon } = props
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '0.9rem',
          overflow: 'hidden',
          bgcolor: '#f8fafc',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {option?.imageUrl ? (
          <Box
            component="img"
            src={option.imageUrl}
            alt=""
            onError={(event) => { event.currentTarget.src = placeholderImage }}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box component={icon} sx={{ color: '#2563eb' }} />
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }} noWrap>{option?.title || 'Untitled asset'}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          {option?.pageCount ? `${option.pageCount} page${option.pageCount === 1 ? '' : 's'}` : 'Preview available after PDF import'}
        </Typography>
      </Box>
    </Stack>
  )
}

function ProductCanvasCard(props) {
  const { title, asset, icon, accent, onEditCanvas, canManage } = props
  return (
    <SoftCard hover={false} sx={{ height: '100%', p: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2.5,
          py: 2.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: accent,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '0.9rem',
            bgcolor: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            flexShrink: 0,
          }}
        >
          <Box component={icon} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            {asset ? asset.title : 'No asset linked yet'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Box
          sx={{
            minHeight: 360,
            borderRadius: '1.2rem',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          {asset?.imageUrl ? (
            <Box
              component="img"
              src={asset.imageUrl}
              alt=""
              onError={(event) => { event.currentTarget.src = placeholderImage }}
              sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: '#fff' }}
            />
          ) : (
            <Stack spacing={1} alignItems="center" sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <Box component={icon} sx={{ fontSize: 44, color: '#94a3b8' }} />
              <Typography sx={{ fontWeight: 700, color: '#334155' }}>Canvas preview unavailable</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 280 }}>
                Link a PDF-based asset to show its designer canvas here.
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <Chip label={asset?.pageCount ? `${asset.pageCount} page${asset.pageCount === 1 ? '' : 's'}` : 'No PDF pages'} size="small" />
          <Chip label={asset?.templateFields?.length ? `${asset.templateFields.length} mapped fields` : 'No mapped fields'} size="small" />
          {asset?.pageWidth && asset?.pageHeight ? (
            <Chip label={`${(asset.pageWidth / 72).toFixed(2)} x ${(asset.pageHeight / 72).toFixed(2)} in`} size="small" />
          ) : null}
        </Stack>

        <Typography variant="body2" sx={{ color: '#64748b', mb: 2.25 }}>
          {asset?.description || 'This linked asset feeds the product designer and print template workflow.'}
        </Typography>

        {canManage && (
          <SoftButton
            fullWidth
            variant="outlined"
            startIcon={<EditOutlinedIcon />}
            onClick={onEditCanvas}
            disabled={!asset}
          >
            Edit Canvas
          </SoftButton>
        )}
      </Box>
    </SoftCard>
  )
}

export default function ProductLibrary2ProductsPage({ mode = 'list' }) {
  const navigate = useNavigate()
  const { productId } = useParams()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [products, setProducts] = useState([])
  const [product, setProduct] = useState(null)
  const [coverAssets, setCoverAssets] = useState([])
  const [insideAssets, setInsideAssets] = useState([])
  const [luluOptions, setLuluOptions] = useState(EMPTY_LULU_OPTIONS)
  const [loading, setLoading] = useState(mode === 'list')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [editorState, setEditorState] = useState(null)
  const [form, setForm] = useState({
    listingId: '',
    title: '',
    coverAssetId: null,
    insidePageAssetId: null,
    luluPrintSpec: DEFAULT_LULU_PRINT_SPEC,
    allowedCoverFinishes: ['MATTE', 'GLOSSY'],
  })

  const isListMode = mode === 'list'
  const isCreateMode = mode === 'create'
  const isEditMode = mode === 'edit'
  const isDesignerMode = mode === 'designer'

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = activeStore ? { storeId: activeStore._id } : {}
      const { data } = await api.get('/products', { params })
      setProducts(data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [activeStore])

  const fetchProduct = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/products/${productId}`)
      setProduct(data)
      setForm({
        listingId: data.listingId || '',
        title: data.title || '',
        coverAssetId: data.coverAssetId || null,
        insidePageAssetId: data.insidePageAssetId || null,
        luluPrintSpec: normalizeLuluPrintSpec(data.luluPrintSpec),
        allowedCoverFinishes: data.allowedCoverFinishes?.length ? data.allowedCoverFinishes : ['MATTE', 'GLOSSY'],
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [productId])

  const fetchAssetOptions = useCallback(async () => {
    setError('')
    try {
      const params = activeStore ? { storeId: activeStore._id } : {}
      const [coverRes, insideRes, luluRes] = await Promise.all([
        api.get('/product-library-v2/categories/cover', { params }),
        api.get('/product-library-v2/categories/inside-page', { params }),
        api.get('/product-library-v2/lulu-options'),
      ])
      setCoverAssets(coverRes.data?.items || [])
      setInsideAssets(insideRes.data?.items || [])
      setLuluOptions({ ...EMPTY_LULU_OPTIONS, ...(luluRes.data || {}) })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product assets')
    }
  }, [activeStore])

  useEffect(() => {
    if (isListMode) {
      fetchProducts()
      return
    }
    if (isCreateMode) {
      fetchAssetOptions()
      return
    }
    fetchProduct()
    if (isEditMode) fetchAssetOptions()
  }, [fetchAssetOptions, fetchProduct, fetchProducts, isCreateMode, isEditMode, isListMode])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter((item) =>
      [item.title, item.listingId, item.coverAsset?.title, item.insidePageAsset?.title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
  }, [products, search])

  const selectedCover = useMemo(
    () => coverAssets.find((item) => item._id === form.coverAssetId) || product?.coverAsset || null,
    [coverAssets, form.coverAssetId, product]
  )
  const selectedInside = useMemo(
    () => insideAssets.find((item) => item._id === form.insidePageAssetId) || product?.insidePageAsset || null,
    [insideAssets, form.insidePageAssetId, product]
  )
  const effectiveLuluPrintSpec = useMemo(() => ({
    ...form.luluPrintSpec,
    trimSizeKey: form.luluPrintSpec.trimSizeKey || selectedInside?.insideSize || selectedCover?.coverSize || '',
    bindingType: form.luluPrintSpec.bindingType || selectedCover?.coverType || '',
    interiorColor: form.luluPrintSpec.interiorColor || selectedInside?.interiorColor || '',
    paperType: form.luluPrintSpec.paperType || selectedInside?.paperType || '',
    pageCount: form.luluPrintSpec.pageCount || (selectedInside?.pageCount ? String(selectedInside.pageCount) : ''),
    printQuality: form.luluPrintSpec.printQuality || 'STD',
    coverFinish: form.luluPrintSpec.coverFinish || 'MATTE',
  }), [form.luluPrintSpec, selectedCover, selectedInside])

  const compatibleCoverAssets = useMemo(() => {
    const packages = luluOptions.packages || []
    if (!selectedInside?.insideSize || !selectedInside?.pageCount || !packages.length) return coverAssets
    return coverAssets.filter((cover) => {
      if (!cover.coverSize || !cover.coverType) return false
      return packages.some((pkg) =>
        pkg.trim === cover.coverSize &&
        pkg.trim === selectedInside.insideSize &&
        pkg.binding === cover.coverType &&
        (!selectedInside.interiorColor || pkg.interiorColor === selectedInside.interiorColor) &&
        (!selectedInside.paperType || pkg.paper === selectedInside.paperType) &&
        selectedInside.pageCount >= pkg.minPage &&
        selectedInside.pageCount <= pkg.maxPage
      )
    })
  }, [coverAssets, luluOptions.packages, selectedInside])

  const compatibility = useMemo(() => {
    const warnings = []
    const packages = luluOptions.packages || []
    const spec = effectiveLuluPrintSpec
    if (!selectedCover || !selectedInside) {
      return { isValid: false, warnings: ['Choose a cover asset and inside-page asset.'], podPackageIds: {} }
    }
    if (!spec.trimSizeKey) warnings.push('Choose a Lulu trim size.')
    if (selectedCover.coverSize && selectedInside.insideSize && selectedCover.coverSize !== selectedInside.insideSize) {
      warnings.push('Cover size and inside-page size must match.')
    }
    if (!spec.bindingType) warnings.push('Choose a Lulu binding type.')
    if (!spec.interiorColor) warnings.push('Choose a Lulu interior color.')
    if (!spec.paperType) warnings.push('Choose a Lulu paper type.')
    if (!spec.printQuality) warnings.push('Choose a Lulu print quality.')
    if (!spec.coverFinish) warnings.push('Choose a Lulu cover finish.')
    if (!Number(spec.pageCount || 0)) warnings.push('Enter the inside-page count.')

    const podPackageIds = {}
    if (warnings.length === 0) {
      const pageCount = Number(spec.pageCount || 0)
      const match = packages.find((pkg) =>
        pkg.trim === spec.trimSizeKey &&
        pkg.binding === spec.bindingType &&
        pkg.interiorColor === spec.interiorColor &&
        pkg.printQuality === spec.printQuality &&
        pkg.paper === spec.paperType &&
        pkg.finish === spec.coverFinish &&
        (!pageCount || (pageCount >= pkg.minPage && pageCount <= pkg.maxPage))
      )
      if (match) podPackageIds[spec.coverFinish] = match.id
      if (Object.keys(podPackageIds).length === 0) {
        warnings.push('This selected cover and inside-page combination is not available in Lulu.')
      }
    }
    return { isValid: Object.keys(podPackageIds).length > 0, warnings, podPackageIds }
  }, [effectiveLuluPrintSpec, luluOptions.packages, selectedCover, selectedInside])

  const toggleFinish = (finish) => (event) => {
    setForm((current) => {
      const next = event.target.checked
        ? [...new Set([...current.allowedCoverFinishes, finish])]
        : current.allowedCoverFinishes.filter((value) => value !== finish)
      if (finish === current.luluPrintSpec.coverFinish && !event.target.checked) return current
      return { ...current, allowedCoverFinishes: next.length ? next : current.allowedCoverFinishes }
    })
  }

  const updateLuluSpec = (changes) => {
    setForm((current) => ({
      ...current,
      allowedCoverFinishes: changes.coverFinish
        ? [...new Set([...current.allowedCoverFinishes, changes.coverFinish])]
        : current.allowedCoverFinishes,
      luluPrintSpec: {
        ...current.luluPrintSpec,
        ...changes,
      },
    }))
  }

  const selectCoverAsset = (value) => {
    setForm((current) => ({
      ...current,
      coverAssetId: value?._id || null,
      luluPrintSpec: {
        ...current.luluPrintSpec,
        trimSizeKey: value?.coverSize || current.luluPrintSpec.trimSizeKey,
        bindingType: value?.coverType || current.luluPrintSpec.bindingType,
      },
    }))
  }

  const selectInsideAsset = (value) => {
    setForm((current) => ({
      ...current,
      insidePageAssetId: value?._id || null,
      luluPrintSpec: {
        ...current.luluPrintSpec,
        trimSizeKey: current.luluPrintSpec.trimSizeKey || value?.insideSize || '',
        interiorColor: value?.interiorColor || current.luluPrintSpec.interiorColor,
        paperType: value?.paperType || current.luluPrintSpec.paperType,
        pageCount: value?.pageCount ? String(value.pageCount) : current.luluPrintSpec.pageCount,
      },
    }))
  }

  const openAssetEditor = (asset, slot) => {
    if (!asset) return
    setEditorState({ asset, slot })
  }

  const handleAssetSaved = (savedAsset) => {
    setEditorState((current) => current ? { ...current, asset: savedAsset } : null)
    setCoverAssets((current) => current.map((item) => (item._id === savedAsset._id ? savedAsset : item)))
    setInsideAssets((current) => current.map((item) => (item._id === savedAsset._id ? savedAsset : item)))
    setProduct((current) => {
      if (!current) return current
      if (editorState?.slot === 'cover') {
        return {
          ...current,
          coverAsset: savedAsset,
          coverImageUrl: savedAsset.imageUrl || current.coverImageUrl,
        }
      }
      if (editorState?.slot === 'inside') {
        return {
          ...current,
          insidePageAsset: savedAsset,
          interiorPdfUrl: savedAsset.pdfUrl || current.interiorPdfUrl,
        }
      }
      return current
    })
  }

  const handleSaveProduct = async () => {
    if (!form.listingId.trim()) {
      setError('Listing ID is required')
      return
    }
    if (!form.title.trim() || !form.coverAssetId || !form.insidePageAssetId) {
      setError('Product title, cover asset, and inside pages are required')
      return
    }
    if (!compatibility.isValid) {
      setError(compatibility.warnings.join(' '))
      return
    }

    setSaving(true)
    setError('')
    const luluPrintSpec = {
      ...effectiveLuluPrintSpec,
      pageCount: Number(effectiveLuluPrintSpec.pageCount || 0),
      podPackageId: compatibility.podPackageIds[effectiveLuluPrintSpec.coverFinish] || '',
    }
    try {
      if (isEditMode && product?._id) {
        const { data } = await api.patch(`/products/${product._id}`, {
          title: form.title.trim(),
          coverAssetId: form.coverAssetId,
          insidePageAssetId: form.insidePageAssetId,
          luluPrintSpec,
          podPackageId: luluPrintSpec.podPackageId,
          allowedCoverFinishes: form.allowedCoverFinishes,
        })
        navigate(`/product-library-2/product/${data._id}/designer`)
        return
      }

      const payload = {
        listingId: form.listingId.trim(),
        storeId: activeStore?._id,
        title: form.title.trim(),
        coverAssetId: form.coverAssetId,
        insidePageAssetId: form.insidePageAssetId,
        luluPrintSpec,
        podPackageId: luluPrintSpec.podPackageId,
        allowedCoverFinishes: form.allowedCoverFinishes,
      }
      const { data } = await api.post('/products', payload)
      navigate(`/product-library-2/product/${data._id}/designer`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/products/${deleteId}`)
      setDeleteId(null)
      fetchProducts()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product')
    }
  }

  if (editorState?.asset) {
    return (
      <ProductTemplateEditor
        product={product}
        libraryItem={editorState.asset}
        onBack={() => setEditorState(null)}
        onSaved={handleAssetSaved}
      />
    )
  }

  if (isListMode) {
    return (
      <Box>
        <SoftPageHeader
          title="Products (The Junction)"
          subtitle="See available products, connect them to a cover and inside pages, and open their designer view."
          breadcrumbs={[
            <Typography key="root" component={RouterLink} to="/product-library-2" sx={{ color: '#2563eb', textDecoration: 'none' }}>Home</Typography>,
            <Typography key="current" sx={{ color: '#667085' }}>Products</Typography>,
          ]}
          actions={canManage ? (
            <SoftButton variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/product-library-2/product/new')}>
              Add Product
            </SoftButton>
          ) : null}
        />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 3 }}>
          <SoftInput
            placeholder="Search products, listing IDs, or linked assets..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            startIcon={<SearchIcon sx={{ fontSize: 20, color: '#667085' }} />}
            fullWidth
          />
        </Box>

        <SoftCard hover={false}>
          <TableContainer>
            <SoftTable>
              <SoftTableHead>
                <SoftTableRow>
                  <SoftTableCell>Listing ID</SoftTableCell>
                  <SoftTableCell>Product</SoftTableCell>
                  <SoftTableCell>Cover Asset</SoftTableCell>
                  <SoftTableCell>Inside Pages</SoftTableCell>
                  <SoftTableCell>Status</SoftTableCell>
                  <SoftTableCell align="left">Actions</SoftTableCell>
                </SoftTableRow>
              </SoftTableHead>
              <SoftTableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SoftTableRow key={index}>
                      <SoftTableCell colSpan={6}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <CircularProgress size={18} />
                          <Typography sx={{ color: '#64748b' }}>Loading products...</Typography>
                        </Stack>
                      </SoftTableCell>
                    </SoftTableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <SoftTableRow>
                    <SoftTableCell colSpan={6} sx={{ p: 0 }}>
                      <SoftEmptyState
                        icon={Inventory2OutlinedIcon}
                        title={search ? 'No matching products' : 'No products yet'}
                        description="Create your first product by linking a cover asset and an inside-page asset."
                        action={canManage ? (
                          <SoftButton variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/product-library-2/product/new')}>
                            Add Product
                          </SoftButton>
                        ) : null}
                      />
                    </SoftTableCell>
                  </SoftTableRow>
                ) : (
                  filteredProducts.map((item) => (
                    <SoftTableRow key={item._id}>
                      <SoftTableCell>
                        <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                          {item.listingId || '-'}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: '0.9rem',
                              bgcolor: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {productInitials(item.title)}
                          </Box>
                          <Box sx={{ minWidth: 0, maxWidth: { xs: 140, sm: 220, md: 320 } }}>
                            <Typography sx={{ fontWeight: 700 }} noWrap>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                              {item.listingId}
                            </Typography>
                          </Box>
                        </Stack>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Typography sx={{ fontWeight: 700 }}>{item.coverAsset?.title || 'Not linked'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.coverAsset?.pageCount ? `${item.coverAsset.pageCount} page${item.coverAsset.pageCount === 1 ? '' : 's'}` : 'Select a cover asset'}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Typography sx={{ fontWeight: 700 }}>{item.insidePageAsset?.title || 'Not linked'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.insidePageAsset?.pageCount ? `${item.insidePageAsset.pageCount} page${item.insidePageAsset.pageCount === 1 ? '' : 's'}` : 'Select inside pages'}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Chip
                          label={item.coverAssetId && item.insidePageAssetId ? 'Ready' : 'Incomplete'}
                          size="small"
                          sx={{
                            bgcolor: item.coverAssetId && item.insidePageAssetId ? '#dcfce7' : '#fef3c7',
                            color: item.coverAssetId && item.insidePageAssetId ? '#166534' : '#92400e',
                            fontWeight: 700,
                          }}
                        />
                      </SoftTableCell>
                      <SoftTableCell align="left">
                        <Stack direction="row" spacing={1} justifyContent="flex-start">
                          <SoftButton
                            variant="outlined"
                            startIcon={<DesignServicesOutlinedIcon />}
                            onClick={() => navigate(`/product-library-2/product/${item._id}/designer`)}
                          >
                            Product Designer
                          </SoftButton>
                          {canManage && (
                            <>
                              <Tooltip title="Edit product">
                                <IconButton onClick={() => navigate(`/product-library-2/product/${item._id}/edit`)}>
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete product">
                                <IconButton color="error" onClick={() => setDeleteId(item._id)}>
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </SoftTableCell>
                    </SoftTableRow>
                  ))
                )}
              </SoftTableBody>
            </SoftTable>
          </TableContainer>
        </SoftCard>

        <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogContent>
            <Typography>This product will be removed from the library.</Typography>
          </DialogContent>
          <DialogActions>
            <SoftButton onClick={() => setDeleteId(null)} color="dark" variant="outlined">Cancel</SoftButton>
            <SoftButton onClick={handleDeleteProduct} color="error" variant="contained">Delete</SoftButton>
          </DialogActions>
        </Dialog>
      </Box>
    )
  }

  if (loading) {
    return (
      <SoftCard hover={false} sx={{ p: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={22} />
          <Typography sx={{ color: '#64748b' }}>Loading product workspace...</Typography>
        </Stack>
      </SoftCard>
    )
  }

  if (error) {
    return (
      <SoftEmptyState
        icon={Inventory2OutlinedIcon}
        title="Could not load this product"
        description={error}
        action={<SoftButton onClick={() => navigate('/product-library-2/product')}>Back to Products</SoftButton>}
      />
    )
  }

  if ((isEditMode || isDesignerMode) && !product) {
    return (
      <SoftEmptyState
        icon={Inventory2OutlinedIcon}
        title="Product not found"
        description="The requested product is unavailable."
        action={<SoftButton onClick={() => navigate('/product-library-2/product')}>Back to Products</SoftButton>}
      />
    )
  }

  if (isDesignerMode) {
    return (
      <Box>
        <SoftPageHeader
          title={`${product.title} Designer`}
          subtitle="Preview the linked cover and inside-page canvases, then jump into editing either asset."
          breadcrumbs={[
            <Typography key="root" component={RouterLink} to="/product-library-2" sx={{ color: '#2563eb', textDecoration: 'none' }}>Home</Typography>,
            <Typography key="products" component={RouterLink} to="/product-library-2/product" sx={{ color: '#2563eb', textDecoration: 'none' }}>Products</Typography>,
            <Typography key="current" sx={{ color: '#667085' }}>{product.title}</Typography>,
          ]}
          actions={(
            <Stack direction="row" spacing={1}>
              <SoftButton variant="outlined" color="dark" startIcon={<ArrowBackIcon />} onClick={() => navigate('/product-library-2/product')}>
                Back
              </SoftButton>
              {canManage && (
                <SoftButton variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/product-library-2/product/${product._id}/edit`)}>
                  Edit Product
                </SoftButton>
              )}
            </Stack>
          )}
        />

        <SoftCard hover={false} sx={{ p: 2.5, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Box
              sx={{
                width: 58,
                height: 58,
                borderRadius: '1rem',
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {productInitials(product.title)}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{product.title}</Typography>
              <Typography sx={{ color: '#64748b' }}>{product.listingId}</Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={product.coverAsset?.title || 'Cover missing'} size="small" />
              <Chip label={product.insidePageAsset?.title || 'Inside pages missing'} size="small" />
            </Stack>
          </Stack>
        </SoftCard>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <ProductCanvasCard
              title="Cover Canvas"
              asset={product.coverAsset}
              icon={DescriptionOutlinedIcon}
              accent="#f5f3ff"
              onEditCanvas={() => openAssetEditor(product.coverAsset, 'cover')}
              canManage={canManage}
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <ProductCanvasCard
              title="Inside Pages Canvas"
              asset={product.insidePageAsset}
              icon={AutoStoriesOutlinedIcon}
              accent="#ecfeff"
              onEditCanvas={() => openAssetEditor(product.insidePageAsset, 'inside')}
              canManage={canManage}
            />
          </Grid>
        </Grid>
      </Box>
    )
  }

  return (
    <Box>
      <SoftPageHeader
        title={isCreateMode ? 'Create New Product' : 'Edit Product'}
        subtitle="Set the product title, choose the linked cover asset, choose the linked inside pages, and save."
        breadcrumbs={[
          <Typography key="root" component={RouterLink} to="/product-library-2" sx={{ color: '#2563eb', textDecoration: 'none' }}>Home</Typography>,
          <Typography key="products" component={RouterLink} to="/product-library-2/product" sx={{ color: '#2563eb', textDecoration: 'none' }}>Products</Typography>,
          <Typography key="current" sx={{ color: '#667085' }}>{isCreateMode ? 'New Product' : product.title}</Typography>,
        ]}
        actions={(
          <Stack direction="row" spacing={1}>
            <SoftButton variant="outlined" color="dark" onClick={() => navigate(isEditMode && product ? `/product-library-2/product/${product._id}/designer` : '/product-library-2/product')}>
              Cancel
            </SoftButton>
            {canManage && (
              <SoftButton variant="contained" onClick={handleSaveProduct} disabled={saving || !compatibility.isValid}>
                {saving ? <CircularProgress size={18} /> : 'Save Product'}
              </SoftButton>
            )}
          </Stack>
        )}
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7.5 }}>
          <SoftCard hover={false} sx={{ p: 0, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>Product Details</Typography>
            </Box>

            <Box sx={{ p: 2.5 }}>
              <Stack spacing={2.25}>
                <TextField
                  label="Etsy Listing ID"
                  value={form.listingId}
                  onChange={(event) => setForm((current) => ({ ...current, listingId: event.target.value }))}
                  placeholder="1234567890"
                  helperText={isEditMode ? 'Listing ID cannot be changed after creation.' : 'Paste the Etsy listing ID for this product.'}
                  fullWidth
                  required
                  disabled={isEditMode}
                />

                <TextField
                  label="Product Title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Student Planner"
                  fullWidth
                  required
                />

                <Autocomplete
                  options={compatibleCoverAssets}
                  value={coverAssets.find((item) => item._id === form.coverAssetId) || null}
                  onChange={(_, value) => selectCoverAsset(value)}
                  getOptionLabel={(option) => option.title || ''}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props
                    return (
                      <Box component="li" key={key} {...rest}>
                        <AssetOptionCard option={option} icon={DescriptionOutlinedIcon} />
                      </Box>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Cover Asset"
                      placeholder="Choose a cover"
                      helperText="Links this product to one cover asset."
                      fullWidth
                      required
                    />
                  )}
                />

                <Autocomplete
                  options={insideAssets}
                  value={insideAssets.find((item) => item._id === form.insidePageAssetId) || null}
                  onChange={(_, value) => selectInsideAsset(value)}
                  getOptionLabel={(option) => option.title || ''}
                  isOptionEqualToValue={(option, value) => option._id === value._id}
                  renderOption={(props, option) => {
                    const { key, ...rest } = props
                    return (
                      <Box component="li" key={key} {...rest}>
                        <AssetOptionCard option={option} icon={AutoStoriesOutlinedIcon} />
                      </Box>
                    )
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Inside Pages"
                      placeholder="Choose inside pages"
                      helperText="Links this product to one inside-page asset."
                      fullWidth
                      required
                    />
                  )}
                />

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Lulu Print Spec</Typography>
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select
                        label="Trim size"
                        value={effectiveLuluPrintSpec.trimSizeKey}
                        onChange={(event) => updateLuluSpec({ trimSizeKey: event.target.value })}
                        fullWidth
                      >
                        <MenuItem value="">Select trim size</MenuItem>
                        {(luluOptions.trims || []).map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select
                        label="Binding"
                        value={effectiveLuluPrintSpec.bindingType}
                        onChange={(event) => updateLuluSpec({ bindingType: event.target.value })}
                        fullWidth
                      >
                        <MenuItem value="">Select binding</MenuItem>
                        {(luluOptions.bindings || []).map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select
                        label="Interior color"
                        value={effectiveLuluPrintSpec.interiorColor}
                        onChange={(event) => updateLuluSpec({ interiorColor: event.target.value })}
                        fullWidth
                      >
                        <MenuItem value="">Select color</MenuItem>
                        {(luluOptions.interiorColors || []).map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        select
                        label="Paper"
                        value={effectiveLuluPrintSpec.paperType}
                        onChange={(event) => updateLuluSpec({ paperType: event.target.value })}
                        fullWidth
                      >
                        <MenuItem value="">Select paper</MenuItem>
                        {(luluOptions.papers || []).map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        select
                        label="Print quality"
                        value={effectiveLuluPrintSpec.printQuality}
                        onChange={(event) => updateLuluSpec({ printQuality: event.target.value })}
                        fullWidth
                      >
                        {(luluOptions.printQualities || [{ value: 'STD', label: 'Standard' }, { value: 'PRE', label: 'Premium' }]).map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        select
                        label="Cover finish"
                        value={effectiveLuluPrintSpec.coverFinish}
                        onChange={(event) => updateLuluSpec({ coverFinish: event.target.value })}
                        fullWidth
                      >
                        {FINISH_OPTIONS.map((option) => (
                          <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        label="Page count"
                        type="number"
                        value={effectiveLuluPrintSpec.pageCount}
                        onChange={(event) => updateLuluSpec({ pageCount: event.target.value })}
                        inputProps={{ min: 1, step: 1 }}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Allowed Cover Finishes</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {FINISH_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        control={(
                          <Checkbox
                            checked={form.allowedCoverFinishes.includes(option.value)}
                            onChange={toggleFinish(option.value)}
                          />
                        )}
                        label={option.label}
                      />
                    ))}
                  </Stack>
                </Box>

                <Alert severity={compatibility.isValid ? 'success' : 'warning'}>
                  {compatibility.isValid
                    ? `Valid Lulu package for ${Object.keys(compatibility.podPackageIds).join(' and ')} finish.`
                    : compatibility.warnings[0]}
                </Alert>
              </Stack>
            </Box>
          </SoftCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4.5 }}>
          <SoftCard hover={false} sx={{ p: 2.5, height: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 2.25 }}>Selected Assets</Typography>

            <Stack spacing={2}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '1.1rem', p: 1.5 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Cover</Typography>
                {selectedCover ? (
                  <AssetOptionCard option={selectedCover} icon={DescriptionOutlinedIcon} />
                ) : (
                  <Typography variant="body2" sx={{ color: '#64748b' }}>No cover asset selected yet.</Typography>
                )}
              </Box>

              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '1.1rem', p: 1.5 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Inside Pages</Typography>
                {selectedInside ? (
                  <AssetOptionCard option={selectedInside} icon={AutoStoriesOutlinedIcon} />
                ) : (
                  <Typography variant="body2" sx={{ color: '#64748b' }}>No inside-page asset selected yet.</Typography>
                )}
              </Box>
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {compatibility.isValid
                ? Object.entries(compatibility.podPackageIds).map(([finish, id]) => `${finish}: ${id}`).join(' · ')
                : compatibility.warnings.join(' ')}
            </Typography>
          </SoftCard>
        </Grid>
      </Grid>
    </Box>
  )
}
