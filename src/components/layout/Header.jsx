import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutIcon from '@mui/icons-material/LogoutOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import useAuthStore from '../../stores/authStore'
import { useNavigate } from 'react-router-dom'
import { HEADER_HEIGHT } from '../../lib/constants'
import NotificationCenter from '../common/NotificationCenter'

export default function Header({ onMenuToggle }) {
  const { user, stores, activeStore, setActiveStore, logout } = useAuthStore()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const profileOpen = Boolean(anchorEl)

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
        bgcolor: 'transparent',
        backdropFilter: 'blur(6px)',
        borderBottom: (t) => `1px dashed ${t.palette.divider}`,
        color: 'text.primary',
        zIndex: (t) => t.zIndex.appBar,
      }}
    >
      <Toolbar sx={{ height: HEADER_HEIGHT, gap: 1.25, px: { xs: 2, lg: 4 } }}>
        {/* Mobile menu button */}
        <IconButton
          onClick={onMenuToggle}
          sx={{ display: { lg: 'none' }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

        {/* Store selector */}
        {stores.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={activeStore?._id || ''}
              onChange={(e) => {
                const store = stores.find((s) => s._id === e.target.value)
                if (store) setActiveStore(store)
              }}
              displayEmpty
              startAdornment={
                <StorefrontOutlinedIcon sx={{ fontSize: 18, mr: 0.5, color: 'text.secondary' }} />
              }
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: (t) => t.palette.grey[300] },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: (t) => t.palette.divider },
                bgcolor: 'background.paper',
                borderRadius: 1,
              }}
            >
              {stores.map((store) => (
                <MenuItem key={store._id} value={store._id}>{store.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Search */}
        <Tooltip title="Search">
          <Button
            variant="outlined"
            startIcon={<SearchIcon sx={{ fontSize: 16 }} />}
            sx={{
              minHeight: 38,
              px: 1.25,
              display: { xs: 'none', sm: 'inline-flex' },
              color: 'text.secondary',
            }}
          >
            Ctrl K
          </Button>
        </Tooltip>
        <Tooltip title="Search">
          <IconButton sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'text.secondary' }}>
            <SearchIcon />
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <NotificationCenter />

        {/* Profile */}
        <Tooltip title={user?.name || 'Profile'}>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5, p: 0.25 }}>
            <Avatar sx={{ width: 36, height: 36, fontSize: '0.875rem', fontWeight: 700, bgcolor: 'primary.main' }}>
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={profileOpen}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{
            paper: {
              sx: {
                minWidth: 200,
                mt: 1,
                borderRadius: 1.5,
                border: (t) => `1px solid ${t.palette.divider}`,
                boxShadow: (t) => `0 12px 24px -4px ${alpha(t.palette.grey[500], 0.16)}`,
              },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{user?.email}</Typography>
          </Box>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings/profile') }}>
            <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings/team') }}>
            <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>
            Settings
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
