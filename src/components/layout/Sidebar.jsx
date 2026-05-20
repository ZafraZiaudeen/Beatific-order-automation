import { useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshopOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import StoreIcon from '@mui/icons-material/StorefrontOutlined'
import PersonIcon from '@mui/icons-material/PersonOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import BookOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '../../lib/constants'
import useAuthStore from '../../stores/authStore'
import { canManageWorkspace } from '../../lib/permissions'

const SIDEBAR_BG = '#FFFFFF'
const SIDEBAR_HOVER = '#F9FAFB'
const ACTIVE_COLOR = '#00A76F'
const ACTIVE_BG = '#C8FAD6'
const SIDEBAR_BORDER = '#DFE3E8'
const TEXT_COLOR = '#637381'
const TEXT_DARK = '#1C252E'

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
    ],
  },
  {
    title: 'ORDERS',
    items: [
      { title: 'Etsy Orders', path: '/orders/etsy', icon: ShoppingCartIcon },
      { title: 'Lulu Orders', path: '/orders/lulu', icon: LocalPrintshopIcon },
    ],
  },
  {
    title: 'PRODUCTS',
    items: [
      { title: 'Product Library', path: '/products', icon: InventoryIcon },
    ],
  },
  {
    title: 'SETTINGS',
    items: [
      { title: 'Team', path: '/settings/team', icon: GroupIcon },
      { title: 'Stores', path: '/settings/stores', icon: StoreIcon },
      { title: 'Profile', path: '/settings/profile', icon: PersonIcon },
    ],
  },
]

function NavItem({ item, collapsed, isActive }) {
  const navigate = useNavigate()
  const Icon = item.icon

  return (
    <Tooltip title={collapsed ? item.title : ''} placement="right" arrow>
      <ListItemButton
        onClick={() => navigate(item.path)}
        sx={{
          minHeight: 44,
          borderRadius: 1,
          mx: collapsed ? 1 : 1,
          mb: 0.25,
          px: collapsed ? 1.25 : 1.5,
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: isActive ? '#007867' : TEXT_COLOR,
          bgcolor: isActive ? ACTIVE_BG : 'transparent',
          fontWeight: 500,
          '&:hover': {
            color: isActive ? '#007867' : TEXT_DARK,
            bgcolor: isActive ? ACTIVE_BG : SIDEBAR_HOVER,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 36,
            color: isActive ? '#007867' : TEXT_COLOR,
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: 22 }} />
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={item.title}
            slotProps={{
              primary: {
                sx: {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
              },
            }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  )
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation()
  const { user } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (['/settings/team', '/settings/stores'].includes(item.path)) return canManage
      return true
    }),
  })).filter((section) => section.items.length > 0)

  const content = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SIDEBAR_BG,
        color: TEXT_COLOR,
        borderRight: `1px dashed ${SIDEBAR_BORDER}`,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: collapsed ? 1.25 : 2,
          py: 1.5,
          minHeight: 72,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            boxShadow: '0 8px 16px rgba(0, 167, 111, 0.24)',
            flexShrink: 0,
          }}
        >
          <BookOutlinedIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        {!collapsed && (
          <Box>
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: TEXT_DARK,
                lineHeight: 1.2,
              }}
            >
              Beatific.co
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: TEXT_COLOR, mt: 0.2 }}>
              Order Automation
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: SIDEBAR_BORDER }} />

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
          overscrollBehavior: 'contain',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            width: 0,
            height: 0,
          },
        }}
      >
        {sections.map((section) => (
          <List
            key={section.title}
            subheader={
              !collapsed ? (
                <ListSubheader
                  sx={{
                    bgcolor: 'transparent',
                    color: TEXT_COLOR,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    lineHeight: '36px',
                    px: 3,
                    mt: 1,
                  }}
                >
                  {section.title}
                </ListSubheader>
              ) : (
                <Box sx={{ mt: 1.5 }} />
              )
            }
            disablePadding
          >
            {section.items.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                collapsed={collapsed}
                isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
              />
            ))}
          </List>
        ))}
      </Box>

      {/* Collapse toggle */}
      <Box sx={{ p: 1.5, display: { xs: 'none', lg: 'flex' }, justifyContent: 'center' }}>
        <IconButton
          onClick={onToggle}
          sx={{
            width: 36,
            height: 36,
            color: TEXT_COLOR,
            '&:hover': { bgcolor: SIDEBAR_HOVER },
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
    </Box>
  )

  return (
    <>
      {/* Desktop */}
      <Box
        component="nav"
        sx={{
          width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
          flexShrink: 0,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: { xs: 'none', lg: 'block' },
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
            height: '100vh',
            '@supports (height: 100dvh)': {
              height: '100dvh',
            },
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1200,
          }}
        >
          {content}
        </Box>
      </Box>

      {/* Mobile */}
      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, bgcolor: SIDEBAR_BG },
        }}
      >
        {content}
      </Drawer>
    </>
  )
}
