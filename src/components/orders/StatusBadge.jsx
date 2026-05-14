import Chip from '@mui/material/Chip'

const STATUS_COLORS = {
  custom_orders: { bg: '#F3E5F5', color: '#7B1FA2', label: 'Custom Orders' },
  waiting: { bg: '#FFF8E1', color: '#F57F17', label: 'Waiting (Unmapped)' },
  in_progress: { bg: '#E3F2FD', color: '#1565C0', label: 'In Progress' },
  completed: { bg: '#E8F5E9', color: '#1B5E20', label: 'Completed' },
  // Lulu statuses
  pending: { bg: '#F5F5F5', color: '#616161', label: 'Pending' },
  submitted: { bg: '#E3F2FD', color: '#1565C0', label: 'Submitted' },
  in_production: { bg: '#FFF8E1', color: '#E65100', label: 'In Production' },
  shipped: { bg: '#E8F5E9', color: '#1B5E20', label: 'Shipped' },
  failed: { bg: '#FFEBEE', color: '#C62828', label: 'Failed' },
}

export default function StatusBadge({ status, size = 'small' }) {
  const config = STATUS_COLORS[status] || { bg: '#F5F5F5', color: '#616161', label: status }

  return (
    <Chip
      label={config.label}
      size={size}
      sx={{
        fontWeight: 600,
        bgcolor: config.bg,
        color: config.color,
        border: 'none',
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
      }}
    />
  )
}
