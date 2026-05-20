import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import { alpha } from '@mui/material/styles'

export default function SoftInput({ startIcon, endIcon, ...props }) {
  return (
    <TextField
      {...props}
      InputProps={{
        startAdornment: startIcon && <InputAdornment position="start">{startIcon}</InputAdornment>,
        endAdornment: endIcon && <InputAdornment position="end">{endIcon}</InputAdornment>,
        ...props.InputProps,
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.875rem',
          borderRadius: '0.75rem',
          backgroundColor: '#fff',
          transition: 'all 0.15s ease',
          '& fieldset': {
            borderColor: alpha('#000', 0.12),
          },
          '&:hover fieldset': {
            borderColor: alpha('#000', 0.2),
          },
          '&.Mui-focused fieldset': {
            borderColor: '#f97316',
            borderWidth: '1px',
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha('#f97316', 0.1)}`,
          },
        },
        '& .MuiInputBase-input': {
          padding: '0.625rem 0.875rem',
          '&::placeholder': {
            color: '#a1a1aa',
            opacity: 1,
          },
        },
        '& .MuiInputLabel-root': {
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: '#f97316',
          },
        },
        ...props.sx,
      }}
    />
  )
}
