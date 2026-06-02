import { SoftBadge } from '../soft-ui'

const STATUS_COLORS = {
  custom_orders: { color: 'default', label: 'Custom Orders' },
  waiting: { color: 'warning', label: 'Waiting / Review' },
  in_progress: { color: 'info', label: 'In Progress' },
  completed: { color: 'success', label: 'Completed' },
  pending: { color: 'default', label: 'Pending' },
  unpaid: { color: 'warning', label: 'Unpaid' },
  submitted: { color: 'info', label: 'Submitted' },
  in_production: { color: 'warning', label: 'In Production' },
  shipped: { color: 'success', label: 'Shipped' },
  failed: { color: 'error', label: 'Failed' },
}

export default function StatusBadge({ status, size = 'small', label }) {
  const config = STATUS_COLORS[status] || { color: 'default', label: status }

  return (
    <SoftBadge
      label={label || config.label}
      color={config.color}
      size={size}
    />
  )
}
