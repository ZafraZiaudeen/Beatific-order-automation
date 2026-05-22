// Re-export new Soft UI components for backward compatibility
export {
  SoftCard,
  SoftButton,
  SoftStatCard,
  SoftTable,
  SoftTableHead,
  SoftTableBody,
  SoftTableRow,
  SoftTableCell,
  SoftBadge,
  SoftAvatar,
  SoftInput,
  SoftPageHeader,
  SoftEmptyState,
} from '../soft-ui'

// Legacy exports with new implementations
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/SearchOutlined'
import { SoftCard as Card2, SoftPageHeader as PageHeader2, SoftEmptyState as EmptyState2 } from '../soft-ui'

// Backward compatibility aliases
export const PageHeader = PageHeader2
export const EmptyState = EmptyState2

export function SoftTableCard({ title, subtitle, toolbar, children, footer, sx }) {
  return (
    <Card2 sx={{ mb: 3, ...sx }}>
      {(title || subtitle || toolbar) && (
        <Box sx={{ px: 3, pt: 2.5, pb: 0, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 0 }}>
            {title && <Typography variant="h6" sx={{ mb: 0, fontWeight: 700, color: '#27272a' }}>{title}</Typography>}
            {subtitle && <Typography variant="body2" sx={{ mt: 0.35, color: '#71717a', fontSize: '0.875rem' }}>{subtitle}</Typography>}
          </Box>
          {toolbar && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{toolbar}</Box>}
        </Box>
      )}
      <Box sx={{ px: 0, pt: (title || subtitle || toolbar) ? 2 : 0, pb: 1 }}>
        {children}
      </Box>
      {footer && (
        <>
          <Divider />
          <Box sx={{ px: 2.5, py: 1.6 }}>{footer}</Box>
        </>
      )}
    </Card2>
  )
}

export function DataToolbar({ search, filters, actions, selection }) {
  return (
    <Card2 sx={{ mb: 2 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(260px, 1fr) auto auto' },
            gap: 1,
            alignItems: 'center',
          }}
        >
          {search ? (
            <TextField
              size="small"
              placeholder={search.placeholder || 'Search...'}
              value={search.value}
              onChange={search.onChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: '#71717a' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          ) : <Box />}
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {filters}
          </Stack>
          <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {selection}
            {actions}
          </Stack>
        </Box>
      </CardContent>
    </Card2>
  )
}
