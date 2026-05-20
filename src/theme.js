import { createTheme, alpha } from '@mui/material/styles'

const GREY = {
  0: '#FFFFFF',
  50: '#FCFDFD',
  100: '#F9FAFB',
  200: '#F4F6F8',
  300: '#DFE3E8',
  400: '#C4CDD5',
  500: '#919EAB',
  600: '#637381',
  700: '#454F5B',
  800: '#1C252E',
  900: '#141A21',
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
  lighter: GREY[100],
  light: GREY[300],
  main: GREY[600],
  dark: GREY[700],
  darker: GREY[900],
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

const SHADOWS = {
  xs: '0 1px 2px 0 rgba(145, 158, 171, 0.16)',
  sm: '0 3px 1px -2px rgba(145, 158, 171, 0.20), 0 2px 2px 0 rgba(145, 158, 171, 0.14), 0 1px 5px 0 rgba(145, 158, 171, 0.12)',
  md: '0 8px 16px 0 rgba(145, 158, 171, 0.16)',
  lg: '0 12px 24px -4px rgba(145, 158, 171, 0.16)',
  xl: '0 0 2px 0 rgba(145, 158, 171, 0.20), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
}

const dashedDivider = `1px dashed ${GREY[300]}`
const solidDivider = `1px solid ${GREY[300]}`

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
      default: '#FFFFFF',
    },
    divider: GREY[300],
    action: {
      hover: GREY[100],
      selected: alpha(PRIMARY.main, 0.12),
      disabled: GREY[500],
      disabledBackground: GREY[200],
      focus: alpha(PRIMARY.main, 0.24),
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontWeightRegular: 500,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: { fontFamily: "'Canela', serif", fontWeight: 600, lineHeight: 1.25, fontSize: '2.1875rem', color: GREY[800] },
    h2: { fontFamily: "'Canela', serif", fontWeight: 600, lineHeight: 1.25, fontSize: '1.75rem', color: GREY[800] },
    h3: { fontFamily: "'Canela', serif", fontWeight: 600, lineHeight: 1.25, fontSize: '1.53125rem', color: GREY[800] },
    h4: { fontFamily: "'Canela', serif", fontWeight: 600, lineHeight: 1.25, fontSize: '1.3125rem', color: GREY[800] },
    h5: { fontFamily: "'Canela', serif", fontWeight: 600, lineHeight: 1.25, fontSize: '1.09375rem', color: GREY[800] },
    h6: { fontFamily: "'Canela', serif", fontWeight: 600, lineHeight: 1.25, fontSize: '0.875rem', color: GREY[800] },
    subtitle1: { fontWeight: 600, lineHeight: 1.57, fontSize: '0.875rem' },
    subtitle2: { fontWeight: 600, lineHeight: 1.57, fontSize: '0.8125rem' },
    body1: { fontWeight: 500, lineHeight: 1.57, fontSize: '0.875rem' },
    body2: { fontWeight: 500, lineHeight: 1.57, fontSize: '0.8125rem' },
    caption: { fontWeight: 500, lineHeight: 1.5, fontSize: '0.75rem' },
    overline: {
      fontWeight: 700,
      lineHeight: 1.5,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
    button: {
      fontWeight: 600,
      lineHeight: 1.57,
      fontSize: '0.875rem',
      textTransform: 'none',
    },
  },
  shadows: [
    'none',
    SHADOWS.xs,
    SHADOWS.sm,
    SHADOWS.md,
    SHADOWS.lg,
    SHADOWS.xl,
    ...Array(19).fill(SHADOWS.xl),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FFFFFF',
          color: GREY[800],
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': {
          backgroundColor: alpha(PRIMARY.main, 0.18),
        },
        '*::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: GREY[100],
          borderRadius: 16,
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: GREY[300],
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          minHeight: 38,
          '&:hover': { boxShadow: 'none' },
        },
        sizeSmall: {
          minHeight: 32,
          paddingInline: 12,
        },
        containedPrimary: {
          backgroundColor: PRIMARY.main,
          '&:hover': {
            backgroundColor: PRIMARY.dark,
          },
        },
        outlined: ({ ownerState }) => {
          const colorMap = { primary: PRIMARY, secondary: SECONDARY, info: INFO, success: SUCCESS, warning: WARNING, error: ERROR }
          const tone = colorMap[ownerState.color] || SECONDARY
          const isNeutral = !ownerState.color || ownerState.color === 'inherit' || ownerState.color === 'secondary'
          return {
            borderColor: isNeutral ? GREY[300] : alpha(tone.main, 0.38),
            color: isNeutral ? GREY[700] : tone.dark,
            backgroundColor: '#FFFFFF',
            '&:hover': {
              borderColor: isNeutral ? GREY[300] : tone.main,
              backgroundColor: isNeutral ? GREY[200] : alpha(tone.main, 0.08),
              color: isNeutral ? GREY[800] : tone.dark,
            },
          }
        },
        text: ({ ownerState }) => {
          const colorMap = { primary: PRIMARY, secondary: SECONDARY, info: INFO, success: SUCCESS, warning: WARNING, error: ERROR }
          const tone = colorMap[ownerState.color] || SECONDARY
          const isNeutral = !ownerState.color || ownerState.color === 'inherit' || ownerState.color === 'secondary'
          return {
            color: isNeutral ? GREY[600] : tone.dark,
            '&:hover': {
              color: isNeutral ? GREY[700] : tone.dark,
              backgroundColor: isNeutral ? GREY[100] : alpha(tone.main, 0.08),
            },
          }
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          color: GREY[600],
          '&:hover': {
            color: GREY[700],
            backgroundColor: GREY[100],
          },
        },
        sizeSmall: {
          width: 34,
          height: 34,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: solidDivider,
          boxShadow: SHADOWS.xl,
          backgroundImage: 'none',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 0,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '1.09375rem 1.25rem',
          borderBottom: dashedDivider,
        },
        title: {
          fontSize: '0.875rem',
          fontWeight: 700,
        },
        subheader: {
          fontSize: '0.75rem',
          color: GREY[600],
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '1.25rem',
          '&:last-child': {
            paddingBottom: '1.25rem',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: solidDivider,
          boxShadow: SHADOWS.xl,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '1.25rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 700,
          borderBottom: dashedDivider,
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '1.25rem 1.5rem',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '1rem 1.5rem',
          borderTop: dashedDivider,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: solidDivider,
          boxShadow: SHADOWS.lg,
          padding: 4,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: solidDivider,
          boxShadow: SHADOWS.lg,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 36,
          color: GREY[600],
          fontSize: '0.875rem',
          fontWeight: 500,
          '&:hover': {
            color: GREY[700],
            backgroundColor: GREY[100],
          },
          '&.Mui-selected': {
            color: PRIMARY.dark,
            backgroundColor: PRIMARY.lighter,
            '&:hover': {
              backgroundColor: alpha(PRIMARY.main, 0.16),
            },
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: GREY[300],
            },
            '&:hover fieldset': {
              borderColor: GREY[400],
            },
            '&.Mui-focused fieldset': {
              borderColor: PRIMARY.main,
              boxShadow: `0 0 0 3px ${alpha(PRIMARY.main, 0.12)}`,
            },
          },
          '& .MuiInputLabel-root': {
            color: GREY[600],
            fontWeight: 500,
          },
          '& .MuiFormHelperText-root': {
            color: GREY[500],
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: GREY[300],
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: GREY[400],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PRIMARY.main,
            borderWidth: 1,
          },
        },
        input: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          fontWeight: 600,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 700,
          height: 26,
        },
        sizeSmall: {
          height: 22,
          fontSize: '0.75rem',
        },
        outlined: {
          borderColor: GREY[300],
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          boxShadow: SHADOWS.xs,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: 999,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 48,
          minWidth: 48,
          color: GREY[600],
          '&.Mui-selected': {
            color: PRIMARY.main,
          },
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          scrollbarWidth: 'thin',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: GREY[100],
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: dashedDivider,
          padding: '0.75rem 1.25rem',
          color: GREY[700],
          fontSize: '0.875rem',
          fontWeight: 500,
          verticalAlign: 'middle',
        },
        head: {
          borderBottom: 0,
          color: GREY[600],
          fontWeight: 700,
          backgroundColor: GREY[100],
          whiteSpace: 'nowrap',
        },
        sizeSmall: {
          padding: '0.55rem 0.85rem',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:last-child td': {
            borderBottomWidth: 0,
          },
          '&.Mui-selected': {
            backgroundColor: alpha(PRIMARY.main, 0.12),
            '&:hover': {
              backgroundColor: alpha(PRIMARY.main, 0.16),
            },
          },
        },
        hover: {
          '&:hover': {
            backgroundColor: GREY[50],
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: GREY[500],
          fontWeight: 600,
          '&:hover': {
            color: '#FFFFFF',
            backgroundColor: PRIMARY.main,
          },
          '&.Mui-selected': {
            color: '#FFFFFF',
            backgroundColor: PRIMARY.main,
            '&:hover': {
              backgroundColor: PRIMARY.dark,
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: solidDivider,
          fontWeight: 500,
        },
        standardInfo: {
          backgroundColor: INFO.lighter,
          color: INFO.dark,
        },
        standardSuccess: {
          backgroundColor: SUCCESS.lighter,
          color: SUCCESS.dark,
        },
        standardWarning: {
          backgroundColor: WARNING.lighter,
          color: WARNING.dark,
        },
        standardError: {
          backgroundColor: ERROR.lighter,
          color: ERROR.dark,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: GREY[900],
          borderRadius: 8,
          fontSize: '0.75rem',
        },
        arrow: {
          color: GREY[900],
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: GREY[200],
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: GREY[300],
          color: GREY[600],
          fontWeight: 600,
          textTransform: 'none',
          '&.Mui-selected': {
            color: PRIMARY.dark,
            backgroundColor: PRIMARY.lighter,
            '&:hover': {
              backgroundColor: alpha(PRIMARY.main, 0.16),
            },
          },
        },
      },
    },
  },
})

export default theme
export { GREY, PRIMARY, SECONDARY, INFO, SUCCESS, WARNING, ERROR, SHADOWS }
