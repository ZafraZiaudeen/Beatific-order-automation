import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import { alpha } from '@mui/material/styles'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined'
import InventoryOutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import useAuthStore from '../stores/authStore'

const STAT_CARDS = [
  {
    title: 'Total Orders',
    value: '0',
    change: 'No orders yet',
    icon: ShoppingCartOutlinedIcon,
    color: '#00A76F',
    bgGradient: 'linear-gradient(135deg, #C8FAD6 0%, #5BE49B 100%)',
  },
  {
    title: 'Sent to Lulu',
    value: '0',
    change: 'Ready to start',
    icon: LocalPrintshopOutlinedIcon,
    color: '#3366FF',
    bgGradient: 'linear-gradient(135deg, #D6E4FF 0%, #84A9FF 100%)',
  },
  {
    title: 'Products Mapped',
    value: '0',
    change: 'Set up your library',
    icon: InventoryOutlinedIcon,
    color: '#FFAB00',
    bgGradient: 'linear-gradient(135deg, #FFF5CC 0%, #FFD666 100%)',
  },
  {
    title: 'Pending Review',
    value: '0',
    change: 'Import orders to begin',
    icon: PendingActionsOutlinedIcon,
    color: '#FF5630',
    bgGradient: 'linear-gradient(135deg, #FFE9D5 0%, #FFAC82 100%)',
  },
]

function StatCard({ title, value, change, icon: Icon, color, bgGradient }) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {value}
            </Typography>
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
            }}
          >
            <Icon sx={{ fontSize: 28, color }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user, company } = useAuthStore()

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
          <Typography
            variant="body1"
            sx={{ color: alpha('#fff', 0.72), maxWidth: 480, mb: 3, lineHeight: 1.7 }}
          >
            Your order automation dashboard is ready. Import orders from Etsy,
            manage your product library, and send to Lulu Print — all in one place.
          </Typography>
          <Typography variant="subtitle2" sx={{ color: alpha('#fff', 0.56) }}>
            {company?.name}
          </Typography>
        </CardContent>
        {/* Decorative shapes */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.04),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -60,
            right: 80,
            width: 160,
            height: 160,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.04),
          }}
        />
      </Card>

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {STAT_CARDS.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard {...card} />
          </Grid>
        ))}
      </Grid>

      {/* Quick actions placeholder */}
      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
            Getting Started
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
            Start by setting up your Product Library with Etsy listing IDs and cover images.
            Then upload an Etsy order export spreadsheet to begin processing orders.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
