import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function SoftEmptyState({ icon: Icon, title, description, action }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 3,
      }}
    >
      {Icon && (
        <Box
          sx={{
            width: 64,
            height: 64,
            margin: '0 auto 1.5rem',
            borderRadius: '1.5rem',
            backgroundColor: '#f4f4f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a1a1aa',
          }}
        >
          <Icon sx={{ fontSize: 32 }} />
        </Box>
      )}
      <Typography
        variant="h6"
        sx={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#27272a',
          mb: 0.5,
        }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            color: '#71717a',
            mb: action ? 2 : 0,
            maxWidth: '28rem',
            margin: '0 auto',
          }}
        >
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  )
}
