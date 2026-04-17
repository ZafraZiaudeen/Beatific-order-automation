import { createTheme, alpha } from '@mui/material/styles'

const GREY = {
  0: '#FFFFFF',
  100: '#F9FAFB',
  200: '#F4F6F8',
  300: '#DFE3E8',
  400: '#C4CDD5',
  500: '#919EAB',
  600: '#637381',
  700: '#454F5B',
  800: '#212B36',
  900: '#161C24',
}

const PRIMARY = {
  lighter: '#C8FAD6',
  light: '#5BE49B',
  main: '#00A76F',
  dark: '#007867',
  darker: '#004B50',
  contrastText: '#FFFFFF',
}

const SECONDARY = {
  lighter: '#EFD6FF',
  light: '#C684FF',
  main: '#8E33FF',
  dark: '#5119B7',
  darker: '#27097A',
  contrastText: '#FFFFFF',
}

const INFO = {
  lighter: '#CAFDF5',
  light: '#61F3F3',
  main: '#00B8D9',
  dark: '#006C9C',
  darker: '#003768',
  contrastText: '#FFFFFF',
}

const SUCCESS = {
  lighter: '#D3FCD2',
  light: '#77ED8B',
  main: '#22C55E',
  dark: '#118D57',
  darker: '#065E49',
  contrastText: '#FFFFFF',
}

const WARNING = {
  lighter: '#FFF5CC',
  light: '#FFD666',
  main: '#FFAB00',
  dark: '#B76E00',
  darker: '#7A4100',
  contrastText: GREY[800],
}

const ERROR = {
  lighter: '#FFE9D5',
  light: '#FFAC82',
  main: '#FF5630',
  dark: '#B71D18',
  darker: '#7A0916',
  contrastText: '#FFFFFF',
}

const theme = createTheme({
  palette: {
    primary: PRIMARY,
    secondary: SECONDARY,
    info: INFO,
    success: SUCCESS,
    warning: WARNING,
    error: ERROR,
    grey: GREY,
    text: {
      primary: GREY[800],
      secondary: GREY[600],
      disabled: GREY[500],
    },
    background: {
      paper: '#FFFFFF',
      default: GREY[200],
    },
    divider: alpha(GREY[500], 0.2),
    action: {
      hover: alpha(GREY[500], 0.08),
      selected: alpha(GREY[500], 0.12),
      disabled: alpha(GREY[500], 0.8),
      disabledBackground: alpha(GREY[500], 0.24),
      focus: alpha(GREY[500], 0.24),
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: { fontWeight: 800, lineHeight: 1.2, fontSize: '2.5rem' },
    h2: { fontWeight: 800, lineHeight: 1.3, fontSize: '2rem' },
    h3: { fontWeight: 700, lineHeight: 1.4, fontSize: '1.5rem' },
    h4: { fontWeight: 700, lineHeight: 1.4, fontSize: '1.25rem' },
    h5: { fontWeight: 700, lineHeight: 1.5, fontSize: '1.125rem' },
    h6: { fontWeight: 700, lineHeight: 1.55, fontSize: '1rem' },
    subtitle1: { fontWeight: 600, lineHeight: 1.55, fontSize: '1rem' },
    subtitle2: { fontWeight: 600, lineHeight: 1.55, fontSize: '0.875rem' },
    body1: { lineHeight: 1.55, fontSize: '0.9375rem' },
    body2: { lineHeight: 1.55, fontSize: '0.875rem' },
    caption: { lineHeight: 1.5, fontSize: '0.75rem' },
    overline: {
      fontWeight: 700,
      lineHeight: 1.5,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    button: { fontWeight: 700, lineHeight: 24 / 14, fontSize: '0.875rem', textTransform: 'none' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 700,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${PRIMARY.light} 0%, ${PRIMARY.main} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${PRIMARY.main} 0%, ${PRIMARY.dark} 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: `0 0 2px 0 ${alpha(GREY[500], 0.2)}, 0 12px 24px -4px ${alpha(GREY[500], 0.12)}`,
          position: 'relative',
          zIndex: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minWidth: 48,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: GREY[600],
          fontWeight: 600,
          backgroundColor: GREY[200],
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: GREY[800],
          borderRadius: 6,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
  },
})

export default theme
export { GREY, PRIMARY, SECONDARY, INFO, SUCCESS, WARNING, ERROR }
