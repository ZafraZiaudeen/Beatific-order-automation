import { forwardRef } from 'react'
import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'

const SoftCard = forwardRef(({ children, gradient, hover = true, sx, ...props }, ref) => {
  return (
    <Box
      ref={ref}
      sx={{
        background: gradient || '#fff',
        borderRadius: '1rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid',
        borderColor: alpha('#000', 0.05),
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        ...(hover && {
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-2px)',
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  )
})

SoftCard.displayName = 'SoftCard'

export default SoftCard
