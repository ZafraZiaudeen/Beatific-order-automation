import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function SoftPageHeader({ title, subtitle, breadcrumbs, actions }) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: '0.875rem',
            color: '#71717a',
            mb: 0.5,
            '& > *:not(:last-child)::after': {
              content: '"/"',
              marginLeft: '0.5rem',
              color: '#a1a1aa',
            },
          }}
        >
          {breadcrumbs}
        </Box>
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: '1.875rem',
              fontWeight: 700,
              color: '#27272a',
              mb: subtitle ? 0.5 : 0,
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.875rem',
                color: '#71717a',
                lineHeight: 1.6,
                maxWidth: '48rem',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {actions}
          </Box>
        )}
      </Box>
    </Box>
  )
}
