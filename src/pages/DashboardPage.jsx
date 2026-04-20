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
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

function StatCard({ title, value, change, icon: Icon, color, bgGradient, loading }) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
              {title}
            </Typography>
            {loading ? (
              <Skeleton width={60} height={40} />
            ) : (
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {value}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 16, color }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {change}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: bgGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 28, color }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

function QuickActionCard({ icon: Icon, title, description, to, color }) {
  const navigate = useNavigate()
  return (
    <Card
      onClick={() => navigate(to)}
      sx={{
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: (t) => `0 8px 20px -4px ${alpha(t.palette.grey[500], 0.15)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: '12px',
            bgcolor: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1.5,
          }}
        >
          <Icon sx={{ fontSize: 22, color }} />
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
      const pendingReview = (counts.waiting || 0) + (counts.custom_orders || 0) + (counts.drawings || 0)
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
      bgGradient: 'linear-gradient(135deg, #C8FAD6 0%, #5BE49B 100%)',
    },
    {
      title: 'Sent to Lulu',
      value: stats.sentToLulu,
      change: 'In progress + Completed',
      icon: LocalPrintshopOutlinedIcon,
      color: '#3366FF',
      bgGradient: 'linear-gradient(135deg, #D6E4FF 0%, #84A9FF 100%)',
    },
    {
      title: 'Products Mapped',
      value: stats.productsMapped,
      change: 'With cover + Pod ID',
      icon: Inventory2OutlinedIcon,
      color: '#FFAB00',
      bgGradient: 'linear-gradient(135deg, #FFF5CC 0%, #FFD666 100%)',
    },
    {
      title: 'Pending Review',
      value: stats.pendingReview,
      change: 'Waiting + Custom + Drawings',
      icon: PendingActionsOutlinedIcon,
      color: '#FF5630',
      bgGradient: 'linear-gradient(135deg, #FFE9D5 0%, #FFAC82 100%)',
    },
  ]

  const QUICK_ACTIONS = [
    {
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
    {
      icon: GroupAddOutlinedIcon,
      title: 'Invite Team',
      description: 'Add designers and reviewers to your workspace',
      to: '/settings/team',
      color: '#8E33FF',
    },
  ]

  const navigate = useNavigate()

  return (
    <Box>
      {/* Welcome banner */}
      <Card
        sx={{
          mb: 4,
          background: 'linear-gradient(135deg, #004B50 0%, #007867 100%)',
          color: '#fff',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#fff' }}>
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </Typography>
          <Typography variant="body1" sx={{ color: alpha('#fff', 0.72), maxWidth: 480, mb: 3, lineHeight: 1.7 }}>
            Your order automation dashboard is ready. Import orders from Etsy, manage your product library, and send to Lulu Print, all in one place.
          </Typography>
          <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.56) }}>
            {company?.name}
          </Typography>
        </CardContent>
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#fff', 0.04) }} />
        <Box sx={{ position: 'absolute', bottom: -60, right: 80, width: 160, height: 160, borderRadius: '50%', bgcolor: alpha('#fff', 0.04) }} />
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
                  <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => navigate('/import')}>
                    Import Orders
                  </Button>
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
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
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
