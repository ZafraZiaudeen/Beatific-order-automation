import { useEffect, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

function StatCard({ title, value, change, icon, color, bgGradient, loading }) {
  const IconComponent = icon
  return (
    <Card sx={{ height: '100%', background: bgGradient }}>
      <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          <IconComponent sx={{ fontSize: 26, color, flexShrink: 0 }} />
        </Box>
        <Box sx={{ lineHeight: 1, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {loading ? (
            <Skeleton width={64} height={42} />
          ) : (
            <Typography variant="h2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>
              {value}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 16, color }} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {change}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function QuickActionCard({ icon, title, description, to, color }) {
  const IconComponent = icon
  const navigate = useNavigate()
  return (
    <Card
      onClick={() => navigate(to)}
      sx={{
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: 'grey.50',
          boxShadow: (t) => `0 5px 12px ${alpha(t.palette.common.black, 0.12)}`,
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
          }}
        >
          <IconComponent sx={{ fontSize: 22, color }} />
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user, company, activeStore } = useAuthStore()
  const canManage = canManageWorkspace(user)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrders: 0,
    sentToLulu: 0,
    productsMapped: 0,
    pendingReview: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [recentLoading, setRecentLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const params = activeStore ? { storeId: activeStore._id } : {}
      const [countsRes, productsRes] = await Promise.all([
        api.get('/orders/status-counts', { params }),
        api.get('/products', { params }),
      ])

      const counts = countsRes.data || {}
      const products = productsRes.data || []

      const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0)
      const sentToLulu = (counts.in_progress || 0) + (counts.completed || 0)
      const pendingReview = (counts.waiting || 0) + (counts.custom_orders || 0)
      const productsMapped = products.filter((p) => p.coverImageUrl && p.podPackageId).length

      setStats({ totalOrders, sentToLulu, productsMapped, pendingReview })
    } catch {
      //
    } finally {
      setStatsLoading(false)
    }
  }, [activeStore])

  const fetchRecent = useCallback(async () => {
    setRecentLoading(true)
    try {
      const params = { limit: 8, page: 1, ...(activeStore && { storeId: activeStore._id }) }
      const { data } = await api.get('/orders', { params })
      setRecentOrders(data.orders || [])
    } catch {
      //
    } finally {
      setRecentLoading(false)
    }
  }, [activeStore])

  useEffect(() => {
    fetchStats()
    fetchRecent()
  }, [fetchStats, fetchRecent])

  const STAT_CARDS = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      change: stats.totalOrders > 0 ? 'All time' : 'No orders yet',
      icon: ShoppingCartOutlinedIcon,
      color: '#00A76F',
      bgGradient: 'linear-gradient(320deg, rgba(211, 252, 210, 0.7) 0%, #ffffff 70%)',
    },
    {
      title: 'Sent to Lulu',
      value: stats.sentToLulu,
      change: 'In progress + Completed',
      icon: LocalPrintshopOutlinedIcon,
      color: '#00B8D9',
      bgGradient: 'linear-gradient(320deg, rgba(202, 253, 245, 0.7) 0%, #ffffff 70%)',
    },
    {
      title: 'Products Mapped',
      value: stats.productsMapped,
      change: 'With cover + Pod ID',
      icon: Inventory2OutlinedIcon,
      color: '#FFAB00',
      bgGradient: 'linear-gradient(320deg, rgba(255, 245, 204, 0.7) 0%, #ffffff 70%)',
    },
    {
      title: 'Pending Review',
      value: stats.pendingReview,
      change: 'Waiting + Custom + Drawings',
      icon: PendingActionsOutlinedIcon,
      color: '#FF5630',
      bgGradient: 'linear-gradient(320deg, rgba(255, 233, 213, 0.7) 0%, #ffffff 70%)',
    },
  ]

  const QUICK_ACTIONS = [
    canManage && {
      icon: UploadFileOutlinedIcon,
      title: 'Import Orders',
      description: 'Upload an Etsy spreadsheet to import and process orders',
      to: '/import',
      color: '#00A76F',
    },
    {
      icon: Inventory2OutlinedIcon,
      title: 'Product Library',
      description: 'Map Etsy listing IDs to cover images and Lulu specs',
      to: '/products',
      color: '#FFAB00',
    },
    canManage && {
      icon: GroupAddOutlinedIcon,
      title: 'Invite Team',
      description: 'Add designers and reviewers to your workspace',
      to: '/settings/team',
      color: '#637381',
    },
  ].filter(Boolean)

  const navigate = useNavigate()

  return (
    <Box>
      {/* Welcome banner */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(97.05deg, #008fba 0%, #00a76f 100%)',
          color: '#fff',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1.25, color: '#fff', fontSize: 0 }}>
            <Box component="span" sx={{ fontSize: { xs: '1.53125rem', sm: '1.75rem' }, lineHeight: 1.25 }}>
              Welcome back, {user?.name?.split(' ')[0]}!
            </Box>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </Typography>
          <Typography variant="body1" sx={{ color: alpha('#fff', 0.72), maxWidth: 480, mb: 3, lineHeight: 1.7 }}>
            {canManage
              ? 'Your order automation dashboard is ready. Import orders from Etsy, manage your product library, and send to Lulu Print, all in one place.'
              : 'Your order dashboard is ready. Review Etsy and Lulu orders, check product mappings, and keep an eye on fulfillment progress.'}
          </Typography>
          <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.56) }}>
            {company?.name}
          </Typography>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {STAT_CARDS.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard {...card} loading={statsLoading} />
          </Grid>
        ))}
      </Grid>

      {/* Quick actions + Recent orders */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent Orders</Typography>
              {recentLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <Skeleton width="20%" />
                    <Skeleton width="30%" />
                    <Skeleton width="30%" />
                    <Skeleton width="20%" />
                  </Box>
                ))
              ) : recentOrders.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ShoppingCartOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No orders yet</Typography>
                  {canManage && (
                    <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => navigate('/import')}>
                      Import Orders
                    </Button>
                  )}
                </Box>
              ) : (
                <>
                  {recentOrders.map((order) => (
                    <Box
                      key={order._id}
                      onClick={() => navigate('/orders/etsy')}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1.25,
                        px: 1.5,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 90, color: 'text.secondary' }}>
                        #{order.etsyOrderId}
                      </Typography>
                      <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{order.customerName}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.productTitle}
                      </Typography>
                      <Box
                        sx={{
                          px: 1.25,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: alpha('#00A76F', 0.08),
                          color: 'primary.dark',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          flexShrink: 0,
                        }}
                      >
                        {order.etsyStatus.replace(/_/g, ' ')}
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, textAlign: 'center', '& .MuiButton-root:last-of-type': { display: 'none' } }}>
                    <Button size="small" onClick={() => navigate('/orders/etsy')}>View all orders</Button>
                    <Button size="small" onClick={() => navigate('/orders/etsy')}>View all orders →</Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Quick Actions</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard key={action.to} {...action} />
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
