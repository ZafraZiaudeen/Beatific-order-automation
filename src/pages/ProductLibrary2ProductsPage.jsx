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
import Snackbar from '@mui/material/Snackbar'
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

const luluOptionCode = (value, options = []) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return options.find((option) => option.value === text || option.label === text)?.value || text
}

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

const emptyMatchRule = () => ({ label: '', value: '' })
const emptyPoolRule = () => ({ key: '', equals: '' })
const emptyAssetPoolEntry = () => ({ assetId: null, rules: [emptyPoolRule()], priority: 0, enabled: true })

const emptyVariant = () => ({
  name: '',
  coverAssetId: null,
  insidePageAssetId: null,
  matchRules: [],
})

const normalizeVariantsForForm = (variants = []) =>
  variants.map((variant) => ({
    _id: variant._id || variant.id,
    name: variant.name || '',
    coverAssetId: variant.coverAssetId || null,
    insidePageAssetId: variant.insidePageAssetId || null,
    matchRules: (variant.matchRules || []).map((rule) => ({
      label: rule.label || '',
      value: rule.value || '',
    })),
    luluPrintSpec: variant.luluPrintSpec || null,
    podPackageId: variant.podPackageId || null,
    interiorPdfUrl: variant.interiorPdfUrl || null,
    priceLabel: variant.priceLabel || null,
    templatePolicy: variant.templatePolicy,
    printTemplate: variant.printTemplate,
  }))

const variantsForPayload = (variants = []) =>
  variants
    .map((variant) => ({
      _id: variant._id,
      name: variant.name.trim(),
      coverAssetId: variant.coverAssetId || null,
      insidePageAssetId: variant.insidePageAssetId || null,
      matchRules: (variant.matchRules || [])
        .map((rule) => ({
          label: rule.label.trim(),
          value: rule.value.trim(),
        }))
        .filter((rule) => rule.label && rule.value),
      luluPrintSpec: variant.luluPrintSpec || undefined,
      podPackageId: variant.podPackageId || undefined,
      interiorPdfUrl: variant.interiorPdfUrl || undefined,
      priceLabel: variant.priceLabel || undefined,
      templatePolicy: variant.templatePolicy || undefined,
      printTemplate: variant.printTemplate || undefined,
    }))
    .filter((variant) => variant.name)

const normalizeAssetPoolForForm = (entries = []) =>
  entries.map((entry) => ({
    assetId: entry.assetId || null,
    rules: (entry.rules?.length ? entry.rules : [emptyPoolRule()]).map((rule) => ({
      key: rule.key || '',
      equals: rule.equals || '',
    })),
    priority: Number(entry.priority || 0),
    enabled: entry.enabled !== false,
  }))

const assetPoolForPayload = (entries = []) =>
  entries
    .map((entry) => ({
      assetId: entry.assetId,
      rules: (entry.rules || [])
        .map((rule) => ({
          key: String(rule.key || '').trim(),
          equals: String(rule.equals || '').trim(),
        }))
        .filter((rule) => rule.key && rule.equals),
      priority: Number(entry.priority || 0),
      enabled: entry.enabled !== false,
    }))
    .filter((entry) => entry.assetId)

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
        {option?.matchingOptions?.length ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
            {option.matchingOptions.length} Etsy option{option.matchingOptions.length === 1 ? '' : 's'}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  )
}

const uniqueAssets = (assets = []) => {
  const seen = new Set()
  return assets.filter((asset) => {
    if (!asset?._id || seen.has(asset._id)) return false
    seen.add(asset._id)
    return true
  })
}

const poolAssets = (pool = [], assetOptions = []) =>
  uniqueAssets(
    pool
      .map((entry) => entry.asset || assetOptions.find((asset) => asset._id === entry.assetId))
      .filter(Boolean)
  )

function ProductCanvasCard(props) {
  const { title, asset, assets = [], icon, accent, onEditCanvas, canManage } = props
  const displayAssets = assets.length ? assets : (asset ? [asset] : [])
  const isPoolBacked = assets.length > 0
  const assetCountLabel = `${displayAssets.length} asset${displayAssets.length === 1 ? '' : 's'}`
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
            {displayAssets.length ? (isPoolBacked ? `${assetCountLabel} in pool` : displayAssets[0].title) : 'No asset linked yet'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2.5 }}>
        {displayAssets.length ? (
          <Stack spacing={2} sx={{ mb: 2 }}>
            {displayAssets.map((displayAsset) => (
              <Box
                key={displayAsset._id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '1.2rem',
                  overflow: 'hidden',
                  bgcolor: '#fff',
                }}
              >
                <Box
                  sx={{
                    minHeight: 300,
                    bgcolor: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {displayAsset.imageUrl ? (
                    <Box
                      component="img"
                      src={displayAsset.imageUrl}
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
                <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 800 }} noWrap>{displayAsset.title || 'Untitled asset'}</Typography>
                      <Typography variant="body2" sx={{ color: '#64748b' }} noWrap>
                        {isPoolBacked ? 'Asset pool design' : 'Fallback design'}
                      </Typography>
                    </Box>
                    {canManage && (
                      <SoftButton
                        variant="outlined"
                        startIcon={<EditOutlinedIcon />}
                        onClick={() => onEditCanvas(displayAsset)}
                      >
                        Edit Canvas
                      </SoftButton>
                    )}
                  </Stack>
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
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
            <Stack spacing={1} alignItems="center" sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <Box component={icon} sx={{ fontSize: 44, color: '#94a3b8' }} />
              <Typography sx={{ fontWeight: 700, color: '#334155' }}>Canvas preview unavailable</Typography>
              <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 280 }}>
                Link a PDF-based asset to show its designer canvas here.
              </Typography>
            </Stack>
          </Box>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {isPoolBacked && <Chip label={assetCountLabel} size="small" />}
          {!isPoolBacked && <Chip label={asset?.pageCount ? `${asset.pageCount} page${asset.pageCount === 1 ? '' : 's'}` : 'No PDF pages'} size="small" />}
          {!isPoolBacked && <Chip label={asset?.templateFields?.length ? `${asset.templateFields.length} mapped fields` : 'No mapped fields'} size="small" />}
          {!isPoolBacked && asset?.pageWidth && asset?.pageHeight ? (
            <Chip label={`${(asset.pageWidth / 72).toFixed(2)} x ${(asset.pageHeight / 72).toFixed(2)} in`} size="small" />
          ) : null}
        </Stack>

        <Typography variant="body2" sx={{ color: '#64748b', mb: 2.25 }}>
          {isPoolBacked
            ? 'These pool assets feed order matching and print template generation.'
            : asset?.description || 'This linked asset feeds the product designer and print template workflow.'}
        </Typography>
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
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' })
  const [deleteId, setDeleteId] = useState(null)
  const [editorState, setEditorState] = useState(null)
  const [form, setForm] = useState({
    listingId: '',
    title: '',
    coverAssetId: null,
    insidePageAssetId: null,
    luluPrintSpec: DEFAULT_LULU_PRINT_SPEC,
    allowedCoverFinishes: ['MATTE', 'GLOSSY'],
    coverAssetPool: [],
    insideAssetPool: [],
    optionSchema: [],
    templatePool: [],
    printProfileRules: [],
    variants: [],
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
        coverAssetPool: normalizeAssetPoolForForm(data.coverAssetPool || []),
        insideAssetPool: normalizeAssetPoolForForm(data.insideAssetPool || []),
        optionSchema: data.optionSchema || [],
        templatePool: data.templatePool || [],
        printProfileRules: data.printProfileRules || [],
        variants: normalizeVariantsForForm(data.variants || []),
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
    if (isEditMode || isDesignerMode) fetchAssetOptions()
  }, [fetchAssetOptions, fetchProduct, fetchProducts, isCreateMode, isDesignerMode, isEditMode, isListMode])

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
  const designerCoverAssets = useMemo(
    () => poolAssets(product?.coverAssetPool || [], coverAssets),
    [coverAssets, product?.coverAssetPool]
  )
  const designerInsideAssets = useMemo(
    () => poolAssets(product?.insideAssetPool || [], insideAssets),
    [insideAssets, product?.insideAssetPool]
  )
  const usesCoverAssetPool = form.coverAssetPool.length > 0
  const usesInsideAssetPool = form.insideAssetPool.length > 0
  const usesAssetPools = form.coverAssetPool.length > 0 || form.insideAssetPool.length > 0
  const effectiveLuluPrintSpec = useMemo(() => ({
    ...form.luluPrintSpec,
    trimSizeKey:
      form.luluPrintSpec.trimSizeKey ||
      luluOptionCode(selectedInside?.insideSize, luluOptions.trims) ||
      luluOptionCode(selectedCover?.coverSize, luluOptions.trims),
    bindingType: form.luluPrintSpec.bindingType || luluOptionCode(selectedCover?.coverType, luluOptions.bindings),
    interiorColor: form.luluPrintSpec.interiorColor || selectedInside?.interiorColor || '',
    paperType: form.luluPrintSpec.paperType || luluOptionCode(selectedInside?.paperType, luluOptions.papers),
    pageCount: form.luluPrintSpec.pageCount || (selectedInside?.pageCount ? String(selectedInside.pageCount) : ''),
    printQuality: form.luluPrintSpec.printQuality || 'STD',
    coverFinish: form.luluPrintSpec.coverFinish || 'MATTE',
  }), [form.luluPrintSpec, luluOptions.bindings, luluOptions.papers, luluOptions.trims, selectedCover, selectedInside])

  const compatibleCoverAssets = useMemo(() => {
    const packages = luluOptions.packages || []
    if (!selectedInside?.insideSize || !selectedInside?.pageCount || !packages.length) return coverAssets
    return coverAssets.filter((cover) => {
      if (!cover.coverSize || !cover.coverType) return false
      const coverTrim = luluOptionCode(cover.coverSize, luluOptions.trims)
      const insideTrim = luluOptionCode(selectedInside.insideSize, luluOptions.trims)
      const coverBinding = luluOptionCode(cover.coverType, luluOptions.bindings)
      return packages.some((pkg) =>
        pkg.trim === coverTrim &&
        pkg.trim === insideTrim &&
        pkg.binding === coverBinding &&
        (!selectedInside.interiorColor || pkg.interiorColor === selectedInside.interiorColor) &&
        (!selectedInside.paperType || pkg.paper === luluOptionCode(selectedInside.paperType, luluOptions.papers)) &&
        selectedInside.pageCount >= pkg.minPage &&
        selectedInside.pageCount <= pkg.maxPage
      )
    })
  }, [coverAssets, luluOptions.bindings, luluOptions.packages, luluOptions.papers, luluOptions.trims, selectedInside])

  const compatibility = useMemo(() => {
    const warnings = []
    const packages = luluOptions.packages || []
    const spec = effectiveLuluPrintSpec
    if (usesAssetPools) {
      return {
        isValid: true,
        warnings: ['Lulu package will be resolved per order from the matched cover and inside-page assets.'],
        podPackageIds: {},
      }
    }
    if (!selectedCover || !selectedInside) {
      const hasPools = form.coverAssetPool.length > 0 && form.insideAssetPool.length > 0
      return {
        isValid: hasPools,
        warnings: hasPools ? ['Lulu package will be resolved from the matching pool assets for each order.'] : ['Choose fallback assets or add cover and inside asset pools.'],
        podPackageIds: {},
      }
    }
    if (!spec.trimSizeKey) warnings.push('Choose a Lulu trim size.')
    const coverTrim = luluOptionCode(selectedCover.coverSize, luluOptions.trims)
    const insideTrim = luluOptionCode(selectedInside.insideSize, luluOptions.trims)
    if (coverTrim && insideTrim && coverTrim !== insideTrim) {
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
  }, [effectiveLuluPrintSpec, form.coverAssetPool.length, form.insideAssetPool.length, luluOptions.packages, luluOptions.trims, selectedCover, selectedInside, usesAssetPools])

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
        trimSizeKey: luluOptionCode(value?.coverSize, luluOptions.trims) || current.luluPrintSpec.trimSizeKey,
        bindingType: luluOptionCode(value?.coverType, luluOptions.bindings) || current.luluPrintSpec.bindingType,
      },
    }))
  }

  const selectInsideAsset = (value) => {
    setForm((current) => ({
      ...current,
      insidePageAssetId: value?._id || null,
      luluPrintSpec: {
        ...current.luluPrintSpec,
        trimSizeKey: current.luluPrintSpec.trimSizeKey || luluOptionCode(value?.insideSize, luluOptions.trims),
        interiorColor: value?.interiorColor || current.luluPrintSpec.interiorColor,
        paperType: luluOptionCode(value?.paperType, luluOptions.papers) || current.luluPrintSpec.paperType,
        pageCount: value?.pageCount ? String(value.pageCount) : current.luluPrintSpec.pageCount,
      },
    }))
  }

  const addVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [...current.variants, emptyVariant()],
    }))
  }

  const updateVariant = (index, changes) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...changes } : variant
      ),
    }))
  }

  const removeVariant = (index) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  const addVariantRule = (variantIndex) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? { ...variant, matchRules: [...(variant.matchRules || []), emptyMatchRule()] }
          : variant
      ),
    }))
  }

  const updateVariantRule = (variantIndex, ruleIndex, key, value) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              matchRules: (variant.matchRules || []).map((rule, currentRuleIndex) =>
                currentRuleIndex === ruleIndex ? { ...rule, [key]: value } : rule
              ),
            }
          : variant
      ),
    }))
  }

  const removeVariantRule = (variantIndex, ruleIndex) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              matchRules: (variant.matchRules || []).filter((_, currentRuleIndex) => currentRuleIndex !== ruleIndex),
            }
          : variant
      ),
    }))
  }

  const addPoolEntry = (poolKey) => {
    setForm((current) => ({
      ...current,
      [poolKey]: [...current[poolKey], emptyAssetPoolEntry()],
    }))
  }

  const updatePoolEntry = (poolKey, entryIndex, changes) => {
    setForm((current) => ({
      ...current,
      [poolKey]: current[poolKey].map((entry, index) =>
        index === entryIndex ? { ...entry, ...changes } : entry
      ),
    }))
  }

  const removePoolEntry = (poolKey, entryIndex) => {
    setForm((current) => ({
      ...current,
      [poolKey]: current[poolKey].filter((_, index) => index !== entryIndex),
    }))
  }

  const addPoolRule = (poolKey, entryIndex) => {
    setForm((current) => ({
      ...current,
      [poolKey]: current[poolKey].map((entry, index) =>
        index === entryIndex
          ? { ...entry, rules: [...(entry.rules || []), emptyPoolRule()] }
          : entry
      ),
    }))
  }

  const updatePoolRule = (poolKey, entryIndex, ruleIndex, key, value) => {
    setForm((current) => ({
      ...current,
      [poolKey]: current[poolKey].map((entry, index) =>
        index === entryIndex
          ? {
              ...entry,
              rules: (entry.rules || []).map((rule, currentRuleIndex) =>
                currentRuleIndex === ruleIndex ? { ...rule, [key]: value } : rule
              ),
            }
          : entry
      ),
    }))
  }

  const removePoolRule = (poolKey, entryIndex, ruleIndex) => {
    setForm((current) => ({
      ...current,
      [poolKey]: current[poolKey].map((entry, index) =>
        index === entryIndex
          ? { ...entry, rules: (entry.rules || []).filter((_, currentRuleIndex) => currentRuleIndex !== ruleIndex) }
          : entry
      ),
    }))
  }

  const renderAssetPool = ({ title, poolKey, assets, icon, addLabel }) => (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: form[poolKey].length ? 1.5 : 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Canonical asset rules for order matching.
          </Typography>
        </Box>
        <SoftButton variant="outlined" startIcon={<AddIcon />} onClick={() => addPoolEntry(poolKey)}>
          {addLabel}
        </SoftButton>
      </Stack>

      <Stack spacing={1.5}>
        {form[poolKey].map((entry, entryIndex) => {
          const selectedAsset = assets.find((asset) => asset._id === entry.assetId) || null
          return (
            <Box key={`${poolKey}-${entryIndex}`} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, bgcolor: '#f8fafc' }}>
              <Stack spacing={1.25}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <Autocomplete
                    options={assets}
                    value={selectedAsset}
                    onChange={(_, value) => updatePoolEntry(poolKey, entryIndex, { assetId: value?._id || null })}
                    getOptionLabel={(option) => option.title || ''}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    renderOption={(props, option) => {
                      const { key, ...rest } = props
                      return (
                        <Box component="li" key={key} {...rest}>
                          <AssetOptionCard option={option} icon={icon} />
                        </Box>
                      )
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Asset" placeholder="Choose asset" fullWidth />
                    )}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Priority"
                    type="number"
                    value={entry.priority}
                    onChange={(event) => updatePoolEntry(poolKey, entryIndex, { priority: event.target.value })}
                    sx={{ width: { xs: '100%', md: 120 } }}
                  />
                  <FormControlLabel
                    control={(
                      <Checkbox
                        checked={entry.enabled !== false}
                        onChange={(event) => updatePoolEntry(poolKey, entryIndex, { enabled: event.target.checked })}
                      />
                    )}
                    label="Enabled"
                  />
                  <Tooltip title="Remove pool asset">
                    <IconButton color="error" onClick={() => removePoolEntry(poolKey, entryIndex)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Stack spacing={1}>
                  {(entry.rules || []).map((rule, ruleIndex) => (
                    <Stack key={ruleIndex} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <TextField
                        label="Canonical key"
                        value={rule.key}
                        onChange={(event) => updatePoolRule(poolKey, entryIndex, ruleIndex, 'key', event.target.value)}
                        placeholder="inside_layout"
                        fullWidth
                      />
                      <TextField
                        label="Required value"
                        value={rule.equals}
                        onChange={(event) => updatePoolRule(poolKey, entryIndex, ruleIndex, 'equals', event.target.value)}
                        placeholder="Weekly Layout 2"
                        fullWidth
                      />
                      <Tooltip title="Remove rule">
                        <IconButton color="error" onClick={() => removePoolRule(poolKey, entryIndex, ruleIndex)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>

                <SoftButton variant="outlined" startIcon={<AddIcon />} onClick={() => addPoolRule(poolKey, entryIndex)}>
                  Add Rule
                </SoftButton>
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )

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
    const hasCoverSource = Boolean(form.coverAssetId || form.coverAssetPool.length)
    const hasInsideSource = Boolean(form.insidePageAssetId || form.insideAssetPool.length)
    if (!form.title.trim() || !hasCoverSource || !hasInsideSource) {
      setError('Product title, cover source, and inside-page source are required')
      return
    }
    if (!compatibility.isValid) {
      setError(compatibility.warnings.join(' '))
      return
    }

    setSaving(true)
    setError('')
    const luluPrintSpec = usesAssetPools ? undefined : {
      ...effectiveLuluPrintSpec,
      pageCount: Number(effectiveLuluPrintSpec.pageCount || 0),
      podPackageId: compatibility.podPackageIds[effectiveLuluPrintSpec.coverFinish] || '',
    }
    try {
      if (isEditMode && product?._id) {
        const { data } = await api.patch(`/products/${product._id}`, {
          title: form.title.trim(),
          coverAssetId: usesCoverAssetPool ? null : form.coverAssetId || null,
          insidePageAssetId: usesInsideAssetPool ? null : form.insidePageAssetId || null,
          luluPrintSpec: usesAssetPools ? null : luluPrintSpec,
          podPackageId: usesAssetPools ? null : luluPrintSpec.podPackageId,
          allowedCoverFinishes: form.allowedCoverFinishes,
          coverAssetPool: assetPoolForPayload(form.coverAssetPool),
          insideAssetPool: assetPoolForPayload(form.insideAssetPool),
          optionSchema: form.optionSchema,
          templatePool: form.templatePool,
          printProfileRules: form.printProfileRules,
          variants: variantsForPayload(form.variants),
        })
        navigate(`/product-library-2/product/${data._id}/designer`)
        return
      }

      const payload = {
        listingId: form.listingId.trim(),
        storeId: activeStore?._id,
        title: form.title.trim(),
        coverAssetId: usesCoverAssetPool ? null : form.coverAssetId || null,
        insidePageAssetId: usesInsideAssetPool ? null : form.insidePageAssetId || null,
        luluPrintSpec,
        podPackageId: usesAssetPools ? null : luluPrintSpec.podPackageId,
        allowedCoverFinishes: form.allowedCoverFinishes,
        coverAssetPool: assetPoolForPayload(form.coverAssetPool),
        insideAssetPool: assetPoolForPayload(form.insideAssetPool),
        optionSchema: form.optionSchema,
        templatePool: form.templatePool,
        printProfileRules: form.printProfileRules,
        variants: variantsForPayload(form.variants),
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
      const { data } = await api.delete(`/products/${deleteId}`)
      setDeleteId(null)
      fetchProducts()
      const unmapped = Number(data?.unmappedOrders || 0)
      const frozen = Number(data?.frozenOrders || 0)
      const details = [
        unmapped ? `${unmapped} mapped order${unmapped === 1 ? '' : 's'} unmapped` : null,
        frozen ? `${frozen} generated order${frozen === 1 ? '' : 's'} frozen` : null,
      ].filter(Boolean)
      setSnack({
        open: true,
        message: details.length ? `Product deleted: ${details.join(', ')}.` : 'Product deleted.',
        severity: 'success',
      })
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
                  filteredProducts.map((item) => {
                    const coverPoolCount = item.coverAssetPool?.length || 0
                    const insidePoolCount = item.insideAssetPool?.length || 0
                    const hasCoverSource = Boolean(item.coverAssetId || coverPoolCount)
                    const hasInsideSource = Boolean(item.insidePageAssetId || insidePoolCount)
                    return (
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
                        <Typography sx={{ fontWeight: 700 }}>{coverPoolCount ? `${coverPoolCount} cover pool asset${coverPoolCount === 1 ? '' : 's'}` : item.coverAsset?.title || 'Not linked'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.coverAsset?.pageCount ? `${item.coverAsset.pageCount} page${item.coverAsset.pageCount === 1 ? '' : 's'}` : coverPoolCount ? 'Rule matched' : 'Select a cover asset'}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Typography sx={{ fontWeight: 700 }}>{insidePoolCount ? `${insidePoolCount} inside pool asset${insidePoolCount === 1 ? '' : 's'}` : item.insidePageAsset?.title || 'Not linked'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.insidePageAsset?.pageCount ? `${item.insidePageAsset.pageCount} page${item.insidePageAsset.pageCount === 1 ? '' : 's'}` : insidePoolCount ? 'Rule matched' : 'Select inside pages'}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Chip
                          label={hasCoverSource && hasInsideSource ? 'Ready' : 'Incomplete'}
                          size="small"
                          sx={{
                            bgcolor: hasCoverSource && hasInsideSource ? '#dcfce7' : '#fef3c7',
                            color: hasCoverSource && hasInsideSource ? '#166534' : '#92400e',
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
                    )
                  })
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
        <Snackbar
          open={snack.open}
          autoHideDuration={4000}
          onClose={() => setSnack((current) => ({ ...current, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={snack.severity}
            variant="filled"
            onClose={() => setSnack((current) => ({ ...current, open: false }))}
            sx={{ width: '100%' }}
          >
            {snack.message}
          </Alert>
        </Snackbar>
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
              <Chip
                label={designerCoverAssets.length ? `${designerCoverAssets.length} cover pool asset${designerCoverAssets.length === 1 ? '' : 's'}` : product.coverAsset?.title || 'Cover missing'}
                size="small"
              />
              <Chip
                label={designerInsideAssets.length ? `${designerInsideAssets.length} inside pool asset${designerInsideAssets.length === 1 ? '' : 's'}` : product.insidePageAsset?.title || 'Inside pages missing'}
                size="small"
              />
            </Stack>
          </Stack>
        </SoftCard>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <ProductCanvasCard
              title="Cover Canvas"
              asset={product.coverAsset}
              assets={designerCoverAssets}
              icon={DescriptionOutlinedIcon}
              accent="#f5f3ff"
              onEditCanvas={(asset) => openAssetEditor(asset || product.coverAsset, 'cover')}
              canManage={canManage}
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <ProductCanvasCard
              title="Inside Pages Canvas"
              asset={product.insidePageAsset}
              assets={designerInsideAssets}
              icon={AutoStoriesOutlinedIcon}
              accent="#ecfeff"
              onEditCanvas={(asset) => openAssetEditor(asset || product.insidePageAsset, 'inside')}
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
        subtitle="Set fallback assets for simple products, or use asset pools when size, binding, layout, or color can change per order."
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

                {!usesCoverAssetPool && (
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
                        label="Cover Asset"
                        placeholder="Choose a fixed cover"
                        helperText="Used for simple products without a cover pool."
                        fullWidth
                      />
                    )}
                  />
                )}

                {!usesInsideAssetPool && (
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
                        label="Inside Pages"
                        placeholder="Choose fixed inside pages"
                        helperText="Used for simple products without an inside-page pool."
                        fullWidth
                      />
                    )}
                  />
                )}

                {renderAssetPool({
                  title: 'Cover Asset Pool',
                  poolKey: 'coverAssetPool',
                  assets: coverAssets,
                  icon: DescriptionOutlinedIcon,
                  addLabel: 'Add Cover',
                })}

                {renderAssetPool({
                  title: 'Inside Page Pool',
                  poolKey: 'insideAssetPool',
                  assets: insideAssets,
                  icon: AutoStoriesOutlinedIcon,
                  addLabel: 'Add Inside',
                })}

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: form.variants.length ? 1.5 : 0 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>Etsy Variants</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Use only for true sellable packages. Use asset pools for color, layout, size, binding, timeline, and page-count choices.
                      </Typography>
                    </Box>
                    <SoftButton variant="outlined" startIcon={<AddIcon />} onClick={addVariant}>
                      Add Variant
                    </SoftButton>
                  </Stack>

                  <Stack spacing={1.75}>
                    {form.variants.map((variant, variantIndex) => {
                      const variantCover = coverAssets.find((asset) => asset._id === variant.coverAssetId) || null
                      const variantInside = insideAssets.find((asset) => asset._id === variant.insidePageAssetId) || null
                      const inheritedCover = coverAssets.find((asset) => asset._id === form.coverAssetId) || selectedCover
                      const inheritedInside = insideAssets.find((asset) => asset._id === form.insidePageAssetId) || selectedInside

                      return (
                        <Box key={variant._id || variantIndex} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, bgcolor: '#f8fafc' }}>
                          <Stack spacing={1.5}>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                              <TextField
                                label="Variant name"
                                value={variant.name}
                                onChange={(event) => updateVariant(variantIndex, { name: event.target.value })}
                                placeholder="Dotted planner - Red spine"
                                fullWidth
                              />
                              <Tooltip title="Remove variant">
                                <IconButton color="error" onClick={() => removeVariant(variantIndex)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>

                            <Grid container spacing={1.5}>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Autocomplete
                                  options={coverAssets}
                                  value={variantCover}
                                  onChange={(_, value) => updateVariant(variantIndex, { coverAssetId: value?._id || null })}
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
                                      label="Variant cover"
                                      helperText={variantCover ? 'Overrides the product cover.' : `Inherits ${inheritedCover?.title || 'product cover'}.`}
                                      fullWidth
                                    />
                                  )}
                                />
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Autocomplete
                                  options={insideAssets}
                                  value={variantInside}
                                  onChange={(_, value) => updateVariant(variantIndex, { insidePageAssetId: value?._id || null })}
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
                                      label="Variant inside pages"
                                      helperText={variantInside ? 'Overrides the product inside pages.' : `Inherits ${inheritedInside?.title || 'product inside pages'}.`}
                                      fullWidth
                                    />
                                  )}
                                />
                              </Grid>
                            </Grid>

                            <Box>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: (variant.matchRules || []).length ? 1 : 0 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
                                  Extra variant rules. Linked asset Etsy options are also used automatically.
                                </Typography>
                                <SoftButton variant="outlined" startIcon={<AddIcon />} onClick={() => addVariantRule(variantIndex)}>
                                  Add Rule
                                </SoftButton>
                              </Stack>
                              <Stack spacing={1}>
                                {(variant.matchRules || []).map((rule, ruleIndex) => (
                                  <Stack key={ruleIndex} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                                    <TextField
                                      label="Etsy option name"
                                      value={rule.label}
                                      onChange={(event) => updateVariantRule(variantIndex, ruleIndex, 'label', event.target.value)}
                                      placeholder="Layout"
                                      fullWidth
                                    />
                                    <TextField
                                      label="Required value"
                                      value={rule.value}
                                      onChange={(event) => updateVariantRule(variantIndex, ruleIndex, 'value', event.target.value)}
                                      placeholder="Dotted"
                                      fullWidth
                                    />
                                    <Tooltip title="Remove rule">
                                      <IconButton color="error" onClick={() => removeVariantRule(variantIndex, ruleIndex)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>
                          </Stack>
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>

                {usesAssetPools ? (
                  <Alert severity="info">
                    Pool-backed orders resolve size, binding, page count, paper, and package from the matched cover and inside-page assets.
                  </Alert>
                ) : (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                    <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Lulu Print Spec</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                      Used as the product-level Lulu package for simple products with one fixed cover and inside-page set.
                    </Typography>
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
                )}

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
                {usesCoverAssetPool ? (
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {form.coverAssetPool.length} cover pool asset{form.coverAssetPool.length === 1 ? '' : 's'} configured.
                  </Typography>
                ) : selectedCover ? (
                  <AssetOptionCard option={selectedCover} icon={DescriptionOutlinedIcon} />
                ) : (
                  <Typography variant="body2" sx={{ color: '#64748b' }}>No cover asset selected yet.</Typography>
                )}
              </Box>

              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '1.1rem', p: 1.5 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>Inside Pages</Typography>
                {usesInsideAssetPool ? (
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {form.insideAssetPool.length} inside-page pool asset{form.insideAssetPool.length === 1 ? '' : 's'} configured.
                  </Typography>
                ) : selectedInside ? (
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
