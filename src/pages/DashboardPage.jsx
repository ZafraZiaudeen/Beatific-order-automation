import { useEffect, useState, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import useAuthStore from '../stores/authStore'
import { canManageWorkspace } from '../lib/permissions'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { SoftCard, SoftButton, SoftStatCard, SoftPageHeader, SoftEmptyState } from '../components/soft-ui'

const softGradients = {
  primary: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  info: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
  warning: 'linear-gradient(135deg, #eab308 0%, #fbbf24 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
  dark: 'linear-gradient(135deg, #27272a 0%, #3f3f46 100%)',
}

function QuickActionCard({ icon, title, description, to, gradient }) {
  const IconComponent = icon
  const navigate = useNavigate()
  return (
    <SoftCard
      onClick={() => navigate(to)}
      sx={{
        cursor: 'pointer',
        p: 2.5,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '1rem',
          backgroundImage: gradient,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          boxShadow: `0 4px 7px -1px ${alpha(gradient.match(/#[0-9a-f]{6}/i)?.[0] || '#f97316', 0.35)}`,
        }}
      >
        <IconComponent sx={{ fontSize: 24 }} />
      </Box>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, mb: 0.5, color: '#27272a' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.6, fontSize: '0.875rem' }}>
        {description}
      </Typography>
    </SoftCard>
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
  const navigate = useNavigate()

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

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      caption: stats.totalOrders > 0 ? 'All imported orders' : 'No orders yet',
      icon: ShoppingCartOutlinedIcon,
      gradient: softGradients.primary,
    },
    {
      title: 'Sent to Lulu',
      value: stats.sentToLulu,
      caption: 'In progress and complete',
      icon: LocalPrintshopOutlinedIcon,
      gradient: softGradients.info,
    },
    {
      title: 'Products Mapped',
      value: stats.productsMapped,
      caption: 'With cover and Pod ID',
      icon: Inventory2OutlinedIcon,
      gradient: softGradients.warning,
    },
    {
      title: 'Pending Review',
      value: stats.pendingReview,
      caption: 'Waiting, custom, or flagged',
      icon: PendingActionsOutlinedIcon,
      gradient: softGradients.error,
    },
  ]

  const quickActions = [
    {
      icon: Inventory2OutlinedIcon,
      title: 'Product Library',
      description: 'Map Etsy listing IDs to template files and Lulu specs.',
      to: '/products',
      gradient: softGradients.warning,
    },
    canManage && {
      icon: GroupAddOutlinedIcon,
      title: 'Invite Team',
      description: 'Add designers and reviewers to the order workflow.',
      to: '/settings/team',
      gradient: softGradients.dark,
    },
  ].filter(Boolean)

  return (
    <Box>
      <SoftPageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        subtitle={`Soft UI order control center for ${company?.name || 'your workspace'}. Track Etsy intake, template readiness, and Lulu fulfillment in one place.`}
        actions={
          canManage && (
            <SoftButton startIcon={<ShoppingCartOutlinedIcon />} onClick={() => navigate('/orders/etsy')}>
              Open Orders
            </SoftButton>
          )
        }
      />

      {/* Hero Card */}
      <SoftCard
        sx={{
          mb: 3,
          overflow: 'hidden',
          color: '#fff',
          backgroundImage: 'linear-gradient(135deg, #27272A 0%, #18181B 55%, #EA580C 130%)',
        }}
      >
        <Box sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.18,
              background: 'radial-gradient(circle at 80% 20%, #FACC15 0, transparent 35%)',
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 760 }}>
            <Chip
              label={activeStore?.name || 'All stores'}
              size="small"
              sx={{
                bgcolor: alpha('#fff', 0.12),
                color: '#fff',
                mb: 2,
                border: `1px solid ${alpha('#fff', 0.16)}`,
                fontWeight: 600,
              }}
            />
            <Typography variant="h3" sx={{ color: '#fff', mb: 1, fontWeight: 700, fontSize: '2rem' }}>
              Order automation dashboard
            </Typography>
            <Typography variant="body1" sx={{ color: alpha('#fff', 0.74), maxWidth: 620, lineHeight: 1.7 }}>
              Review incoming Etsy orders, fill templates, and send Lulu-ready work downstream without leaving the dashboard.
            </Typography>
          </Box>
        </Box>
      </SoftCard>

      {/* Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <SoftStatCard {...card} loading={statsLoading} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Orders & Quick Actions */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <SoftCard sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: alpha('#000', 0.08) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#27272a', mb: 0.25 }}>
                    Recent orders
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#71717a', fontSize: '0.875rem' }}>
                    Latest Etsy intake across the selected store
                  </Typography>
                </Box>
                <SoftButton
                  size="small"
                  variant="text"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/orders/etsy')}
                  sx={{ color: '#71717a' }}
                >
                  View all
                </SoftButton>
              </Box>
            </Box>

            {recentLoading ? (
              <Box sx={{ p: 2.5 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <Skeleton width="18%" height={24} sx={{ borderRadius: '0.5rem' }} />
                    <Skeleton width="28%" height={24} sx={{ borderRadius: '0.5rem' }} />
                    <Skeleton width="34%" height={24} sx={{ borderRadius: '0.5rem' }} />
                    <Skeleton width="12%" height={24} sx={{ borderRadius: '0.5rem' }} />
                  </Box>
                ))}
              </Box>
            ) : recentOrders.length === 0 ? (
              <SoftEmptyState
                icon={ShoppingCartOutlinedIcon}
                title="No orders yet"
                description="Fetch email orders or add a manual order to begin the workflow."
                action={
                  canManage && (
                    <SoftButton onClick={() => navigate('/orders/etsy')}>
                      Open Etsy Orders
                    </SoftButton>
                  )
                }
              />
            ) : (
              <Box sx={{ p: 1.5 }}>
                {recentOrders.map((order) => (
                  <Box
                    key={order._id}
                    onClick={() => navigate('/orders/etsy')}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '110px minmax(0, 1fr) minmax(120px, 0.8fr) auto' },
                      alignItems: 'center',
                      gap: 1.5,
                      py: 1.5,
                      px: 2,
                      borderRadius: '0.75rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: '#f4f4f5' },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: 'monospace',
                        color: '#f97316',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                      }}
                    >
                      #{order.etsyOrderId}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#27272a' }}>
                      {order.customerName}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#71717a',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {order.productTitle}
                    </Typography>
                    <Chip
                      label={String(order.etsyStatus || '').replace(/_/g, ' ')}
                      size="small"
                      sx={{
                        bgcolor: alpha('#f97316', 0.1),
                        color: '#f97316',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </SoftCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <SoftCard sx={{ overflow: 'hidden' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: alpha('#000', 0.08) }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#27272a', mb: 0.25 }}>
                Quick Actions
              </Typography>
              <Typography variant="body2" sx={{ color: '#71717a', fontSize: '0.875rem' }}>
                Shortcuts for the next useful step
              </Typography>
            </Box>
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {quickActions.map((action) => (
                <QuickActionCard key={action.to} {...action} />
              ))}
            </Box>
          </SoftCard>
        </Grid>
      </Grid>
    </Box>
  )
}
