import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalLibraryOutlinedIcon from '@mui/icons-material/LocalLibraryOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import StyleOutlinedIcon from '@mui/icons-material/StyleOutlined'

export const CATEGORY_ICON_MAP = {
  folder: FolderOutlinedIcon,
  book: MenuBookOutlinedIcon,
  library: LocalLibraryOutlinedIcon,
  story: AutoStoriesOutlinedIcon,
  school: SchoolOutlinedIcon,
  business: BusinessCenterOutlinedIcon,
  document: DescriptionOutlinedIcon,
  tag: StyleOutlinedIcon,
  inventory: Inventory2OutlinedIcon,
}

export const CATEGORY_ICON_OPTIONS = [
  { value: 'folder', label: 'Folder', Icon: FolderOutlinedIcon },
  { value: 'book', label: 'Book', Icon: MenuBookOutlinedIcon },
  { value: 'library', label: 'Library', Icon: LocalLibraryOutlinedIcon },
  { value: 'story', label: 'Story', Icon: AutoStoriesOutlinedIcon },
  { value: 'school', label: 'School', Icon: SchoolOutlinedIcon },
  { value: 'business', label: 'Business', Icon: BusinessCenterOutlinedIcon },
  { value: 'document', label: 'Document', Icon: DescriptionOutlinedIcon },
  { value: 'tag', label: 'Tag', Icon: StyleOutlinedIcon },
  { value: 'inventory', label: 'Inventory', Icon: Inventory2OutlinedIcon },
]

export const CATEGORY_COLOR_OPTIONS = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#16a34a', label: 'Green' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#dc2626', label: 'Red' },
  { value: '#0891b2', label: 'Cyan' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#475569', label: 'Slate' },
]

export const getCategoryIconComponent = (value) => CATEGORY_ICON_MAP[value] || FolderOutlinedIcon

export const flattenCategoryTree = (nodes = []) => {
  const result = []
  const visit = (node, depth = 0) => {
    result.push({ ...node, depth })
    ;(node.children || []).forEach((child) => visit(child, depth + 1))
  }
  nodes.forEach((node) => visit(node, 0))
  return result
}

export const formatCategoryTrail = (trail = []) => trail.map((entry) => entry.name).join(' / ')

export const getCategoryOptionLabel = (category) => {
  if (!category) return ''
  if (category.trailLabel) return category.trailLabel
  if (category.categoryTrail?.length) return formatCategoryTrail(category.categoryTrail)
  return category.name || ''
}
