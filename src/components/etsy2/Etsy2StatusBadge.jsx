import { Chip, Box } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import SyncIcon from '@mui/icons-material/Sync'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { getStatusBadgeProps } from '../../lib/etsy2Constants'

const ICON_MAP = {
  warning: WarningAmberIcon,
  help: HelpOutlineIcon,
  edit: EditIcon,
  check: CheckIcon,
  sync: SyncIcon,
  check_circle: CheckCircleIcon,
}

export default function Etsy2StatusBadge({ status, size = 'small', showIcon = true }) {
  const config = getStatusBadgeProps(status)
  const IconComponent = ICON_MAP[config.icon]

  return (
    <Chip
      label={config.label}
      size={size}
      icon={showIcon && IconComponent ? <IconComponent sx={{ fontSize: '14px !important' }} /> : undefined}
      sx={{
        bgcolor: config.bgColor,
        color: config.color,
        fontWeight: 600,
        fontSize: '0.75rem',
        height: size === 'small' ? '24px' : '28px',
        borderRadius: '6px',
        '& .MuiChip-icon': {
          color: config.color,
          marginLeft: '6px',
        },
        '& .MuiChip-label': {
          px: 1,
        },
      }}
    />
  )
}
