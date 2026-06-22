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

const BUILT_IN_BATCH_RULE_OPTIONS = [
  { key: 'trim_size', label: 'Order: Trim Size', group: 'Order Facts' },
  { key: 'page_count', label: 'Order: Page Count', group: 'Order Facts' },
  { key: 'binding_type', label: 'Order: Binding Type', group: 'Order Facts' },
]

const isCoverFinish = (value) => FINISH_OPTIONS.some((option) => option.value === value)
const normalizeCoverFinish = (value) => (isCoverFinish(value) ? value : 'MATTE')
const firstCoverFinish = (values = []) => normalizeCoverFinish(values.find(isCoverFinish))

const luluOptionCode = (value, options = []) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return options.find((option) => option.value === text || option.label === text)?.value || text
}

const canonicalOptionKeyForLabel = (label = '') => {
  const text = String(label || '').trim().toLowerCase()
  if (!text) return ''
  if (/\b(layout|design|inside page style|inside pages|paper type)\b/.test(text)) return 'inside_layout'
  if (/\b(cover color|cover colour|background color|background colour|book color|book colour)\b/.test(text)) return 'cover_color'
  if (/\b(size|trim)\b/.test(text)) return 'trim_size'
  if (/\b(cover type|cover style|binding)\b/.test(text)) return 'binding_type'
  return text.replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

const uniqueByValue = (items = []) => {
  const seen = new Set()
  return items.filter((item) => {
    const value = String(item?.value || '').trim()
    if (!value || seen.has(value)) return false
    seen.add(value)
    return true
  })
}

const addRuleOption = (options, option) => {
  if (!option?.key) return
  const existing = options.find((item) => item.key === option.key && item.group === option.group)
  if (existing) {
    existing.values = uniqueByValue([...(existing.values || []), ...(option.values || [])])
    return
  }
  options.push(option)
}

const matchingOptionsAsRuleOptions = (asset, group) =>
  (asset?.matchingOptions || [])
    .map((option) => ({
      key: canonicalOptionKeyForLabel(option.label),
      label: `${group}: ${option.label}`,
      group,
      values: [{ value: option.value, label: option.value }],
    }))
    .filter((option) => option.key && option.values[0]?.value)

const shortTrimValue = (value = '') => {
  const text = String(value || '').trim()
  return text.match(/\bA\d\b/i)?.[0]?.toUpperCase() || text
}

const bindingRuleValue = (value = '') => {
  const text = String(value || '').toLowerCase()
  if (/\b(spiral|coil)\b/.test(text)) return text.includes('hard') ? 'spiral_hardcover' : 'spiral_softcover'
  if (/\b(hardcover|hard cover|casewrap|case wrap)\b/.test(text)) return 'hardcover'
  if (/\b(softcover|soft cover|paperback|perfect bound)\b/.test(text)) return 'softcover'
  return String(value || '').trim()
}

const batchRuleOptions = ({ coverAsset, insideAsset, optionSchema = [] }) => {
  const options = []
  BUILT_IN_BATCH_RULE_OPTIONS.forEach((option) => addRuleOption(options, { ...option, values: [] }))
  matchingOptionsAsRuleOptions(coverAsset, 'Cover').forEach((option) => addRuleOption(options, option))
  matchingOptionsAsRuleOptions(insideAsset, 'Inside').forEach((option) => addRuleOption(options, option))
  ;(optionSchema || []).forEach((field) => {
    addRuleOption(options, {
      key: field.key,
      label: `Product: ${field.label || field.key}`,
      group: 'Product Options',
      values: (field.allowedValues || []).map((value) => ({ value, label: value })),
    })
  })

  return options.map((option) => {
    const values = [
      ...(option.values || []),
      ...(option.key === 'trim_size'
        ? [shortTrimValue(coverAsset?.coverSize || insideAsset?.insideSize), shortTrimValue(insideAsset?.insideSize || coverAsset?.coverSize)]
            .filter(Boolean)
            .map((value) => ({ value, label: value }))
        : []),
      ...(option.key === 'page_count' && insideAsset?.pageCount
        ? [{ value: String(insideAsset.pageCount), label: `${insideAsset.pageCount} pages` }]
        : []),
      ...(option.key === 'binding_type' && coverAsset?.coverType
        ? [{ value: bindingRuleValue(coverAsset.coverType), label: coverAsset.coverType }]
        : []),
    ]
    return { ...option, values: uniqueByValue(values) }
  })
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
const emptyAssetBatch = () => ({
  name: '',
  coverAssetId: null,
  insidePageAssetId: null,
  rules: [emptyPoolRule()],
  priority: 0,
  enabled: true,
})

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

const normalizeAssetBatchesForForm = (batches = []) =>
  batches
    .filter((batch) => !batch.virtual)
    .map((batch) => ({
      _id: batch._id || batch.id,
      name: batch.name || '',
      coverAssetId: batch.coverAssetId || batch.coverAsset?._id || null,
      insidePageAssetId: batch.insidePageAssetId || batch.insidePageAsset?._id || null,
      rules: (batch.rules?.length ? batch.rules : [emptyPoolRule()]).map((rule) => ({
        key: rule.key || '',
        equals: rule.equals || '',
      })),
      priority: Number(batch.priority || 0),
      enabled: batch.enabled !== false,
      luluPrintSpec: batch.luluPrintSpec || null,
      allowedCoverFinishes: batch.allowedCoverFinishes || [],
    }))

const assetBatchesForPayload = (batches = [], coverFinish = 'MATTE') =>
  batches
    .map((batch) => ({
      _id: batch._id && !String(batch._id).startsWith('variant:') && batch._id !== 'default' ? batch._id : undefined,
      name: String(batch.name || '').trim(),
      coverAssetId: batch.coverAssetId || null,
      insidePageAssetId: batch.insidePageAssetId || null,
      rules: (batch.rules || [])
        .map((rule) => ({
          key: String(rule.key || '').trim(),
          equals: String(rule.equals || '').trim(),
        }))
        .filter((rule) => rule.key && rule.equals),
      priority: Number(batch.priority || 0),
      enabled: batch.enabled !== false,
      luluPrintSpec: batch.luluPrintSpec
        ? { ...batch.luluPrintSpec, coverFinish }
        : undefined,
      allowedCoverFinishes: [coverFinish],
    }))
    .filter((batch) => batch.name && batch.coverAssetId && batch.insidePageAssetId)

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

function ProductBatchCard(props) {
  const { batch, onEditCanvas, canManage } = props
  const coverAsset = batch?.coverAsset || null
  const insideAsset = batch?.insidePageAsset || null
  const batchLabel = batch?.name || 'Product batch'
  const renderPreview = (asset, icon, label, accent, slot) => (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: '#fff',
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          height: 300,
          bgcolor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
            <Typography sx={{ fontWeight: 700, color: '#334155' }}>{label} unavailable</Typography>
            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 240 }}>
              Choose a PDF-based asset for this batch.
            </Typography>
          </Stack>
        )}
      </Box>
      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: accent }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 800 }} noWrap>{asset?.title || `No ${label.toLowerCase()} linked`}</Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }} noWrap>
              {asset?.pageCount ? `${asset.pageCount} page${asset.pageCount === 1 ? '' : 's'}` : 'No PDF pages'}
            </Typography>
          </Box>
          {canManage && asset && (
            <SoftButton
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => onEditCanvas(asset, slot)}
            >
              Edit
            </SoftButton>
          )}
        </Stack>
      </Box>
    </Box>
  )

  return (
    <SoftCard hover={false} sx={{ p: 0, overflow: 'hidden' }}>
      <Box
        sx={{
          px: 2.5,
          py: 2.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: '#f8fafc',
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
          <Box component={DesignServicesOutlinedIcon} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{batchLabel}</Typography>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Cover and inside pages are edited as one matched product unit.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {batch?.virtual && <Chip label="Generated" size="small" />}
          {batch?.enabled === false && <Chip label="Disabled" size="small" color="warning" />}
          {batch?.rules?.length ? <Chip label={`${batch.rules.length} rule${batch.rules.length === 1 ? '' : 's'}`} size="small" /> : <Chip label="Fallback" size="small" />}
        </Stack>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            {renderPreview(coverAsset, DescriptionOutlinedIcon, 'Cover', '#f5f3ff', 'cover')}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {renderPreview(insideAsset, AutoStoriesOutlinedIcon, 'Inside pages', '#ecfeff', 'inside')}
          </Grid>
        </Grid>

        {batch?.rules?.length ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {batch.rules.map((rule, index) => (
              <Chip
                key={`${rule.key || rule.label || index}-${rule.equals || rule.value || index}`}
                label={`${rule.key || rule.label}: ${rule.equals || rule.value}`}
                size="small"
              />
            ))}
          </Stack>
        ) : null}
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
    allowedCoverFinishes: ['MATTE'],
    assetBatches: [],
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
      const selectedFinish = normalizeCoverFinish(
        data.luluPrintSpec?.coverFinish || firstCoverFinish(data.allowedCoverFinishes || [])
      )
      setForm({
        listingId: data.listingId || '',
        title: data.title || '',
        coverAssetId: data.coverAssetId || null,
        insidePageAssetId: data.insidePageAssetId || null,
        luluPrintSpec: { ...normalizeLuluPrintSpec(data.luluPrintSpec), coverFinish: selectedFinish },
        allowedCoverFinishes: [selectedFinish],
        assetBatches: normalizeAssetBatchesForForm(data.assetBatches || []),
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
  const productBatches = useMemo(() => {
    const batches = product?.assetBatches || []
    if (batches.length) return batches
    if (product?.coverAsset || product?.insidePageAsset) {
      return [{
        _id: 'default',
        name: 'Default batch',
        coverAssetId: product.coverAssetId || product.coverAsset?._id || null,
        insidePageAssetId: product.insidePageAssetId || product.insidePageAsset?._id || null,
        coverAsset: product.coverAsset || null,
        insidePageAsset: product.insidePageAsset || null,
        rules: [],
        enabled: true,
        virtual: true,
      }]
    }
    return []
  }, [product])
  const configuredBatchCount = form.assetBatches.length
  const usesAssetBatches = configuredBatchCount > 0
  const hasLegacyAssetPools = form.coverAssetPool.length > 0 || form.insideAssetPool.length > 0
  const usesDynamicAssets = usesAssetBatches || hasLegacyAssetPools
  const selectedCoverFinish = normalizeCoverFinish(form.luluPrintSpec.coverFinish || firstCoverFinish(form.allowedCoverFinishes))
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
    coverFinish: selectedCoverFinish,
  }), [form.luluPrintSpec, luluOptions.bindings, luluOptions.papers, luluOptions.trims, selectedCover, selectedCoverFinish, selectedInside])

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
    if (usesAssetBatches) {
      return {
        isValid: true,
        warnings: ['Lulu package will be resolved per order from the selected product batch.'],
        podPackageIds: {},
      }
    }
    if (hasLegacyAssetPools) {
      return {
        isValid: true,
        warnings: ['This product still has legacy separate pools. Add product batches before using it for mixed cover and inside-page products.'],
        podPackageIds: {},
      }
    }
    if (!selectedCover || !selectedInside) {
      return {
        isValid: false,
        warnings: ['Choose fixed cover and inside-page assets, or add at least one product batch.'],
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
  }, [effectiveLuluPrintSpec, hasLegacyAssetPools, luluOptions.packages, luluOptions.trims, selectedCover, selectedInside, usesAssetBatches])

  const updateProductCoverFinish = (finish) => {
    const nextFinish = normalizeCoverFinish(finish)
    setForm((current) => ({
      ...current,
      allowedCoverFinishes: [nextFinish],
      luluPrintSpec: {
        ...current.luluPrintSpec,
        coverFinish: nextFinish,
      },
      assetBatches: current.assetBatches.map((batch) => ({
        ...batch,
        allowedCoverFinishes: [nextFinish],
        luluPrintSpec: batch.luluPrintSpec
          ? { ...batch.luluPrintSpec, coverFinish: nextFinish }
          : batch.luluPrintSpec,
      })),
    }))
  }

  const updateLuluSpec = (changes) => {
    setForm((current) => ({
      ...current,
      allowedCoverFinishes: changes.coverFinish ? [normalizeCoverFinish(changes.coverFinish)] : current.allowedCoverFinishes,
      luluPrintSpec: {
        ...current.luluPrintSpec,
        ...changes,
        ...(changes.coverFinish ? { coverFinish: normalizeCoverFinish(changes.coverFinish) } : {}),
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

  const addBatch = () => {
    setForm((current) => ({
      ...current,
      assetBatches: [
        ...current.assetBatches,
        {
          ...emptyAssetBatch(),
          name: `Batch ${current.assetBatches.length + 1}`,
        },
      ],
    }))
  }

  const updateBatch = (batchIndex, changes) => {
    setForm((current) => ({
      ...current,
      assetBatches: current.assetBatches.map((batch, index) =>
        index === batchIndex ? { ...batch, ...changes } : batch
      ),
    }))
  }

  const removeBatch = (batchIndex) => {
    setForm((current) => ({
      ...current,
      assetBatches: current.assetBatches.filter((_, index) => index !== batchIndex),
    }))
  }

  const addBatchRule = (batchIndex) => {
    setForm((current) => ({
      ...current,
      assetBatches: current.assetBatches.map((batch, index) =>
        index === batchIndex
          ? { ...batch, rules: [...(batch.rules || []), emptyPoolRule()] }
          : batch
      ),
    }))
  }

  const updateBatchRule = (batchIndex, ruleIndex, key, value) => {
    setForm((current) => ({
      ...current,
      assetBatches: current.assetBatches.map((batch, index) =>
        index === batchIndex
          ? {
              ...batch,
              rules: (batch.rules || []).map((rule, currentRuleIndex) =>
                currentRuleIndex === ruleIndex ? { ...rule, [key]: value } : rule
              ),
            }
          : batch
      ),
    }))
  }

  const removeBatchRule = (batchIndex, ruleIndex) => {
    setForm((current) => ({
      ...current,
      assetBatches: current.assetBatches.map((batch, index) =>
        index === batchIndex
          ? { ...batch, rules: (batch.rules || []).filter((_, currentRuleIndex) => currentRuleIndex !== ruleIndex) }
          : batch
      ),
    }))
  }

  const batchCompatibility = (cover, inside) => {
    if (!cover || !inside) return { label: 'Choose cover and inside', tone: 'warning' }
    const coverTrim = luluOptionCode(cover.coverSize, luluOptions.trims)
    const insideTrim = luluOptionCode(inside.insideSize, luluOptions.trims)
    if (coverTrim && insideTrim && coverTrim !== insideTrim) return { label: 'Size mismatch', tone: 'error' }
    const packages = luluOptions.packages || []
    if (!packages.length) return { label: 'Lulu check pending', tone: 'default' }
    const coverBinding = luluOptionCode(cover.coverType, luluOptions.bindings)
    const insidePaper = luluOptionCode(inside.paperType, luluOptions.papers)
    const matches = packages.some((pkg) =>
      (!coverTrim || pkg.trim === coverTrim) &&
      (!insideTrim || pkg.trim === insideTrim) &&
      (!coverBinding || pkg.binding === coverBinding) &&
      (!inside.interiorColor || pkg.interiorColor === inside.interiorColor) &&
      (!insidePaper || pkg.paper === insidePaper) &&
      (!inside.pageCount || (inside.pageCount >= pkg.minPage && inside.pageCount <= pkg.maxPage))
    )
    return matches ? { label: 'Lulu compatible', tone: 'success' } : { label: 'No Lulu package', tone: 'error' }
  }

  const renderAssetBatches = () => (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: form.assetBatches.length ? 1.5 : 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800 }}>Product Batches</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Pair one cover with one inside-page set, then map that pair with order rules.
          </Typography>
        </Box>
        <SoftButton variant="outlined" startIcon={<AddIcon />} onClick={addBatch}>
          Add Batch
        </SoftButton>
      </Stack>

      <Stack spacing={1.5}>
        {hasLegacyAssetPools && !usesAssetBatches && (
          <Alert severity="warning">
            This product has legacy separate cover and inside-page pools. Add product batches to lock each cover to the correct inside pages.
          </Alert>
        )}

        {!form.assetBatches.length && (
          <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, p: 2, bgcolor: '#f8fafc' }}>
            <Typography sx={{ fontWeight: 800 }}>No batches configured</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Simple products can use the fixed assets above. Add batches when the same product can use different cover and inside-page pairs.
            </Typography>
          </Box>
        )}

        {form.assetBatches.map((batch, batchIndex) => {
          const selectedCoverAsset = coverAssets.find((asset) => asset._id === batch.coverAssetId) || null
          const selectedInsideAsset = insideAssets.find((asset) => asset._id === batch.insidePageAssetId) || null
          const batchStatus = batchCompatibility(selectedCoverAsset, selectedInsideAsset)
          const ruleOptions = batchRuleOptions({
            coverAsset: selectedCoverAsset,
            insideAsset: selectedInsideAsset,
            optionSchema: form.optionSchema,
          })
          return (
            <Box key={batch._id || batchIndex} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5, bgcolor: '#f8fafc' }}>
              <Stack spacing={1.25}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
                  <TextField
                    label="Batch name"
                    value={batch.name}
                    onChange={(event) => updateBatch(batchIndex, { name: event.target.value })}
                    placeholder="A5 matte weekly planner"
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Priority"
                    type="number"
                    value={batch.priority}
                    onChange={(event) => updateBatch(batchIndex, { priority: event.target.value })}
                    sx={{ width: { xs: '100%', md: 120 } }}
                  />
                  <FormControlLabel
                    control={(
                      <Checkbox
                        checked={batch.enabled !== false}
                        onChange={(event) => updateBatch(batchIndex, { enabled: event.target.checked })}
                      />
                    )}
                    label="Enabled"
                  />
                  <Tooltip title="Remove batch">
                    <IconButton color="error" onClick={() => removeBatch(batchIndex)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      options={coverAssets}
                      value={selectedCoverAsset}
                      onChange={(_, value) => updateBatch(batchIndex, { coverAssetId: value?._id || null })}
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
                        <TextField {...params} label="Batch cover" placeholder="Choose cover" fullWidth />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      options={insideAssets}
                      value={selectedInsideAsset}
                      onChange={(_, value) => updateBatch(batchIndex, { insidePageAssetId: value?._id || null })}
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
                        <TextField {...params} label="Batch inside pages" placeholder="Choose inside pages" fullWidth />
                      )}
                    />
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={batchStatus.label}
                    size="small"
                    sx={{
                      bgcolor: batchStatus.tone === 'success' ? '#dcfce7' : batchStatus.tone === 'error' ? '#fee2e2' : batchStatus.tone === 'warning' ? '#fef3c7' : '#e2e8f0',
                      color: batchStatus.tone === 'success' ? '#166534' : batchStatus.tone === 'error' ? '#991b1b' : batchStatus.tone === 'warning' ? '#92400e' : '#334155',
                      fontWeight: 700,
                    }}
                  />
                  {selectedCoverAsset?.coverSize && <Chip label={`Cover ${selectedCoverAsset.coverSize}`} size="small" />}
                  {selectedInsideAsset?.insideSize && <Chip label={`Inside ${selectedInsideAsset.insideSize}`} size="small" />}
                  {selectedInsideAsset?.pageCount ? <Chip label={`${selectedInsideAsset.pageCount} pages`} size="small" /> : null}
                </Stack>

                <Stack spacing={1}>
                  {(batch.rules || []).map((rule, ruleIndex) => {
                    const selectedRuleOption = ruleOptions.find((option) => option.key === rule.key) || null
                    const valueOptions = uniqueByValue(
                      ruleOptions
                        .filter((option) => option.key === rule.key)
                        .flatMap((option) => option.values || [])
                    )
                    const hasLegacyKey = Boolean(rule.key && !selectedRuleOption)
                    const hasCustomValue = Boolean(rule.equals && valueOptions.length && !valueOptions.some((option) => option.value === rule.equals))
                    const valueHelperText = !rule.key
                      ? 'Choose an order option first.'
                      : hasCustomValue
                        ? 'Custom value. Choose a suggested value or keep typing.'
                        : valueOptions.length
                          ? 'Choose a suggested value or type a custom one.'
                          : 'No fixed values for this option; type the required value.'
                    let lastGroup = ''
                    return (
                      <Stack key={ruleIndex} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <TextField
                          select
                          label="Order option"
                          value={rule.key}
                          onChange={(event) => {
                            updateBatchRule(batchIndex, ruleIndex, 'key', event.target.value)
                            updateBatchRule(batchIndex, ruleIndex, 'equals', '')
                          }}
                          helperText={hasLegacyKey ? 'Legacy key no longer matches this asset pair.' : 'Choose from this product and the selected assets.'}
                          fullWidth
                        >
                          <MenuItem value="">Select option</MenuItem>
                          {hasLegacyKey && <MenuItem value={rule.key}>Legacy: {rule.key}</MenuItem>}
                          {ruleOptions.map((option) => {
                            const header = option.group !== lastGroup
                            lastGroup = option.group
                            return [
                              header ? <MenuItem key={`${option.group}-header`} disabled>{option.group}</MenuItem> : null,
                              <MenuItem key={`${option.group}-${option.key}`} value={option.key}>{option.label}</MenuItem>,
                            ]
                          })}
                        </TextField>
                        <Autocomplete
                          freeSolo
                          options={valueOptions}
                          value={rule.equals || ''}
                          inputValue={rule.equals || ''}
                          onChange={(_, option) => {
                            const nextValue = typeof option === 'string' ? option : option?.value || ''
                            updateBatchRule(batchIndex, ruleIndex, 'equals', nextValue)
                          }}
                          onInputChange={(_, value, reason) => {
                            if (reason === 'reset') return
                            updateBatchRule(batchIndex, ruleIndex, 'equals', value)
                          }}
                          getOptionLabel={(option) => (typeof option === 'string' ? option : option.label || option.value || '')}
                          isOptionEqualToValue={(option, value) => option.value === (typeof value === 'string' ? value : value?.value)}
                          disabled={!rule.key}
                          fullWidth
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Required value"
                              helperText={valueHelperText}
                              placeholder={valueOptions.length ? 'Choose or type value' : 'Type required value'}
                              fullWidth
                            />
                          )}
                        />
                        <Tooltip title="Remove rule">
                          <IconButton color="error" onClick={() => removeBatchRule(batchIndex, ruleIndex)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )
                  })}
                </Stack>

                <SoftButton variant="outlined" startIcon={<AddIcon />} onClick={() => addBatchRule(batchIndex)}>
                  Add Rule
                </SoftButton>
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </Box>
  )

  const openAssetEditor = (asset, slot, batch = null) => {
    if (!asset) return
    setEditorState({ asset, slot, batchId: batch?._id || batch?.id || '', batchName: batch?.name || '' })
  }

  const handleAssetSaved = (savedAsset) => {
    setEditorState((current) => current ? { ...current, asset: savedAsset } : null)
    setCoverAssets((current) => current.map((item) => (item._id === savedAsset._id ? savedAsset : item)))
    setInsideAssets((current) => current.map((item) => (item._id === savedAsset._id ? savedAsset : item)))
    setProduct((current) => {
      if (!current) return current
      const updatedBatches = (current.assetBatches || []).map((batch) => {
        const batchId = String(batch._id || batch.id || '')
        if (!editorState?.batchId || batchId !== String(editorState.batchId)) return batch
        if (editorState.slot === 'cover') {
          return { ...batch, coverAsset: savedAsset, coverAssetId: savedAsset._id }
        }
        if (editorState.slot === 'inside') {
          return { ...batch, insidePageAsset: savedAsset, insidePageAssetId: savedAsset._id }
        }
        return batch
      })
      if (editorState?.slot === 'cover') {
        return {
          ...current,
          assetBatches: updatedBatches,
          coverAsset: savedAsset,
          coverImageUrl: savedAsset.imageUrl || current.coverImageUrl,
        }
      }
      if (editorState?.slot === 'inside') {
        return {
          ...current,
          assetBatches: updatedBatches,
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
    const productCoverFinish = selectedCoverFinish
    const payloadBatches = assetBatchesForPayload(form.assetBatches, productCoverFinish)
    if (form.assetBatches.length && !payloadBatches.length) {
      setError('Complete at least one product batch with a name, cover asset, and inside-page asset.')
      return
    }
    const hasBatchSource = payloadBatches.length > 0
    const hasCoverSource = Boolean(hasBatchSource || form.coverAssetId || form.coverAssetPool.length)
    const hasInsideSource = Boolean(hasBatchSource || form.insidePageAssetId || form.insideAssetPool.length)
    if (!form.title.trim() || !hasCoverSource || !hasInsideSource) {
      setError('Product title and at least one fixed asset pair or product batch are required')
      return
    }
    if (!compatibility.isValid) {
      setError(compatibility.warnings.join(' '))
      return
    }

    setSaving(true)
    setError('')
    const usesLegacyCoverPool = !hasBatchSource && form.coverAssetPool.length > 0
    const usesLegacyInsidePool = !hasBatchSource && form.insideAssetPool.length > 0
    const useDynamicPayload = hasBatchSource || usesLegacyCoverPool || usesLegacyInsidePool
    const luluPrintSpec = useDynamicPayload ? undefined : {
      ...effectiveLuluPrintSpec,
      coverFinish: productCoverFinish,
      pageCount: Number(effectiveLuluPrintSpec.pageCount || 0),
      podPackageId: compatibility.podPackageIds[productCoverFinish] || '',
    }
    const commonPayload = {
      title: form.title.trim(),
      coverAssetId: hasBatchSource || usesLegacyCoverPool ? null : form.coverAssetId || null,
      insidePageAssetId: hasBatchSource || usesLegacyInsidePool ? null : form.insidePageAssetId || null,
      luluPrintSpec: useDynamicPayload ? null : luluPrintSpec,
      podPackageId: useDynamicPayload ? null : luluPrintSpec.podPackageId,
      allowedCoverFinishes: [productCoverFinish],
      assetBatches: payloadBatches,
      coverAssetPool: hasBatchSource ? [] : assetPoolForPayload(form.coverAssetPool),
      insideAssetPool: hasBatchSource ? [] : assetPoolForPayload(form.insideAssetPool),
      optionSchema: form.optionSchema,
      templatePool: form.templatePool,
      printProfileRules: form.printProfileRules,
      variants: variantsForPayload(form.variants),
    }
    try {
      if (isEditMode && product?._id) {
        const { data } = await api.patch(`/products/${product._id}`, {
          ...commonPayload,
        })
        navigate(`/product-library-2/product/${data._id}/designer`)
        return
      }

      const payload = {
        ...commonPayload,
        listingId: form.listingId.trim(),
        storeId: activeStore?._id,
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
        productBatchId={editorState.batchId}
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
                    const configuredBatches = (item.assetBatches || []).filter((batch) => !batch.virtual)
                    const batchCount = configuredBatches.length
                    const needsBatchSetup = !batchCount && (coverPoolCount > 1 || insidePoolCount > 1 || (coverPoolCount && insidePoolCount))
                    const hasCoverSource = Boolean(batchCount || item.coverAssetId || coverPoolCount)
                    const hasInsideSource = Boolean(batchCount || item.insidePageAssetId || insidePoolCount)
                    const ready = hasCoverSource && hasInsideSource && !needsBatchSetup
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
                        <Typography sx={{ fontWeight: 700 }}>{batchCount ? `${batchCount} product batch${batchCount === 1 ? '' : 'es'}` : coverPoolCount ? `${coverPoolCount} legacy cover asset${coverPoolCount === 1 ? '' : 's'}` : item.coverAsset?.title || 'Not linked'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {batchCount ? 'Batch paired' : item.coverAsset?.pageCount ? `${item.coverAsset.pageCount} page${item.coverAsset.pageCount === 1 ? '' : 's'}` : coverPoolCount ? 'Needs batch setup' : 'Select a cover asset'}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Typography sx={{ fontWeight: 700 }}>{batchCount ? `${batchCount} product batch${batchCount === 1 ? '' : 'es'}` : insidePoolCount ? `${insidePoolCount} legacy inside asset${insidePoolCount === 1 ? '' : 's'}` : item.insidePageAsset?.title || 'Not linked'}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {batchCount ? 'Batch paired' : item.insidePageAsset?.pageCount ? `${item.insidePageAsset.pageCount} page${item.insidePageAsset.pageCount === 1 ? '' : 's'}` : insidePoolCount ? 'Needs batch setup' : 'Select inside pages'}
                        </Typography>
                      </SoftTableCell>
                      <SoftTableCell>
                        <Chip
                          label={needsBatchSetup ? 'Needs batch setup' : ready ? 'Ready' : 'Incomplete'}
                          size="small"
                          sx={{
                            bgcolor: ready ? '#dcfce7' : '#fef3c7',
                            color: ready ? '#166534' : '#92400e',
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
    const legacyCoverPoolCount = product.coverAssetPool?.length || 0
    const legacyInsidePoolCount = product.insideAssetPool?.length || 0
    const needsBatchSetup = !productBatches.length && (legacyCoverPoolCount || legacyInsidePoolCount)
    return (
      <Box>
        <SoftPageHeader
          title={`${product.title} Designer`}
          subtitle="Open a specific product batch so cover and inside-page coordinates stay paired."
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
                label={productBatches.length ? `${productBatches.length} product batch${productBatches.length === 1 ? '' : 'es'}` : product.coverAsset?.title || 'Cover missing'}
                size="small"
              />
              <Chip
                label={needsBatchSetup ? 'Needs batch setup' : product.insidePageAsset?.title || 'Inside pages paired by batch'}
                size="small"
              />
            </Stack>
          </Stack>
        </SoftCard>

        {needsBatchSetup ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            This product still has legacy separate asset pools. Add product batches before editing mixed cover and inside-page combinations.
          </Alert>
        ) : null}

        {productBatches.length ? (
          <Stack spacing={3}>
            {productBatches.map((batch) => (
              <ProductBatchCard
                key={batch._id || batch.id || batch.name}
                batch={batch}
                onEditCanvas={(asset, slot) => openAssetEditor(asset, slot, batch)}
                canManage={canManage}
              />
            ))}
          </Stack>
        ) : (
          <SoftEmptyState
            icon={DesignServicesOutlinedIcon}
            title="No product batches"
            description="Edit the product and add at least one batch that pairs a cover asset with an inside-page asset."
            action={canManage ? (
              <SoftButton variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/product-library-2/product/${product._id}/edit`)}>
                Edit Product
              </SoftButton>
            ) : null}
          />
        )}
      </Box>
    )
  }

  return (
    <Box>
      <SoftPageHeader
        title={isCreateMode ? 'Create New Product' : 'Edit Product'}
        subtitle="Set a simple fixed pair, or add product batches when cover and inside-page assets vary by order."
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

                {!usesDynamicAssets && (
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
                        helperText="Used for simple products with one cover and one inside-page set."
                        fullWidth
                      />
                    )}
                  />
                )}

                {!usesDynamicAssets && (
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
                        helperText="Used for simple products with one cover and one inside-page set."
                        fullWidth
                      />
                    )}
                  />
                )}

                {renderAssetBatches()}

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: form.variants.length ? 1.5 : 0 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>Etsy Variants</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Advanced legacy overrides for true sellable Etsy packages. Use Product Batches for cover and inside-page pairing.
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

                {usesDynamicAssets ? (
                  <Alert severity="info">
                    Batch-backed orders resolve size, binding, page count, paper, and Lulu package from the matched cover and inside-page pair.
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
                          value={selectedCoverFinish}
                          onChange={(event) => updateProductCoverFinish(event.target.value)}
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
                  <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Product Cover Finish</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                    This product uses one cover finish for every fixed asset and product batch.
                  </Typography>
                  <TextField
                    select
                    label="Cover finish"
                    value={selectedCoverFinish}
                    onChange={(event) => updateProductCoverFinish(event.target.value)}
                    fullWidth
                  >
                    {FINISH_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Alert severity={compatibility.isValid ? 'success' : 'warning'}>
                  {compatibility.isValid
                    ? (Object.keys(compatibility.podPackageIds).length
                      ? `Valid Lulu package for ${Object.keys(compatibility.podPackageIds).join(' and ')} finish.`
                      : compatibility.warnings[0])
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
              {usesAssetBatches ? (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '1.1rem', p: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>Product Batches</Typography>
                  <Stack spacing={1.25}>
                    {form.assetBatches.map((batch, index) => {
                      const cover = coverAssets.find((asset) => asset._id === batch.coverAssetId)
                      const inside = insideAssets.find((asset) => asset._id === batch.insidePageAssetId)
                      return (
                        <Box key={batch._id || index} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: '#f8fafc' }}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>{batch.name || `Batch ${index + 1}`}</Typography>
                          <Typography variant="body2" sx={{ color: '#64748b' }} noWrap>
                            {cover?.title || 'No cover'} + {inside?.title || 'No inside pages'}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>
              ) : (
                <>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '1.1rem', p: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>Cover</Typography>
                    {hasLegacyAssetPools ? (
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Legacy cover pool configured. Add Product Batches to pair assets explicitly.
                      </Typography>
                    ) : selectedCover ? (
                      <AssetOptionCard option={selectedCover} icon={DescriptionOutlinedIcon} />
                    ) : (
                      <Typography variant="body2" sx={{ color: '#64748b' }}>No cover asset selected yet.</Typography>
                    )}
                  </Box>

                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '1.1rem', p: 1.5 }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>Inside Pages</Typography>
                    {hasLegacyAssetPools ? (
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Legacy inside-page pool configured. Add Product Batches to pair assets explicitly.
                      </Typography>
                    ) : selectedInside ? (
                      <AssetOptionCard option={selectedInside} icon={AutoStoriesOutlinedIcon} />
                    ) : (
                      <Typography variant="body2" sx={{ color: '#64748b' }}>No inside-page asset selected yet.</Typography>
                    )}
                  </Box>
                </>
              )}
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {compatibility.isValid
                ? (Object.keys(compatibility.podPackageIds).length
                  ? Object.entries(compatibility.podPackageIds).map(([finish, id]) => `${finish}: ${id}`).join(' / ')
                  : compatibility.warnings.join(' '))
                : compatibility.warnings.join(' ')}
            </Typography>
          </SoftCard>
        </Grid>
      </Grid>
    </Box>
  )
}
