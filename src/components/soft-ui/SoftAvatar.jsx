import Avatar from '@mui/material/Avatar'

const gradients = {
  primary: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  info: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
  success: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
  warning: 'linear-gradient(135deg, #eab308 0%, #fbbf24 100%)',
  danger: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
  dark: 'linear-gradient(135deg, #27272a 0%, #3f3f46 100%)',
}

export default function SoftAvatar({ children, src, alt, size = 40, color = 'primary', sx, ...props }) {
  const gradient = gradients[color] || gradients.primary

  return (
    <Avatar
      src={src}
      alt={alt}
      sx={{
        width: size,
        height: size,
        borderRadius: '0.75rem',
        backgroundImage: !src ? gradient : undefined,
        color: '#fff',
        fontWeight: 600,
        fontSize: size < 36 ? '0.75rem' : '0.875rem',
        ...sx,
      }}
      {...props}
    >
      {children}
    </Avatar>
  )
}
