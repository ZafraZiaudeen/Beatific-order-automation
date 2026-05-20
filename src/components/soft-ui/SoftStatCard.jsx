import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import SoftCard from './SoftCard'
import { alpha } from '@mui/material/styles'

export default function SoftStatCard({ title, value, caption, icon: Icon, gradient, loading }) {
  return (
    <SoftCard hover={false} sx={{ position: 'relative', overflow: 'visible' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: gradient,
          opacity: 0,
          transition: 'opacity 0.2s ease',
          '.MuiBox-root:hover &': {
            opacity: 1,
          },
        }}
      />
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '1rem',
            backgroundImage: gradient,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 7px -1px ${alpha(gradient.match(/#[0-9a-f]{6}/i)?.[0] || '#f97316', 0.35)}`,
            flexShrink: 0,
          }}
        >
          {Icon && <Icon sx={{ fontSize: 24 }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#71717a',
              display: 'block',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          {loading ? (
            <>
              <Skeleton width="60%" height={32} />
              <Skeleton width="80%" height={16} sx={{ mt: 0.5 }} />
            </>
          ) : (
            <>
              <Typography
                variant="h4"
                sx={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: '#27272a',
                  lineHeight: 1.2,
                  mb: 0.25,
                }}
              >
                {value}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.8125rem',
                  color: '#71717a',
                  display: 'block',
                }}
              >
                {caption}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </SoftCard>
  )
}
