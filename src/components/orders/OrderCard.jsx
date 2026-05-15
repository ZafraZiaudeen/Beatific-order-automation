import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTimeOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'

const formatShipDate = (d) => {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const isOverdue = (d) => d && new Date(d) < new Date()
const isDueSoon = (d) => {
  if (!d) return false
  const diff = new Date(d) - new Date()
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000
}

export default function OrderCard({ order, onClick, isDragging }) {
  const overdue = isOverdue(order.shipByDate)
  const dueSoon = isDueSoon(order.shipByDate)
  const shipDate = formatShipDate(order.shipByDate)
  const reviewFlags = (order.aiFlags || []).filter((flag) => flag !== 'Missing Product Mapping')

  return (
    <Card
      onClick={onClick}
      sx={{
        mb: 1.5,
        cursor: 'pointer',
        borderRadius: 2,
        border: '1px solid',
        borderColor: isDragging ? 'primary.main' : 'divider',
        boxShadow: isDragging
          ? (t) => `0 16px 32px -4px ${alpha(t.palette.grey[500], 0.32)}`
          : (t) => `0 1px 3px ${alpha(t.palette.grey[500], 0.12)}`,
        transform: isDragging ? 'rotate(1.5deg)' : 'none',
        opacity: isDragging ? 0.92 : 1,
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': {
          boxShadow: (t) => `0 8px 20px -4px ${alpha(t.palette.grey[500], 0.2)}`,
          transform: isDragging ? 'rotate(1.5deg)' : 'translateY(-1px)',
          borderColor: 'primary.light',
        },
        userSelect: 'none',
      }}
    >
      <CardContent sx={{ p: '12px 14px !important' }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.72rem' }}
          >
            #{order.etsyOrderId}
          </Typography>
          {shipDate && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: overdue ? 'error.main' : dueSoon ? 'warning.dark' : 'text.disabled',
              }}
            >
              {overdue ? '⏰ ' : ''}{shipDate}
            </Typography>
          )}
        </Box>

        {/* Customer */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.25, lineHeight: 1.3 }}>
          {order.customerName}
        </Typography>

        {/* Product title */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: '0.78rem',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1,
          }}
        >
          {order.productTitle}
        </Typography>

        {/* Footer */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', mr: 0.5 }}>
            Qty {order.quantity} · ${order.price?.toFixed(2)}
          </Typography>

          {!order.isProductMapped && (
            <Tooltip title="Listing ID not mapped to a product">
              <Chip
                icon={<WarningAmberIcon sx={{ fontSize: '11px !important' }} />}
                label="Unmapped"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
              />
            </Tooltip>
          )}

          {reviewFlags.length > 0 && (
            <Tooltip title={reviewFlags.join('; ')}>
              <Chip
                icon={<WarningAmberIcon sx={{ fontSize: '11px !important' }} />}
                label="AI"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
              />
            </Tooltip>
          )}

          {order.hasCustomArtwork && (
            <Tooltip title="Custom artwork order">
              <Chip
                icon={<PaletteOutlinedIcon sx={{ fontSize: '11px !important' }} />}
                label="Custom"
                size="small"
                color="secondary"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
              />
            </Tooltip>
          )}

          {overdue && (
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: '11px !important' }} />}
              label="Overdue"
              size="small"
              color="error"
              variant="filled"
              sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
