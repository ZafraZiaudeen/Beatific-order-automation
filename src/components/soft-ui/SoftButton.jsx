import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'

const gradients = {
  primary: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  info: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
  warning: 'linear-gradient(135deg, #eab308 0%, #fbbf24 100%)',
  danger: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
  dark: 'linear-gradient(135deg, #27272a 0%, #3f3f46 100%)',
}

const shadowColors = {
  primary: 'rgba(249, 115, 22, 0.35)',
  info: 'rgba(14, 165, 233, 0.35)',
  success: 'rgba(34, 197, 94, 0.35)',
  warning: 'rgba(234, 179, 8, 0.35)',
  danger: 'rgba(239, 68, 68, 0.35)',
  dark: 'rgba(39, 39, 42, 0.35)',
}

export default function SoftButton({ children, variant = 'contained', color = 'primary', size = 'medium', sx, ...props }) {
  const isContained = variant === 'contained'
  const gradient = gradients[color] || gradients.primary
  const shadowColor = shadowColors[color] || shadowColors.primary

  return (
    <Button
      variant={variant}
      size={size}
      sx={{
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        fontSize: size === 'small' ? '0.8125rem' : '0.875rem',
        padding: size === 'small' ? '0.5rem 1rem' : '0.625rem 1.25rem',
        borderRadius: '0.75rem',
        textTransform: 'none',
        letterSpacing: 0,
        boxShadow: isContained ? `0 4px 7px -1px ${shadowColor}` : 'none',
        ...(isContained && {
          backgroundImage: gradient,
          border: 'none',
          color: '#fff',
          '&:hover': {
            backgroundImage: gradient,
            boxShadow: `0 6px 12px -1px ${shadowColor}`,
            transform: 'translateY(-1px)',
          },
        }),
        ...(variant === 'outlined' && {
          borderColor: alpha('#000', 0.12),
          color: '#3f3f46',
          '&:hover': {
            backgroundColor: '#f4f4f5',
            borderColor: alpha('#000', 0.2),
          },
        }),
        ...(variant === 'text' && {
          color: '#3f3f46',
          '&:hover': {
            backgroundColor: alpha('#000', 0.04),
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
