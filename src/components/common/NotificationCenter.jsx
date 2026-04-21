import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Popover from '@mui/material/Popover'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNoneOutlined'
import CheckAllIcon from '@mui/icons-material/DoneAllOutlined'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalPrintshopIcon from '@mui/icons-material/LocalPrintshopOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined'
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'
import api from '../../lib/api'
import { useNavigate } from 'react-router-dom'

const TYPE_ICONS = {
  import_complete: UploadFileIcon,
  lulu_submitted: LocalPrintshopIcon,
  order_shipped: LocalShippingIcon,
  lulu_failed: ErrorOutlineIcon,
  default: ShoppingCartIcon,
}

const TYPE_COLORS = {
  import_complete: '#00A76F',
  lulu_submitted: '#0288D1',
  order_shipped: '#22C55E',
  lulu_failed: '#FF5630',
  default: '#637381',
}

const formatTime = (d) => {
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const open = Boolean(anchorEl)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // silently fail
    }
  }, [])

  // Poll every 60 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget)
    fetchNotifications()
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      //
    }
  }

  const handleMarkRead = async (notification) => {
    if (!notification.read) {
      try {
        await api.patch(`/notifications/${notification._id}/read`)
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        //
      }
    }
    if (notification.link) {
      navigate(notification.link)
      setAnchorEl(null)
    }
  }

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} sx={{ color: 'text.secondary' }}>
          <Badge badgeContent={unreadCount || null} color="error" variant={unreadCount > 0 ? 'standard' : 'dot'}>
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              mt: 1,
              borderRadius: 2,
              boxShadow: (t) => `0 20px 40px -4px ${alpha(t.palette.grey[500], 0.24)}`,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
            {unreadCount > 0 && (
              <Box component="span" sx={{ ml: 1, fontSize: '0.75rem', color: 'primary.main', fontWeight: 600 }}>
                ({unreadCount} new)
              </Box>
            )}
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckAllIcon sx={{ fontSize: 16 }} />}
              onClick={handleMarkAllRead}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List disablePadding sx={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.map((notification) => {
              const IconComponent = TYPE_ICONS[notification.type] || TYPE_ICONS.default
              const color = TYPE_COLORS[notification.type] || TYPE_COLORS.default

              return (
                <ListItem
                  key={notification._id}
                  disablePadding
                  sx={{
                    bgcolor: notification.read ? 'transparent' : alpha('#00A76F', 0.04),
                    borderLeft: notification.read ? '3px solid transparent' : '3px solid',
                    borderLeftColor: notification.read ? 'transparent' : 'primary.main',
                  }}
                >
                  <ListItemButton
                    onClick={() => handleMarkRead(notification)}
                    sx={{
                      px: 2,
                      py: 1.25,
                      gap: 1.5,
                      alignItems: 'flex-start',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        bgcolor: alpha(color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      <IconComponent sx={{ fontSize: 18, color }} />
                    </Box>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontSize: '0.82rem', fontWeight: notification.read ? 500 : 700, lineHeight: 1.3 }}>
                          {notification.title}
                        </Typography>
                      }
                      secondaryTypographyProps={{ component: 'span' }}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" sx={{ display: 'block', fontSize: '0.76rem', color: 'text.secondary', mt: 0.25 }}>
                            {notification.message}
                          </Typography>
                          <Typography component="span" variant="caption" sx={{ display: 'block', fontSize: '0.7rem', color: 'text.disabled', mt: 0.5 }}>
                            {formatTime(notification.createdAt)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        )}
      </Popover>
    </>
  )
}
