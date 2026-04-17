import { useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'

export default function PlaceholderPage() {
  const location = useLocation()
  const pageName = location.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
    .join(' › ')

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <Card sx={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <CardContent sx={{ p: 5 }}>
          <ConstructionOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" sx={{ mb: 1 }}>
            {pageName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This section is under construction. It will be available soon.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
