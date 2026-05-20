import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'

const colorMap = {
  primary: { bg: alpha('#f97316', 0.1), color: '#f97316' },
  success: { bg: alpha('#22c55e', 0.1), color: '#22c55e' },
  info: { bg: alpha('#0ea5e9', 0.1), color: '#0ea5e9' },
  warning: { bg: alpha('#eab308', 0.1), color: '#eab308' },
  danger: { bg: alpha('#ef4444', 0.1), color: '#ef4444' },
  error: { bg: alpha('#ef4444', 0.1), color: '#ef4444' },
  default: { bg: alpha('#71717a', 0.1), color: '#71717a' },
}

export default function SoftBadge({ label, color = 'default', size = 'small', icon, sx, ...props }) {
  const colors = colorMap[color] || colorMap.default

  return (
    <Chip
      label={label}
      size={size}
      icon={icon}
      sx={{
        backgroundColor: colors.bg,
        color: colors.color,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        height: size === 'small' ? '22px' : '28px',
        borderRadius: '0.75rem',
        textTransform: 'capitalize',
        '& .MuiChip-icon': {
          color: colors.color,
          fontSize: '14px',
        },
        ...sx,
      }}
      {...props}
    />
  )
}
