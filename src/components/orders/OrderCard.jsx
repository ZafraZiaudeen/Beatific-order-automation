import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { alpha } from '@mui/material/styles'
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined'
import AccessTimeIcon from '@mui/icons-material/AccessTimeOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import { SoftCard, SoftBadge } from '../soft-ui'

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
    <SoftCard
      onClick={onClick}
      hover={!isDragging}
      sx={{
        mb: 1.5,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: isDragging ? '#f97316' : alpha('#000', 0.05),
        boxShadow: isDragging
          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        transform: isDragging ? 'rotate(1.5deg)' : 'none',
        opacity: isDragging ? 0.92 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          transform: isDragging ? 'rotate(1.5deg)' : 'translateY(-2px)',
          borderColor: alpha('#f97316', 0.3),
        },
        userSelect: 'none',
      }}
    >
      <Box sx={{ p: 1.75 }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', color: '#f97316', fontSize: '0.75rem', fontWeight: 700 }}
          >
            #{order.etsyOrderId}
          </Typography>
          {shipDate && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: overdue ? '#ef4444' : dueSoon ? '#eab308' : '#a1a1aa',
              }}
            >
              {overdue ? 'Late ' : ''}{shipDate}
            </Typography>
          )}
        </Box>

        {/* Customer */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.3, color: '#27272a' }}>
          {order.customerName}
        </Typography>

        {/* Product title */}
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            lineHeight: 1.5,
            color: '#71717a',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1.25,
          }}
        >
          {order.productTitle}
        </Typography>

        {/* Footer */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ color: '#a1a1aa', fontSize: '0.75rem', mr: 0.5, fontWeight: 600 }}>
            Qty {order.quantity} / ${order.price?.toFixed(2)}
          </Typography>

          {!order.isProductMapped && (
            <Tooltip title="Listing ID not mapped to a product">
              <Box>
                <SoftBadge
                  icon={<WarningAmberIcon />}
                  label="Unmapped"
                  color="warning"
                  size="small"
                />
              </Box>
            </Tooltip>
          )}

          {reviewFlags.length > 0 && (
            <Tooltip title={reviewFlags.join('; ')}>
              <Box>
                <SoftBadge
                  icon={<WarningAmberIcon />}
                  label="AI"
                  color="warning"
                  size="small"
                />
              </Box>
            </Tooltip>
          )}

          {order.hasCustomArtwork && (
            <Tooltip title="Custom artwork order">
              <Box>
                <SoftBadge
                  icon={<PaletteOutlinedIcon />}
                  label="Custom"
                  color="default"
                  size="small"
                />
              </Box>
            </Tooltip>
          )}

          {overdue && (
            <SoftBadge
              icon={<AccessTimeIcon />}
              label="Overdue"
              color="error"
              size="small"
            />
          )}
        </Box>
      </Box>
    </SoftCard>
  )
}
