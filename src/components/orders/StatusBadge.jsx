import Chip from '@mui/material/Chip'

const STATUS_COLORS = {
  custom_orders: { bg: '#F9FAFB', color: '#454F5B', label: 'Custom Orders' },
  waiting: { bg: '#FFF5CC', color: '#B76E00', label: 'Waiting / Review' },
  in_progress: { bg: '#CAFDF5', color: '#006C9C', label: 'In Progress' },
  completed: { bg: '#D3FCD2', color: '#118D57', label: 'Completed' },
  // Lulu statuses
  pending: { bg: '#F4F6F8', color: '#637381', label: 'Pending' },
  submitted: { bg: '#CAFDF5', color: '#006C9C', label: 'Submitted' },
  in_production: { bg: '#FFF5CC', color: '#B76E00', label: 'In Production' },
  shipped: { bg: '#D3FCD2', color: '#118D57', label: 'Shipped' },
  failed: { bg: '#FFE9D5', color: '#B71D18', label: 'Failed' },
}

export default function StatusBadge({ status, size = 'small', label }) {
  const config = STATUS_COLORS[status] || { bg: '#F5F5F5', color: '#616161', label: status }

  return (
    <Chip
      label={label || config.label}
      size={size}
      sx={{
        fontWeight: 600,
        bgcolor: config.bg,
        color: config.color,
        border: 'none',
        borderRadius: '4px',
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
      }}
    />
  )
}
