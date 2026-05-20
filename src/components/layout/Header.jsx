import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputAdornment from '@mui/material/InputAdornment'
import { alpha } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import useAuthStore from '../../stores/authStore'
import { HEADER_HEIGHT } from '../../lib/constants'
import NotificationCenter from '../common/NotificationCenter'
import { SoftAvatar, SoftInput } from '../soft-ui'

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/orders/etsy': 'Etsy Orders',
  '/orders/lulu': 'Lulu Orders',
  '/products': 'Product Library',
  '/settings/team': 'Team',
  '/settings/stores': 'Stores',
  '/settings/profile': 'Profile',
}

function getRouteTitle(pathname) {
  if (pathname.startsWith('/orders/etsy/') && pathname !== '/orders/etsy') return 'Order Detail'
  return ROUTE_TITLES[pathname] || 'Dashboard'
}

export default function Header({ onMenuToggle }) {
  const { user, stores, activeStore, setActiveStore, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [anchorEl, setAnchorEl] = useState(null)
  const profileOpen = Boolean(anchorEl)

  const pageTitle = useMemo(() => getRouteTitle(location.pathname), [location.pathname])

  const handleLogout = () => {
    setAnchorEl(null)
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: 'transparent',
        backdropFilter: 'blur(20px)',
        color: 'text.primary',
        zIndex: (t) => t.zIndex.appBar,
        boxShadow: 'none',
      }}
    >
      <Toolbar
        sx={{
          minHeight: `${HEADER_HEIGHT}px !important`,
          gap: 1.5,
          px: { xs: 0.5, sm: 1, lg: 0 },
          maxWidth: 1500,
          width: '100%',
          mx: 'auto',
        }}
      >
        <IconButton
          onClick={onMenuToggle}
          sx={{
            display: { lg: 'none' },
            mr: 0.5,
            color: '#71717a',
            '&:hover': { bgcolor: alpha('#000', 0.04) },
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Store Selector */}
        {stores.length > 0 && (
          <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 180 }, display: { xs: 'none', sm: 'block' } }}>
            <Select
              value={activeStore?._id || ''}
              onChange={(e) => {
                const store = stores.find((s) => s._id === e.target.value)
                if (store) setActiveStore(store)
              }}
              displayEmpty
              startAdornment={
                <InputAdornment position="start">
                  <StorefrontOutlinedIcon sx={{ fontSize: 18, color: '#71717a' }} />
                </InputAdornment>
              }
              sx={{
                bgcolor: '#fff',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#000', 0.12) },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#f97316', borderWidth: '1px' },
              }}
            >
              {stores.map((store) => (
                <MenuItem key={store._id} value={store._id}>{store.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Search Input */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 200 }}>
          <SoftInput
            size="small"
            placeholder="Type here..."
            startIcon={<SearchIcon sx={{ fontSize: 18, color: '#71717a' }} />}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 40,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              },
            }}
          />
        </Box>
        <Tooltip title="Search">
          <IconButton
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              bgcolor: '#fff',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              '&:hover': { bgcolor: '#f4f4f5' },
            }}
          >
            <SearchIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <NotificationCenter />

        {/* Profile Avatar */}
        <Tooltip title={user?.name || 'Profile'}>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.25, p: 0.2 }}>
            <SoftAvatar size={40} src={user?.profileImageUrl || undefined} alt={user?.name || 'Profile'}>
              {initials}
            </SoftAvatar>
          </IconButton>
        </Tooltip>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={profileOpen}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
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
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#27272a' }}>
              {user?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#71717a', fontSize: '0.8125rem' }}>
              {user?.email}
            </Typography>
          </Box>
          <Divider sx={{ my: 0.5, borderColor: alpha('#000', 0.08) }} />
          <MenuItem
            onClick={() => { setAnchorEl(null); navigate('/settings/profile') }}
            sx={{
              mx: 0.5,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              '&:hover': { bgcolor: '#f4f4f5' },
            }}
          >
            <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem
            onClick={() => { setAnchorEl(null); navigate('/settings/team') }}
            sx={{
              mx: 0.5,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              '&:hover': { bgcolor: '#f4f4f5' },
            }}
          >
            <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
            Settings
          </MenuItem>
          <Divider sx={{ my: 0.5, borderColor: alpha('#000', 0.08) }} />
          <MenuItem
            onClick={handleLogout}
            sx={{
              mx: 0.5,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#ef4444',
              '&:hover': { bgcolor: alpha('#ef4444', 0.08) },
            }}
          >
            <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
