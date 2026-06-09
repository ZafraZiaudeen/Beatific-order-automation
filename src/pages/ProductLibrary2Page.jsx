import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TableContainer from '@mui/material/TableContainer'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import GridViewIcon from '@mui/icons-material/GridViewOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import ListIcon from '@mui/icons-material/ViewListOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import api from '../lib/api'
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  flattenCategoryTree,
  formatCategoryTrail,
  getCategoryIconComponent,
  getCategoryOptionLabel,
} from '../lib/productLibraryCategories'
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

const UNCATEGORIZED_ID = 'uncategorized'

const CATEGORY_CONFIG = {
  cover: {
    key: 'cover',
    path: '/product-library-2/cover',
    title: 'Cover Assets',
    shortTitle: 'Cover',
    description: 'Browse and manage your reusable cover designs.',
    dashboardDescription: 'Manage all front and back cover designs, images, and assets used across your products.',
    addLabel: 'Upload New Cover',
    idPrefix: 'C',
    itemIdLabel: 'Cover ID',
    nameLabel: 'Design Name',
    itemLabel: 'cover asset',
    allLabel: 'All Covers',
    icon: DescriptionOutlinedIcon,
    defaultView: 'grid',
  },
  'inside-page': {
    key: 'inside-page',
    path: '/product-library-2/inside-page',
    title: 'Inside Pages',
    shortTitle: 'Inside Pages',
    description: 'Browse and manage your reusable inside page layouts.',
    dashboardDescription: 'Organize and manage page templates and layouts for your publications.',
    addLabel: 'Add Inside Page',
    idPrefix: 'P',
    itemIdLabel: 'Inside ID',
    nameLabel: 'Layout Name',
    itemLabel: 'inside page',
    allLabel: 'All Inside Pages',
    icon: AutoStoriesOutlinedIcon,
    defaultView: 'list',
  },
  product: {
    key: 'product',
    path: '/product-library-2/product',
    title: 'Products (The Junction)',
    shortTitle: 'Products',
    description: 'Browse products grouped by your managed product categories.',
    dashboardDescription: 'Browse and manage products synced from The Junction, including specifications and SKUs.',
    addLabel: 'Manage Products',
    idPrefix: 'J',
    itemIdLabel: 'Listing ID',
    nameLabel: 'Product Name',
    itemLabel: 'product',
    allLabel: 'All Products',
    icon: Inventory2OutlinedIcon,
    defaultView: 'list',
  },
}

const CATEGORIES = [CATEGORY_CONFIG.cover, CATEGORY_CONFIG['inside-page'], CATEGORY_CONFIG.product]

const EMPTY_LULU_OPTIONS = {
  trims: [],
  bindings: [],
  interiorColors: [],
  printQualities: [],
  papers: [],
  coverFinishes: [],
  packages: [],
}

const luluOptionCode = (value, options = []) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return options.find((option) => option.value === text || option.label === text)?.value || text
}

const luluOptionLabel = (value, options = []) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return options.find((option) => option.value === text || option.label === text)?.label || text
}

const formatLibraryId = (category, index) => `${category.idPrefix}-${String(index + 1).padStart(2, '0')}`

const pageSizeInches = (item) => {
  if (!item?.pageWidth || !item?.pageHeight) return 'Not imported'
  return `${(item.pageWidth / 72).toFixed(2)} x ${(item.pageHeight / 72).toFixed(2)} in`
}

const buildCategoryForm = (section, parentId = null) => ({
  id: null,
  section,
  parentId,
  name: '',
  description: '',
  color: CATEGORY_COLOR_OPTIONS[0].value,
  icon: 'folder',
  sortOrder: 0,
})

const emptyMatchingOption = () => ({ label: '', value: '' })

const normalizeMatchingOptionsForForm = (options = []) =>
  options
    .map((option) => ({
      label: String(option?.label || ''),
      value: String(option?.value || ''),
    }))
    .filter((option) => option.label || option.value)

const matchingOptionsForPayload = (options = []) =>
  options
    .map((option) => ({
      label: option.label.trim(),
      value: option.value.trim(),
    }))
    .filter((option) => option.label && option.value)

function CategoryBadge({ trail }) {
  if (!trail?.length) {
    return <Chip label="Uncategorized" size="small" sx={{ alignSelf: 'flex-start', bgcolor: '#f1f5f9', color: '#475569' }} />
  }

  const last = trail[trail.length - 1]
  return (
    <Chip
      label={formatCategoryTrail(trail)}
      size="small"
      sx={{
        alignSelf: 'flex-start',
        bgcolor: `${last.color}18`,
        color: last.color,
        fontWeight: 600,
      }}
    />
  )
}

function CategoryDashboardCard({ category, count, loading }) {
  const navigate = useNavigate()
  const Icon = category.icon

  return (
    <SoftCard
      onClick={() => navigate(category.path)}
      sx={{ minHeight: 420, p: { xs: 3, md: 4 }, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
    >
      <Box sx={{ width: 168, height: 168, borderRadius: '50%', bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 4, overflow: 'hidden' }}>
        <Box component="img" src={placeholderImage} alt="" sx={{ width: '78%', height: '78%', objectFit: 'contain' }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f1f44', mb: 2, lineHeight: 1.2 }}>
        {category.title}
      </Typography>
      <Typography sx={{ color: '#667085', fontSize: '1rem', lineHeight: 1.7, mb: 3 }}>
        {category.dashboardDescription}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Divider sx={{ mb: 2.5 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '0.75rem', bgcolor: '#eff6ff', color: '#0b5fc0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon sx={{ fontSize: 26 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: '#0b5fc0', fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.1 }}>
            {loading ? <Skeleton width={64} /> : count.toLocaleString()}
          </Typography>
          <Typography sx={{ color: '#667085', fontWeight: 500 }}>Items</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <ArrowForwardIosIcon sx={{ color: '#0b5fc0', fontSize: 28 }} />
      </Box>
    </SoftCard>
  )
}

function CategoryFormFields({ form, setForm, categoryOptions, disableParentIds = [] }) {
  const parentOptions = categoryOptions.filter((option) => !disableParentIds.includes(option._id))
  const selectedColor = CATEGORY_COLOR_OPTIONS.find((option) => option.value === form.color) || CATEGORY_COLOR_OPTIONS[0]
  const selectedIcon = CATEGORY_ICON_OPTIONS.find((option) => option.value === form.icon) || CATEGORY_ICON_OPTIONS[0]

  return (
    <Stack spacing={2.25}>
      <TextField
        label="Category Name"
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        fullWidth
        required
      />
      <TextField
        label="Description"
        value={form.description}
        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
        multiline
        minRows={3}
        fullWidth
      />
      <Autocomplete
        options={[{ _id: '', trailLabel: 'No parent (root)' }, ...parentOptions]}
        value={parentOptions.find((option) => option._id === form.parentId) || { _id: '', trailLabel: 'No parent (root)' }}
        onChange={(_, value) => setForm((current) => ({ ...current, parentId: value?._id || null }))}
        getOptionLabel={(option) => option.trailLabel || getCategoryOptionLabel(option)}
        isOptionEqualToValue={(option, value) => option._id === value._id}
        renderInput={(params) => <TextField {...params} label="Parent Category" fullWidth />}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="Color"
            value={form.color}
            onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            fullWidth
          >
            {CATEGORY_COLOR_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box sx={{ width: 18, height: 18, borderRadius: '0.45rem', bgcolor: option.value }} />
                  <Typography>{option.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.75, display: 'block' }}>
            Selected: {selectedColor.label}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            label="Icon"
            value={form.icon}
            onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
            fullWidth
          >
            {CATEGORY_ICON_OPTIONS.map((option) => {
              const Icon = option.Icon
              return (
                <MenuItem key={option.value} value={option.value}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <Icon fontSize="small" />
                    <Typography>{option.label}</Typography>
                  </Stack>
                </MenuItem>
              )
            })}
          </TextField>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.75, display: 'block' }}>
            Selected: {selectedIcon.label}
          </Typography>
        </Grid>
      </Grid>
    </Stack>
  )
}

function CategoryQuickAddDialog({ open, form, setForm, categoryOptions, saving, error, onClose, onSave, disableParentIds = [] }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{form.id ? 'Edit Category' : 'Add Category'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <CategoryFormFields form={form} setForm={setForm} categoryOptions={categoryOptions} disableParentIds={disableParentIds} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <SoftButton onClick={onClose} color="dark" variant="outlined">Cancel</SoftButton>
        <SoftButton onClick={onSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={18} /> : form.id ? 'Update Category' : 'Save Category'}
        </SoftButton>
      </DialogActions>
    </Dialog>
  )
}

function CategoryTreeNode({
  node,
  depth,
  selectedCategoryId,
  expandedIds,
  toggleExpanded,
  onSelect,
  onAddChild,
  canDrag,
  draggingId,
  dragOverId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const isExpanded = expandedIds[node._id] !== false
  const isActive = selectedCategoryId === node._id
  const hasChildren = Boolean(node.children?.length)
  const categoryIconComponent = getCategoryIconComponent(node.icon)
  const isDragging = draggingId === node._id
  const isDropTarget = dragOverId === node._id

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        draggable={canDrag}
        onDragStart={(event) => onDragStart(event, node._id)}
        onDragEnd={onDragEnd}
        onDragOver={(event) => onDragOver(event, node._id)}
        onDrop={(event) => onDrop(event, node._id)}
        sx={{
          pl: 1.25 + depth * 2,
          pr: 1,
          py: 1,
          borderRadius: '0.85rem',
          bgcolor: isActive ? '#eff6ff' : 'transparent',
          borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent',
          opacity: isDragging ? 0.45 : 1,
          outline: isDropTarget ? '2px dashed #2563eb' : 'none',
          outlineOffset: 2,
          cursor: canDrag ? 'grab' : 'default',
          transition: 'all 0.15s ease',
          '&:hover': { bgcolor: '#f8fafc' },
        }}
      >
        <Box sx={{ width: 20, display: 'flex', justifyContent: 'center' }}>
          {hasChildren ? (
            <IconButton size="small" onClick={() => toggleExpanded(node._id)} sx={{ p: 0.25 }}>
              <ArrowDropDownIcon sx={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '0.2s' }} />
            </IconButton>
          ) : null}
        </Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          onClick={() => onSelect(node._id)}
          sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <Box sx={{ width: 30, height: 30, borderRadius: '0.7rem', bgcolor: `${node.color}18`, color: node.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Box component={categoryIconComponent} sx={{ fontSize: 20 }} />
          </Box>
          <Typography sx={{ fontWeight: isActive ? 700 : 500, color: '#0f172a', flex: 1, minWidth: 0 }} noWrap>
            {node.name}
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>{node.count}</Typography>
        </Stack>
        {onAddChild && (
          <Tooltip title="Add child category">
            <IconButton size="small" onClick={() => onAddChild(node)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      {hasChildren && isExpanded && (
        <Box sx={{ mt: 0.25 }}>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child._id}
              node={child}
              depth={depth + 1}
              selectedCategoryId={selectedCategoryId}
              expandedIds={expandedIds}
              toggleExpanded={toggleExpanded}
              onSelect={onSelect}
              onAddChild={onAddChild}
              canDrag={canDrag}
              draggingId={draggingId}
              dragOverId={dragOverId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

function CategorySidebar({
  section,
  tree,
  uncategorizedCount,
  selectedCategoryId,
  onSelect,
  onAddCategory,
  canManage,
  onMoveCategory,
}) {
  const [expandedIds, setExpandedIds] = useState({})
  const [draggingId, setDraggingId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [dragOverRoot, setDragOverRoot] = useState(false)
  const canDrag = canManage && typeof onMoveCategory === 'function'
  const defaultExpandedIds = useMemo(() => {
    const next = {}
    const visit = (node) => {
      if (node.children?.length) next[node._id] = true
      node.children?.forEach(visit)
    }
    tree.forEach(visit)
    return next
  }, [tree])

  const resolvedExpandedIds = useMemo(
    () => ({ ...defaultExpandedIds, ...expandedIds }),
    [defaultExpandedIds, expandedIds]
  )

  const toggleExpanded = (id) => {
    setExpandedIds((current) => {
      const currentValue = current[id] ?? defaultExpandedIds[id] ?? false
      return { ...current, [id]: !currentValue }
    })
  }

  const nodeMap = useMemo(() => {
    const map = new Map()
    const visit = (node) => {
      map.set(node._id, node)
      ;(node.children || []).forEach(visit)
    }
    tree.forEach(visit)
    return map
  }, [tree])

  const childrenByParent = useMemo(() => {
    const map = new Map()
    const ensure = (key) => {
      if (!map.has(key)) map.set(key, [])
      return map.get(key)
    }
    const visit = (nodes, parentId = null) => {
      const bucket = ensure(parentId)
      nodes.forEach((node) => {
        bucket.push(node)
        visit(node.children || [], node._id)
      })
    }
    visit(tree, null)
    return map
  }, [tree])

  const invalidDropIds = useMemo(() => {
    if (!draggingId) return new Set()
    const root = nodeMap.get(draggingId)
    const ids = new Set()
    const visit = (node) => {
      if (!node) return
      ids.add(node._id)
      ;(node.children || []).forEach(visit)
    }
    visit(root)
    return ids
  }, [draggingId, nodeMap])

  const getNextSortOrder = (parentId) => {
    const siblings = childrenByParent.get(parentId || null) || []
    const maxSortOrder = siblings.reduce((max, node) => Math.max(max, Number(node.sortOrder || 0)), -1)
    return maxSortOrder + 1
  }

  const resetDragState = () => {
    setDraggingId(null)
    setDragOverId(null)
    setDragOverRoot(false)
  }

  const handleDragStart = (event, id) => {
    if (!canDrag) return
    setDraggingId(id)
    setDragOverId(null)
    setDragOverRoot(false)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  const handleDragEnd = () => {
    resetDragState()
  }

  const handleDragOver = (event, id) => {
    if (!canDrag || !draggingId || invalidDropIds.has(id)) return
    event.preventDefault()
    if (dragOverId !== id) setDragOverId(id)
    setDragOverRoot(false)
  }

  const handleDropOnNode = async (event, id) => {
    if (!canDrag || !draggingId || invalidDropIds.has(id)) return
    event.preventDefault()
    const nextSortOrder = getNextSortOrder(id)
    const moveId = draggingId
    resetDragState()
    await onMoveCategory?.({ categoryId: moveId, parentId: id, sortOrder: nextSortOrder })
  }

  const handleRootDragOver = (event) => {
    if (!canDrag || !draggingId) return
    event.preventDefault()
    setDragOverRoot(true)
    setDragOverId(null)
  }

  const handleRootDrop = async (event) => {
    if (!canDrag || !draggingId) return
    event.preventDefault()
    const nextSortOrder = getNextSortOrder(null)
    const moveId = draggingId
    resetDragState()
    await onMoveCategory?.({ categoryId: moveId, parentId: null, sortOrder: nextSortOrder })
  }

  return (
    <SoftCard hover={false} sx={{ p: 0, overflow: 'hidden', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Categories</Typography>
        {canManage && (
          <Tooltip title="Add category">
            <IconButton onClick={() => onAddCategory(null)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Stack spacing={0.5} sx={{ p: 1.5 }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          onClick={() => onSelect('')}
          onDragOver={handleRootDragOver}
          onDrop={handleRootDrop}
          onDragLeave={() => setDragOverRoot(false)}
          sx={{
            px: 1.5,
            py: 1.15,
            borderRadius: '0.85rem',
            cursor: 'pointer',
            bgcolor: dragOverRoot || selectedCategoryId === '' ? '#eff6ff' : 'transparent',
            borderLeft: dragOverRoot || selectedCategoryId === '' ? '3px solid #2563eb' : '3px solid transparent',
          }}
        >
          <FolderOpenOutlinedIcon sx={{ color: '#2563eb' }} />
          <Typography sx={{ fontWeight: selectedCategoryId === '' ? 700 : 500, flex: 1 }}>{section.allLabel}</Typography>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          onClick={() => onSelect(UNCATEGORIZED_ID)}
          sx={{
            px: 1.5,
            py: 1.15,
            borderRadius: '0.85rem',
            cursor: 'pointer',
            bgcolor: selectedCategoryId === UNCATEGORIZED_ID ? '#fff7ed' : 'transparent',
            borderLeft: selectedCategoryId === UNCATEGORIZED_ID ? '3px solid #f97316' : '3px solid transparent',
          }}
        >
          <DescriptionOutlinedIcon sx={{ color: '#f97316' }} />
          <Typography sx={{ fontWeight: selectedCategoryId === UNCATEGORIZED_ID ? 700 : 500, flex: 1 }}>Uncategorized</Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>{uncategorizedCount}</Typography>
        </Stack>
        <Divider sx={{ my: 0.75 }} />
        {tree.length === 0 ? (
          <Typography sx={{ color: '#94a3b8', px: 1.25, py: 1 }}>No categories yet.</Typography>
        ) : (
          tree.map((node) => (
            <CategoryTreeNode
              key={node._id}
              node={node}
              depth={0}
              selectedCategoryId={selectedCategoryId}
              expandedIds={resolvedExpandedIds}
              toggleExpanded={toggleExpanded}
              onSelect={onSelect}
              onAddChild={canManage ? onAddCategory : null}
              canDrag={canDrag}
              draggingId={draggingId}
              dragOverId={dragOverId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDropOnNode}
            />
          ))
        )}
      </Stack>
    </SoftCard>
  )
}

function LibraryItemDialog({ open, category, item, activeStore, categoryOptions, onClose, onSaved }) {
  const isCoverCategory = category === 'cover'
  const isInsideCategory = category === 'inside-page'
  const [form, setForm] = useState({
    category,
    storeId: activeStore?._id || null,
    categoryId: null,
    title: '',
    description: '',
    coverColor: '',
    coverType: '',
    coverSize: '',
    interiorColor: '',
    paperType: '',
    insideSize: '',
    pageCount: '',
    matchingOptions: [],
    imageUrl: '',
    tags: '',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [luluOptions, setLuluOptions] = useState(EMPTY_LULU_OPTIONS)

  useEffect(() => {
    if (!open) return
    setForm({
      category,
      storeId: activeStore?._id || null,
      categoryId: item?.categoryId || null,
      title: item?.title || '',
      description: item?.description || '',
      coverColor: item?.coverColor || '',
      coverType: item?.coverType || '',
      coverSize: item?.coverSize || '',
      interiorColor: item?.interiorColor || '',
      paperType: item?.paperType || '',
      insideSize: item?.insideSize || '',
      pageCount: item?.pageCount ? String(item.pageCount) : '',
      matchingOptions: normalizeMatchingOptionsForForm(item?.matchingOptions),
      imageUrl: item?.imageUrl || '',
      tags: item?.tags?.join(', ') || '',
      status: item?.status || 'active',
    })
    setError('')
  }, [activeStore, category, item, open])

  useEffect(() => {
    if (!open) return
    api.get('/product-library-v2/lulu-options')
      .then(({ data }) => setLuluOptions({ ...EMPTY_LULU_OPTIONS, ...(data || {}) }))
      .catch(() => setLuluOptions(EMPTY_LULU_OPTIONS))
  }, [open])

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const addMatchingOption = () => setForm((current) => ({
    ...current,
    matchingOptions: [...current.matchingOptions, emptyMatchingOption()],
  }))
  const updateMatchingOption = (index, key, value) => setForm((current) => ({
    ...current,
    matchingOptions: current.matchingOptions.map((option, optionIndex) =>
      optionIndex === index ? { ...option, [key]: value } : option
    ),
  }))
  const removeMatchingOption = (index) => setForm((current) => ({
    ...current,
    matchingOptions: current.matchingOptions.filter((_, optionIndex) => optionIndex !== index),
  }))

  const luluPackages = luluOptions.packages || []
  const pageCount = Number(form.pageCount || item?.pageCount || 0)
  const packageMatches = (pkg, values = {}) => (
    (!values.trim || pkg.trim === values.trim) &&
    (!values.binding || pkg.binding === values.binding) &&
    (!values.interiorColor || pkg.interiorColor === values.interiorColor) &&
    (!values.paper || pkg.paper === values.paper) &&
    (!pageCount || (pageCount >= pkg.minPage && pageCount <= pkg.maxPage))
  )
  const filterOptions = (options, field, values) => {
    const allowed = new Set(luluPackages.filter((pkg) => packageMatches(pkg, values)).map((pkg) => pkg[field]))
    return options.filter((option) => allowed.has(option.value))
  }
  const legacyOption = (value, options) => (
    value && !options.some((option) => option.value === value || option.label === value)
      ? <MenuItem value={value}>Legacy: {value}</MenuItem>
      : null
  )
  const coverBindingOptions = filterOptions(luluOptions.bindings, 'binding', {
    trim: luluOptionCode(form.coverSize, luluOptions.trims),
  })
  const insideColorOptions = filterOptions(luluOptions.interiorColors, 'interiorColor', {
    trim: luluOptionCode(form.insideSize, luluOptions.trims),
    paper: luluOptionCode(form.paperType, luluOptions.papers),
  })
  const paperOptions = filterOptions(luluOptions.papers, 'paper', {
    trim: luluOptionCode(form.insideSize, luluOptions.trims),
    interiorColor: form.interiorColor,
  })

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError('')
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      ...(isCoverCategory ? { coverColor: form.coverColor.trim() || null } : {}),
      ...(isCoverCategory
        ? {
            coverType: luluOptionLabel(form.coverType, luluOptions.bindings) || null,
            coverSize: luluOptionLabel(form.coverSize, luluOptions.trims) || null,
          }
        : {}),
      ...(isInsideCategory
        ? {
            interiorColor: form.interiorColor.trim() || null,
            paperType: luluOptionLabel(form.paperType, luluOptions.papers) || null,
            insideSize: luluOptionLabel(form.insideSize, luluOptions.trims) || null,
            pageCount: Number(form.pageCount || 0),
          }
        : {}),
      matchingOptions: matchingOptionsForPayload(form.matchingOptions),
      imageUrl: form.imageUrl.trim() || null,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    }

    try {
      const { data } = item?._id
        ? await api.patch(`/product-library-v2/items/${item._id}`, payload)
        : await api.post('/product-library-v2/items', payload)
      onSaved(data, { openDetail: !item?._id })
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save library item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {item ? 'Edit Library Item' : `Add ${CATEGORY_CONFIG[category]?.itemLabel || 'item'}`}
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Title" value={form.title} onChange={set('title')} required fullWidth />
        <TextField label="Description" value={form.description} onChange={set('description')} multiline minRows={3} fullWidth />
        {isCoverCategory && (
          <TextField
            label="Cover color"
            value={form.coverColor}
            onChange={set('coverColor')}
            placeholder="e.g. Dusty Rose"
            helperText="Shown on cover cards and used for template labeling."
            fullWidth
          />
        )}
        {isCoverCategory && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Binding type"
              value={form.coverType}
              onChange={set('coverType')}
              fullWidth
            >
              <MenuItem value="">Select binding type</MenuItem>
              {legacyOption(form.coverType, coverBindingOptions)}
              {coverBindingOptions.map((option) => (
                <MenuItem key={option.value} value={option.label}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Cover size"
              value={form.coverSize}
              onChange={set('coverSize')}
              fullWidth
            >
              <MenuItem value="">Select cover size</MenuItem>
              {legacyOption(form.coverSize, luluOptions.trims)}
              {luluOptions.trims.map((option) => (
                <MenuItem key={option.value} value={option.label}>{option.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
        )}
        {isInsideCategory && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Size"
              value={form.insideSize}
              onChange={set('insideSize')}
              fullWidth
            >
              <MenuItem value="">Select inside-page size</MenuItem>
              {legacyOption(form.insideSize, luluOptions.trims)}
              {luluOptions.trims.map((option) => (
                <MenuItem key={option.value} value={option.label}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Interior color"
              value={form.interiorColor}
              onChange={set('interiorColor')}
              fullWidth
            >
              <MenuItem value="">Select interior color</MenuItem>
              {legacyOption(form.interiorColor, insideColorOptions)}
              {insideColorOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Lulu paper"
              value={form.paperType}
              onChange={set('paperType')}
              fullWidth
            >
              <MenuItem value="">Select paper type</MenuItem>
              {legacyOption(form.paperType, paperOptions)}
              {paperOptions.map((option) => (
                <MenuItem key={option.value} value={option.label}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Page count"
              type="number"
              value={form.pageCount}
              onChange={set('pageCount')}
              inputProps={{ min: 0, step: 1 }}
              helperText="Used for Lulu spine width."
              fullWidth
            />
          </Stack>
        )}
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: form.matchingOptions.length ? 1.5 : 0 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>Etsy option matching</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Add the order options that must match this {isCoverCategory ? 'cover' : 'inside-page'} asset.
              </Typography>
            </Box>
            <SoftButton variant="outlined" startIcon={<AddIcon />} onClick={addMatchingOption}>
              Add Option
            </SoftButton>
          </Stack>
          <Stack spacing={1.25}>
            {form.matchingOptions.map((option, index) => (
              <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <TextField
                  label="Etsy option name"
                  value={option.label}
                  onChange={(event) => updateMatchingOption(index, 'label', event.target.value)}
                  placeholder={isCoverCategory ? 'Spine background colour' : 'Layout'}
                  fullWidth
                />
                <TextField
                  label="Required value"
                  value={option.value}
                  onChange={(event) => updateMatchingOption(index, 'value', event.target.value)}
                  placeholder={isCoverCategory ? 'Red' : 'Dotted'}
                  fullWidth
                />
                <Tooltip title="Remove option">
                  <IconButton color="error" onClick={() => removeMatchingOption(index)} sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Autocomplete
          options={categoryOptions}
          value={categoryOptions.find((option) => option._id === form.categoryId) || null}
          onChange={(_, value) => setForm((current) => ({ ...current, categoryId: value?._id || null }))}
          getOptionLabel={(option) => option.trailLabel || getCategoryOptionLabel(option)}
          isOptionEqualToValue={(option, value) => option._id === value._id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Category"
              placeholder="Select an optional category"
              helperText="Type to search existing categories."
              fullWidth
            />
          )}
        />
        <TextField label="Image URL" value={form.imageUrl} onChange={set('imageUrl')} placeholder="Leave blank to use the PDF preview or placeholder" fullWidth />
        <TextField label="Tags" value={form.tags} onChange={set('tags')} placeholder="journal, paperback, floral" helperText="Separate tags with commas." fullWidth />
        <TextField select label="Status" value={form.status} onChange={set('status')} fullWidth>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="archived">Archived</MenuItem>
        </TextField>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <SoftButton onClick={onClose} color="dark" variant="outlined">Cancel</SoftButton>
        <SoftButton onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save'}
        </SoftButton>
      </DialogActions>
    </Dialog>
  )
}

function LibraryCanvasPage({ item, onBack, onImported }) {
  return (
    <ProductTemplateEditor
      libraryItem={item}
      onBack={onBack}
      onSaved={onImported}
    />
  )
}

function CategoryToolbar({ category, search, setSearch, sort, setSort, viewMode, setViewMode, selectedCategoryLabel }) {
  return (
    <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Typography sx={{ color: '#64748b', fontWeight: 600 }}>Showing:</Typography>
        <Typography sx={{ color: '#2563eb', fontWeight: 700 }}>{selectedCategoryLabel}</Typography>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', xl: 'auto' } }}>
        <SoftInput
          placeholder={`Search ${category.shortTitle.toLowerCase()}...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          startIcon={<SearchIcon sx={{ fontSize: 20, color: '#667085' }} />}
          sx={{ minWidth: { md: 300 } }}
        />
        <TextField select value={sort} onChange={(event) => setSort(event.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="newest">Latest</MenuItem>
          <MenuItem value="oldest">Oldest</MenuItem>
          <MenuItem value="title">Name</MenuItem>
        </TextField>
        <Stack direction="row" spacing={0}>
          <IconButton onClick={() => setViewMode('grid')} sx={{ border: '1px solid', borderColor: viewMode === 'grid' ? '#2563eb' : 'divider', borderRadius: '0.75rem 0 0 0.75rem', color: viewMode === 'grid' ? '#2563eb' : 'text.secondary' }}>
            <GridViewIcon />
          </IconButton>
          <IconButton onClick={() => setViewMode('list')} sx={{ border: '1px solid', borderLeft: 0, borderColor: viewMode === 'list' ? '#2563eb' : 'divider', borderRadius: '0 0.75rem 0.75rem 0', color: viewMode === 'list' ? '#2563eb' : 'text.secondary' }}>
            <ListIcon />
          </IconButton>
        </Stack>
      </Stack>
    </Stack>
  )
}

function AssetGrid({ items, category, canManage, isProductCategory, onDetail, onEdit, onDelete, onOpenProducts }) {
  const isCoverCategory = category.key === 'cover'
  const isInsideCategory = category.key === 'inside-page'

  return (
    <Grid container spacing={2.5}>
      {items.map((item, index) => (
        <Grid key={item._id} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
          <SoftCard hover sx={{ height: '100%', p: 2, borderRadius: 2 }}>
            <Box
              onClick={() => (isProductCategory ? onOpenProducts() : onDetail(item))}
              sx={{ height: 230, bgcolor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1.5, overflow: 'hidden', cursor: 'pointer', mb: 2 }}
            >
              <Box component="img" src={item.imageUrl || placeholderImage} alt="" onError={(event) => { event.currentTarget.src = placeholderImage }} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </Box>
            <Stack spacing={1.15}>
              <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography sx={{ color: '#334155' }}>{category.itemIdLabel}</Typography>
                <Typography sx={{ color: '#111827', fontWeight: 800 }}>{isProductCategory ? item.listingId : formatLibraryId(category, index)}</Typography>
              </Stack>
              <Typography
                sx={{
                  color: '#111827',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  fontSize: isProductCategory ? '0.95rem' : '1rem',
                  display: '-webkit-box',
                  WebkitLineClamp: isProductCategory ? 1 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {item.title}
              </Typography>
              <CategoryBadge trail={item.categoryTrail} />
              <Typography variant="body2" sx={{ color: '#64748b', minHeight: 42 }}>
                {isProductCategory
                  ? item.podPackageId || `${item.variants || 0} variants`
                  : item.description || pageSizeInches(item)}
              </Typography>
              {isCoverCategory && (
                <Stack spacing={0.25}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Cover color: {item.coverColor || 'Not set'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Cover type: {item.coverType || 'Not set'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Cover size: {item.coverSize || pageSizeInches(item)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Etsy options: {item.matchingOptions?.length || 'None'}
                  </Typography>
                </Stack>
              )}
              {isInsideCategory && (
                <Stack spacing={0.25}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Interior color: {item.interiorColor || 'Not set'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Paper type: {item.paperType || 'Not set'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Size: {item.insideSize || pageSizeInches(item)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Pages: {item.pageCount || 'Not set'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    Etsy options: {item.matchingOptions?.length || 'None'}
                  </Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={1} alignItems="center">
                <SoftButton
                  fullWidth
                  variant="outlined"
                  startIcon={isProductCategory ? <OpenInNewIcon /> : <PictureAsPdfOutlinedIcon />}
                  onClick={() => (isProductCategory ? onOpenProducts() : onDetail(item))}
                >
                  {isProductCategory ? 'Open Products' : 'Open Template'}
                </SoftButton>
                {canManage && !isProductCategory && (
                  <>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => onEdit(item)}><EditOutlinedIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" disabled={!item._id} onClick={() => item._id && onDelete(item._id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </>
                )}
              </Stack>
            </Stack>
          </SoftCard>
        </Grid>
      ))}
    </Grid>
  )
}

function AssetList({ items, category, canManage, isProductCategory, onDetail, onEdit, onDelete, onOpenProducts }) {
  const isCoverCategory = category.key === 'cover'
  const isInsideCategory = category.key === 'inside-page'

  return (
    <SoftCard hover={false}>
      <TableContainer>
        <SoftTable>
          <SoftTableHead>
            <SoftTableRow>
              <SoftTableCell>{category.itemIdLabel}</SoftTableCell>
              <SoftTableCell>{category.nameLabel}</SoftTableCell>
              <SoftTableCell>Category</SoftTableCell>
              {isProductCategory ? (
                <>
                  <SoftTableCell>Details</SoftTableCell>
                  <SoftTableCell>Status</SoftTableCell>
                </>
              ) : (
                <>
                  {isCoverCategory && <SoftTableCell>Cover Type</SoftTableCell>}
                  {isCoverCategory && <SoftTableCell>Cover Size</SoftTableCell>}
                  {isInsideCategory && <SoftTableCell>Interior Color</SoftTableCell>}
                  {isInsideCategory && <SoftTableCell>Lulu Paper</SoftTableCell>}
                  {isInsideCategory && <SoftTableCell>Size</SoftTableCell>}
                  {isInsideCategory && <SoftTableCell>Pages</SoftTableCell>}
                  <SoftTableCell>Etsy Options</SoftTableCell>
                </>
              )}
              <SoftTableCell align="left">Actions</SoftTableCell>
            </SoftTableRow>
          </SoftTableHead>
          <SoftTableBody>
            {items.map((item, index) => (
              <SoftTableRow key={item._id}>
                <SoftTableCell>{isProductCategory ? item.listingId : formatLibraryId(category, index)}</SoftTableCell>
                <SoftTableCell>
                  <Typography sx={{ fontWeight: 700, maxWidth: 240 }} noWrap>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.description || '-'}</Typography>
                </SoftTableCell>
                <SoftTableCell>
                  <CategoryBadge trail={item.categoryTrail} />
                </SoftTableCell>
                {isProductCategory ? (
                  <>
                    <SoftTableCell>{`${item.variants || 0} variants`}</SoftTableCell>
                    <SoftTableCell>
                      <Typography variant="body2">{item.status || '-'}</Typography>
                    </SoftTableCell>
                  </>
                ) : (
                  <>
                    {isCoverCategory && <SoftTableCell>{item.coverType || '-'}</SoftTableCell>}
                    {isCoverCategory && <SoftTableCell>{item.coverSize || pageSizeInches(item)}</SoftTableCell>}
                    {isInsideCategory && <SoftTableCell>{item.interiorColor || '-'}</SoftTableCell>}
                    {isInsideCategory && <SoftTableCell>{item.paperType || '-'}</SoftTableCell>}
                    {isInsideCategory && <SoftTableCell>{item.insideSize || pageSizeInches(item)}</SoftTableCell>}
                    {isInsideCategory && <SoftTableCell>{item.pageCount || '-'}</SoftTableCell>}
                    <SoftTableCell>{item.matchingOptions?.length || '-'}</SoftTableCell>
                  </>
                )}
                <SoftTableCell align="left">
                  <Stack direction="row" spacing={1} justifyContent="flex-start">
                    {canManage && !isProductCategory && (
                      <SoftButton variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(item)}>Edit</SoftButton>
                    )}
                    <SoftButton
                      variant="outlined"
                      startIcon={isProductCategory ? <OpenInNewIcon /> : <VisibilityOutlinedIcon />}
                      onClick={() => (isProductCategory ? onOpenProducts() : onDetail(item))}
                    >
                      {isProductCategory ? 'Open Products' : 'Preview'}
                    </SoftButton>
                    {canManage && !isProductCategory && (
                      <IconButton color="error" disabled={!item._id} onClick={() => item._id && onDelete(item._id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                    )}
                  </Stack>
                </SoftTableCell>
              </SoftTableRow>
            ))}
          </SoftTableBody>
        </SoftTable>
      </TableContainer>
    </SoftCard>
  )
}

function CategoryManagementPage({ sectionKey }) {
  const section = CATEGORY_CONFIG[sectionKey]
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(buildCategoryForm(sectionKey))
  const [deleteTarget, setDeleteTarget] = useState(null)

  const flatCategories = useMemo(() => {
    return flattenCategoryTree(tree).map((entry) => ({
      ...entry,
      trailLabel: formatCategoryTrail(entry.categoryTrail || buildTrailFromFlat(flattenCategoryTree(tree), entry._id)),
    }))
  }, [tree])

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = activeStore ? { storeId: activeStore._id } : {}
      const { data } = await api.get(`/product-library-v2/categories/${sectionKey}/nodes`, { params })
      setTree(data.categoryTree || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [activeStore, sectionKey])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const disableParentIds = useMemo(() => {
    if (!form.id) return []
    const ids = [form.id]
    const visit = (nodes) => {
      for (const node of nodes) {
        if (node.parentId === form.id || ids.includes(node.parentId)) ids.push(node._id)
        visit(node.children || [])
      }
    }
    visit(tree)
    return ids
  }, [form.id, tree])

  const resetForm = () => setForm(buildCategoryForm(sectionKey))

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Category name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (form.id) {
        await api.patch(`/product-library-v2/categories/nodes/${form.id}`, {
          parentId: form.parentId,
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
          icon: form.icon,
          sortOrder: Number(form.sortOrder) || 0,
        })
      } else {
        await api.post(`/product-library-v2/categories/${sectionKey}/nodes`, {
          parentId: form.parentId,
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
          icon: form.icon,
          sortOrder: Number(form.sortOrder) || 0,
        })
      }
      resetForm()
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (category) => {
    setForm({
      id: category._id,
      section: sectionKey,
      parentId: category.parentId || null,
      name: category.name || '',
      description: category.description || '',
      color: category.color || CATEGORY_COLOR_OPTIONS[0].value,
      icon: category.icon || 'folder',
      sortOrder: category.sortOrder || 0,
    })
    setError('')
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/product-library-v2/categories/nodes/${deleteTarget._id}`)
      setDeleteTarget(null)
      if (form.id === deleteTarget._id) resetForm()
      fetchCategories()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete category')
      setDeleteTarget(null)
    }
  }

  if (!section) {
    return (
      <SoftEmptyState
        icon={Inventory2OutlinedIcon}
        title="Category section not found"
        description="Choose one of the product library sections."
        action={<SoftButton onClick={() => navigate('/product-library-2')}>Back to Product Library 2</SoftButton>}
      />
    )
  }

  if (!canManage) {
    return (
      <SoftEmptyState
        icon={SettingsOutlinedIcon}
        title="Category management is admin only"
        description="You can still browse the categorized library from the section page."
        action={<SoftButton onClick={() => navigate(section.path)}>Back to Section</SoftButton>}
      />
    )
  }

  return (
    <Box>
      <SoftPageHeader
        title={`Manage ${section.shortTitle} Categories`}
        subtitle={`Create, edit, and organize the ${section.shortTitle.toLowerCase()} taxonomy used across this section.`}
        breadcrumbs={[
          <Typography key="root" component={RouterLink} to="/product-library-2" sx={{ color: '#2563eb', textDecoration: 'none' }}>Home</Typography>,
          <Typography key="section" component={RouterLink} to={section.path} sx={{ color: '#2563eb', textDecoration: 'none' }}>{section.shortTitle}</Typography>,
          <Typography key="current" sx={{ color: '#667085' }}>Manage Categories</Typography>,
        ]}
        actions={
          <SoftButton variant="outlined" color="dark" startIcon={<ArrowBackIcon />} onClick={() => navigate(section.path)}>
            Back
          </SoftButton>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <SoftCard hover={false} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#2563eb', fontWeight: 800, mb: 2.5 }}>
          Category Details
        </Typography>
        <CategoryFormFields form={form} setForm={setForm} categoryOptions={flatCategories} disableParentIds={disableParentIds} />
        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
          {form.id && (
            <SoftButton variant="outlined" color="dark" onClick={resetForm}>
              Cancel Edit
            </SoftButton>
          )}
          <SoftButton variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : form.id ? 'Update Category' : 'Save Category'}
          </SoftButton>
        </Stack>
      </SoftCard>

      <SoftCard hover={false}>
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ color: '#2563eb', fontWeight: 800 }}>
            Existing Categories
          </Typography>
        </Box>
        <TableContainer>
          <SoftTable>
            <SoftTableHead>
              <SoftTableRow>
                <SoftTableCell>Category</SoftTableCell>
                <SoftTableCell>Description</SoftTableCell>
                <SoftTableCell>Count</SoftTableCell>
                <SoftTableCell align="left">Actions</SoftTableCell>
              </SoftTableRow>
            </SoftTableHead>
            <SoftTableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <SoftTableRow key={index}>
                    <SoftTableCell><Skeleton /></SoftTableCell>
                    <SoftTableCell><Skeleton /></SoftTableCell>
                    <SoftTableCell><Skeleton /></SoftTableCell>
                    <SoftTableCell><Skeleton /></SoftTableCell>
                  </SoftTableRow>
                ))
              ) : flatCategories.length === 0 ? (
                <SoftTableRow>
                  <SoftTableCell colSpan={4} sx={{ p: 0 }}>
                    <SoftEmptyState icon={section.icon} title="No categories yet" description="Create the first category to start organizing this section." />
                  </SoftTableCell>
                </SoftTableRow>
              ) : (
                flatCategories.map((entry) => {
                  const Icon = getCategoryIconComponent(entry.icon)
                  return (
                    <SoftTableRow key={entry._id}>
                      <SoftTableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pl: entry.depth * 2 }}>
                          <Box sx={{ width: 42, height: 42, borderRadius: '0.9rem', bgcolor: `${entry.color}18`, color: entry.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon />
                          </Box>
                          <Box>
                            <Typography sx={{ fontWeight: 700 }}>{entry.name}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{entry.trailLabel}</Typography>
                          </Box>
                        </Stack>
                      </SoftTableCell>
                      <SoftTableCell>{entry.description || '-'}</SoftTableCell>
                      <SoftTableCell>{entry.count}</SoftTableCell>
                      <SoftTableCell align="left">
                        <Stack direction="row" spacing={1}>
                          <IconButton onClick={() => startEdit(entry)}><EditOutlinedIcon fontSize="small" /></IconButton>
                          <IconButton color="error" onClick={() => setDeleteTarget(entry)}><DeleteOutlineIcon fontSize="small" /></IconButton>
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

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>Delete {deleteTarget?.name}? Categories with items or child categories cannot be deleted.</Typography>
        </DialogContent>
        <DialogActions>
          <SoftButton onClick={() => setDeleteTarget(null)} color="dark" variant="outlined">Cancel</SoftButton>
          <SoftButton onClick={handleDelete} color="error" variant="contained">Delete</SoftButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function buildTrailFromFlat(flatCategories, categoryId) {
  const byId = flatCategories.reduce((acc, entry) => {
    acc[entry._id] = entry
    return acc
  }, {})
  const result = []
  let current = byId[categoryId]
  while (current) {
    result.unshift({ _id: current._id, name: current.name, color: current.color, icon: current.icon })
    current = current.parentId ? byId[current.parentId] : null
  }
  return result
}

function CategoryDetailPage({ sectionKey }) {
  const category = CATEGORY_CONFIG[sectionKey]
  const navigate = useNavigate()
  const { activeStore, user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const isProductCategory = sectionKey === 'product'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [viewMode, setViewMode] = useState(category?.defaultView || 'grid')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [detailItem, setDetailItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [error, setError] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [categoryTree, setCategoryTree] = useState([])
  const [uncategorizedCount, setUncategorizedCount] = useState(0)
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false)
  const [quickCategorySaving, setQuickCategorySaving] = useState(false)
  const [quickCategoryError, setQuickCategoryError] = useState('')
  const [quickCategoryForm, setQuickCategoryForm] = useState(buildCategoryForm(sectionKey))

  useEffect(() => {
    setQuickCategoryForm(buildCategoryForm(sectionKey))
    setSelectedCategoryId('')
    setViewMode(category?.defaultView || 'grid')
  }, [category?.defaultView, sectionKey])

  const fetchItems = useCallback(async () => {
    if (!category) return
    setLoading(true)
    setError('')
    try {
      const params = {
        ...(activeStore ? { storeId: activeStore._id } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
      }
      const { data } = await api.get(`/product-library-v2/categories/${category.key}`, { params })
      setItems(data.items || [])
      setCategoryTree(data.categoryTree || [])
      setUncategorizedCount(data.uncategorizedCount || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load product library category')
    } finally {
      setLoading(false)
    }
  }, [activeStore, category, search, selectedCategoryId])

  useEffect(() => { fetchItems() }, [fetchItems])

  const flatCategories = useMemo(() => {
    const flat = flattenCategoryTree(categoryTree)
    return flat.map((entry) => ({
      ...entry,
      trailLabel: formatCategoryTrail(buildTrailFromFlat(flat, entry._id)),
    }))
  }, [categoryTree])

  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategoryId === '') return category?.allLabel || 'All'
    if (selectedCategoryId === UNCATEGORIZED_ID) return 'Uncategorized'
    return flatCategories.find((entry) => entry._id === selectedCategoryId)?.trailLabel || 'Selected Category'
  }, [category?.allLabel, flatCategories, selectedCategoryId])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sort === 'title') return String(a.title || '').localeCompare(String(b.title || ''))
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return sort === 'oldest' ? aTime - bTime : bTime - aTime
    })
  }, [items, sort])

  const upsertItem = (item, { openDetail = false } = {}) => {
    setItems((current) => {
      const exists = current.some((entry) => entry._id === item._id)
      return exists ? current.map((entry) => (entry._id === item._id ? item : entry)) : [item, ...current]
    })
    setDetailItem((current) => (current?._id === item._id ? item : current))
    if (openDetail) setDetailItem(item)
    fetchItems()
  }

  const handleDelete = async () => {
    if (!deleteId || deleteId === 'null' || deleteId === 'undefined') {
      setError('Could not delete item because its ID is missing.')
      setDeleteId(null)
      return
    }
    try {
      await api.delete(`/product-library-v2/items/${deleteId}`)
      setItems((current) => current.filter((item) => item._id !== deleteId))
      setDeleteId(null)
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete item')
    }
  }

  const handleMoveCategory = async ({ categoryId, parentId, sortOrder }) => {
    setError('')
    try {
      await api.patch(`/product-library-v2/categories/nodes/${categoryId}`, {
        parentId,
        sortOrder,
      })
      fetchItems()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move category')
    }
  }

  const openQuickAdd = (parentNode) => {
    setQuickCategoryForm(buildCategoryForm(sectionKey, parentNode?._id || null))
    setQuickCategoryError('')
    setQuickCategoryOpen(true)
  }

  const saveQuickCategory = async () => {
    if (!quickCategoryForm.name.trim()) {
      setQuickCategoryError('Category name is required')
      return
    }
    setQuickCategorySaving(true)
    setQuickCategoryError('')
    try {
      await api.post(`/product-library-v2/categories/${sectionKey}/nodes`, {
        parentId: quickCategoryForm.parentId,
        name: quickCategoryForm.name.trim(),
        description: quickCategoryForm.description.trim(),
        color: quickCategoryForm.color,
        icon: quickCategoryForm.icon,
        sortOrder: Number(quickCategoryForm.sortOrder) || 0,
      })
      setQuickCategoryOpen(false)
      fetchItems()
    } catch (err) {
      setQuickCategoryError(err.response?.data?.message || 'Failed to create category')
    } finally {
      setQuickCategorySaving(false)
    }
  }

  if (!category) {
    return (
      <SoftEmptyState
        icon={Inventory2OutlinedIcon}
        title="Category not found"
        description="Choose one of the product library categories."
        action={<SoftButton onClick={() => navigate('/product-library-2')}>Back to Product Library 2</SoftButton>}
      />
    )
  }

  if (detailItem && !isProductCategory) {
    return (
      <LibraryCanvasPage
        item={detailItem}
        onBack={() => setDetailItem(null)}
        onImported={(item) => upsertItem(item, { openDetail: true })}
      />
    )
  }

  return (
    <Box>
      <SoftPageHeader
        title={category.title}
        subtitle={category.description}
        breadcrumbs={[
          <Typography key="root" component={RouterLink} to="/product-library-2" sx={{ color: '#2563eb', textDecoration: 'none' }}>Home</Typography>,
          <Typography key="current" sx={{ color: '#667085' }}>{category.shortTitle}</Typography>,
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <SoftButton variant="outlined" color="dark" startIcon={<ArrowBackIcon />} onClick={() => navigate('/product-library-2')}>Back</SoftButton>
            <SoftButton variant="outlined" color="dark" startIcon={<SettingsOutlinedIcon />} onClick={() => navigate(`/product-library-2/${sectionKey}/categories`)}>
              Manage Categories
            </SoftButton>
            {canManage && !isProductCategory && (
              <SoftButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditItem(null); setDialogOpen(true) }}>
                {category.addLabel}
              </SoftButton>
            )}
            {isProductCategory && (
              <SoftButton variant="contained" startIcon={<OpenInNewIcon />} onClick={() => navigate('/product-library-2/product')}>
                Manage Products
              </SoftButton>
            )}
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 3.2 }}>
          <CategorySidebar
            section={category}
            tree={categoryTree}
            uncategorizedCount={uncategorizedCount}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onAddCategory={openQuickAdd}
            canManage={canManage}
            onMoveCategory={handleMoveCategory}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 8.8 }}>
          <CategoryToolbar
            category={category}
            search={search}
            setSearch={setSearch}
            sort={sort}
            setSort={setSort}
            viewMode={viewMode}
            setViewMode={setViewMode}
            selectedCategoryLabel={selectedCategoryLabel}
          />

          {loading ? (
            <Grid container spacing={2.5}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid key={index} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <SoftCard hover={false} sx={{ p: 2.5 }}>
                    <Skeleton variant="rounded" height={190} sx={{ borderRadius: 2, mb: 2 }} />
                    <Skeleton width="70%" />
                    <Skeleton width="90%" />
                  </SoftCard>
                </Grid>
              ))}
            </Grid>
          ) : sortedItems.length === 0 ? (
            <SoftCard hover={false}>
              <SoftEmptyState
                icon={category.icon}
                title={search ? 'No matching items' : `No ${category.title.toLowerCase()} yet`}
                description={isProductCategory ? 'Products from the current library will appear here.' : 'Add the first reusable asset to this category.'}
              />
            </SoftCard>
          ) : viewMode === 'grid' ? (
            <AssetGrid
              items={sortedItems}
              category={category}
              canManage={canManage}
              isProductCategory={isProductCategory}
              onDetail={setDetailItem}
              onEdit={(item) => { setEditItem(item); setDialogOpen(true) }}
              onDelete={setDeleteId}
              onOpenProducts={() => navigate('/product-library-2/product')}
            />
          ) : (
            <AssetList
              items={sortedItems}
              category={category}
              canManage={canManage}
              isProductCategory={isProductCategory}
              onDetail={setDetailItem}
              onEdit={(item) => { setEditItem(item); setDialogOpen(true) }}
              onDelete={setDeleteId}
              onOpenProducts={() => navigate('/product-library-2/product')}
            />
          )}

          <Typography sx={{ color: '#667085', mt: 3 }}>
            Showing {sortedItems.length} {sortedItems.length === 1 ? category.itemLabel : `${category.itemLabel}s`}
          </Typography>
        </Grid>
      </Grid>

      {canManage && !isProductCategory && (
        <LibraryItemDialog
          open={dialogOpen}
          category={category.key}
          item={editItem}
          activeStore={activeStore}
          categoryOptions={flatCategories}
          onClose={() => setDialogOpen(false)}
          onSaved={upsertItem}
        />
      )}

      <CategoryQuickAddDialog
        open={quickCategoryOpen}
        form={quickCategoryForm}
        setForm={setQuickCategoryForm}
        categoryOptions={flatCategories}
        saving={quickCategorySaving}
        error={quickCategoryError}
        onClose={() => setQuickCategoryOpen(false)}
        onSave={saveQuickCategory}
      />

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <Typography>Are you sure? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <SoftButton onClick={() => setDeleteId(null)} color="dark" variant="outlined">Cancel</SoftButton>
          <SoftButton onClick={handleDelete} color="error" variant="contained">Delete</SoftButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function ProductLibrary2Page() {
  const { section } = useParams()
  const location = useLocation()
  const { activeStore } = useAuthStore()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const counts = useMemo(
    () => categories.reduce((acc, item) => ({ ...acc, [item.key]: item.count || 0 }), {}),
    [categories]
  )

  useEffect(() => {
    if (section) return
    let cancelled = false
    const fetchDashboard = async () => {
      setLoading(true)
      setError('')
      try {
        const params = activeStore ? { storeId: activeStore._id } : {}
        const { data } = await api.get('/product-library-v2/dashboard', { params })
        if (!cancelled) setCategories(data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load Product Library 2')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDashboard()
    return () => { cancelled = true }
  }, [activeStore, section])

  if (section && location.pathname.endsWith('/categories')) {
    return <CategoryManagementPage sectionKey={section} />
  }

  if (section) return <CategoryDetailPage sectionKey={section} />

  return (
    <Box>
      <SoftPageHeader title="Product Library 2" subtitle="Browse and manage the building blocks of your automated orders." />
      <Divider sx={{ mb: 4 }} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={3}>
        {CATEGORIES.map((item) => (
          <Grid key={item.key} size={{ xs: 12, md: 4 }}>
            <CategoryDashboardCard category={item} count={counts[item.key] || 0} loading={loading} />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
