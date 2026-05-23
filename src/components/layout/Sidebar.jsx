import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import DashboardIcon from '@mui/icons-material/DashboardOutlined'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshopOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import StoreIcon from '@mui/icons-material/StorefrontOutlined'
import PersonIcon from '@mui/icons-material/PersonOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import { SoftAvatar } from '../soft-ui'
import BookOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '../../lib/constants'
import useAuthStore from '../../stores/authStore'
import { canManageWorkspace } from '../../lib/permissions'
import { alpha } from '@mui/material/styles'

const MAIN_NAV = [
  { title: 'Dashboard', path: '/dashboard', icon: DashboardIcon },
  { title: 'Etsy Orders', path: '/orders/etsy', icon: ShoppingCartIcon },
  { title: 'Etsy 2', path: '/orders/etsy2', icon: ShoppingCartIcon },
  { title: 'Generated PDFs', path: '/orders/generated-pdfs', icon: PictureAsPdfIcon },
  { title: 'Lulu Orders', path: '/orders/lulu', icon: LocalPrintshopIcon },
  { title: 'Product Library 2', path: '/product-library-2', icon: InventoryIcon },
]

const ACCOUNT_NAV = [
  { title: 'Team', path: '/settings/team', icon: GroupIcon, adminOnly: true },
  { title: 'Stores', path: '/settings/stores', icon: StoreIcon, adminOnly: true },
  { title: 'Profile', path: '/settings/profile', icon: PersonIcon },
]

function NavItem({ item, collapsed, isActive }) {
  const navigate = useNavigate()
  const Icon = item.icon

  return (
    <Tooltip title={collapsed ? item.title : ''} placement="right" arrow>
      <Box
        onClick={() => navigate(item.path)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minHeight: 44,
          borderRadius: '0.75rem',
          mx: 1,
          mb: 0.5,
          px: collapsed ? 1.2 : 1.5,
          py: 0.75,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          ...(isActive ? {
            backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            color: '#fff',
            boxShadow: '0 4px 7px -1px rgba(249, 115, 22, 0.35)',
          } : {
            color: '#71717a',
            '&:hover': {
              backgroundColor: '#f4f4f5',
              color: '#27272a',
            },
          }),
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            ...(isActive ? {
              backgroundColor: alpha('#fff', 0.2),
            } : {
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            }),
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        {!collapsed && (
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}

function NavList({ items, collapsed, pathname }) {
  return (
    <Box>
      {items.map((item) => (
        <NavItem
          key={item.path}
          item={item}
          collapsed={collapsed}
          isActive={pathname === item.path || pathname.startsWith(item.path + '/')}
        />
      ))}
    </Box>
  )
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [anchorElUser, setAnchorElUser] = useState(null)
  const userMenuOpen = Boolean(anchorElUser)
  const canManage = canManageWorkspace(user)
  const accountItems = ACCOUNT_NAV.filter((item) => !item.adminOnly || canManage)

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const content = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        borderRadius: { lg: '1rem' },
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid',
        borderColor: alpha('#000', 0.05),
      }}
    >
      {/* Logo Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: collapsed ? 1.5 : 2,
          py: 2,
          minHeight: 72,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            color: '#fff',
            flexShrink: 0,
            boxShadow: '0 4px 7px -1px rgba(249, 115, 22, 0.35)',
          }}
        >
          <BookOutlinedIcon sx={{ fontSize: 20 }} />
        </Box>
        {!collapsed && (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: '0.98rem', fontWeight: 700, color: '#27272a', whiteSpace: 'nowrap' }}>
              Beatific.co
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 500, color: '#27272a', whiteSpace: 'nowrap', lineHeight: 1 }}>
              Order Automation
            </Typography>
          </Box>
        )}

        {/* Collapse toggle (moved to top-right) */}
        <IconButton
          onClick={onToggle}
          size="small"
          sx={{
            position: 'absolute',
            right: collapsed ? 6 : 12,
            top: 12,
            borderRadius: '0.5rem',
            color: '#71717a',
            '&:hover': { bgcolor: '#f4f4f5' },
          }}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      <Divider sx={{ mx: 2, borderColor: alpha('#000', 0.08) }} />

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          py: 1.5,
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha('#000', 0.2)} transparent`,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: alpha('#000', 0.2),
            borderRadius: '3px',
          },
        }}
      >
        <NavList items={MAIN_NAV} collapsed={collapsed} pathname={location.pathname} />

        {accountItems.length > 0 && !collapsed && (
          <Typography
            sx={{
              px: 2.5,
              pt: 3,
              pb: 1,
              fontSize: '0.75rem',
              color: '#52525b',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            Account pages
          </Typography>
        )}
        <NavList items={accountItems} collapsed={collapsed} pathname={location.pathname} />
      </Box>

      {/* User bar at bottom */}
      <Box
        onClick={(e) => setAnchorElUser(e.currentTarget)}
        sx={{
          px: 2,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderTop: '1px solid',
          borderColor: alpha('#000', 0.04),
          cursor: 'pointer',
        }}
      >
        <Tooltip title={user?.name || 'Profile'}>
          <IconButton sx={{ p: 0 }}>
            <SoftAvatar size={36} src={user?.profileImageUrl}>{initials}</SoftAvatar>
          </IconButton>
        </Tooltip>
        {!collapsed && (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#27272a' }}>{user?.name}</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: '#71717a' }}>{user?.email}</Typography>
          </Box>
        )}
      </Box>

      {/* User menu */}
      <Menu
        anchorEl={anchorElUser}
        open={userMenuOpen}
        onClose={() => setAnchorElUser(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              mt: 1.5,
              borderRadius: '0.75rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
              border: '1px solid',
              borderColor: alpha('#000', 0.05),
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#27272a' }}>{user?.name}</Typography>
          <Typography variant="caption" sx={{ color: '#71717a', fontSize: '0.8125rem' }}>{user?.email}</Typography>
        </Box>
        <Divider sx={{ my: 0.5, borderColor: alpha('#000', 0.08) }} />
        <MenuItem
          onClick={() => { setAnchorElUser(null); navigate('/settings/profile') }}
          sx={{ mx: 0.5, borderRadius: '0.5rem', fontSize: '0.875rem', '&:hover': { bgcolor: '#f4f4f5' } }}
        >
          <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem
          onClick={() => { setAnchorElUser(null); navigate('/settings/team') }}
          sx={{ mx: 0.5, borderRadius: '0.5rem', fontSize: '0.875rem', '&:hover': { bgcolor: '#f4f4f5' } }}
        >
          <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
          Settings
        </MenuItem>
        <Divider sx={{ my: 0.5, borderColor: alpha('#000', 0.08) }} />
        <MenuItem
          onClick={() => { setAnchorElUser(null); logout(); navigate('/login') }}
          sx={{ mx: 0.5, borderRadius: '0.5rem', fontSize: '0.875rem', color: '#ef4444', '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}
        >
          <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  )

  return (
    <>
      <Box
        component="nav"
        sx={{
          width: collapsed ? SIDEBAR_COLLAPSED_WIDTH + 28 : SIDEBAR_WIDTH + 28,
          flexShrink: 0,
          transition: 'width 0.25s ease',
          display: { xs: 'none', lg: 'block' },
        }}
      >
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
            height: 'calc(100vh - 32px)',
            '@supports (height: 100dvh)': { height: 'calc(100dvh - 32px)' },
            transition: 'width 0.25s ease',
            zIndex: 1200,
          }}
        >
          {content}
        </Box>
      </Box>

      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, bgcolor: 'transparent', p: 1.5 },
        }}
      >
        {content}
      </Drawer>
    </>
  )
}
