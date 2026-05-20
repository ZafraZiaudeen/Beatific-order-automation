import { createTheme, alpha } from '@mui/material/styles'

const GREY = {
  0: '#FFFFFF',
  50: '#FAFAFA',
  100: '#F4F4F5',
  200: '#E3E3E7',
  300: '#D4D4D8',
  400: '#A1A1AA',
  500: '#71717A',
  600: '#52525B',
  700: '#3F3F46',
  800: '#27272A',
  900: '#18181B',
  950: '#09090B',
}

const PRIMARY = {
  lighter: '#FFF7ED',
  light: '#FB923C',
  main: '#F97316',
  dark: '#EA580C',
  darker: '#9A3412',
  contrastText: '#FFFFFF',
  gradient: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
}

const SECONDARY = {
  lighter: '#F4F4F5',
  light: '#D4D4D8',
  main: '#71717A',
  dark: '#3F3F46',
  darker: '#18181B',
  contrastText: '#FFFFFF',
  gradient: 'linear-gradient(135deg, #71717A 0%, #E3E3E7 100%)',
}

const INFO = {
  lighter: '#E0F2FE',
  light: '#38BDF8',
  main: '#0EA5E9',
  dark: '#0369A1',
  darker: '#0C4A6E',
  contrastText: '#FFFFFF',
  gradient: 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)',
}

const SUCCESS = {
  lighter: '#DCFCE7',
  light: '#4ADE80',
  main: '#22C55E',
  dark: '#16A34A',
  darker: '#166534',
  contrastText: '#FFFFFF',
  gradient: 'linear-gradient(135deg, #22C55E 0%, #98EC2D 100%)',
}

const WARNING = {
  lighter: '#FEF9C3',
  light: '#FACC15',
  main: '#EAB308',
  dark: '#CA8A04',
  darker: '#854D0E',
  contrastText: GREY[900],
  gradient: 'linear-gradient(135deg, #EAB308 0%, #F97316 100%)',
}

const ERROR = {
  lighter: '#FEE2E2',
  light: '#F87171',
  main: '#EF4444',
  dark: '#DC2626',
  darker: '#991B1B',
  contrastText: '#FFFFFF',
  gradient: 'linear-gradient(135deg, #EF4444 0%, #EC4899 100%)',
}

const SHADOWS = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  soft: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  colored: '0 4px 7px -1px rgba(249, 115, 22, 0.35)',
}

const solidDivider = `1px solid ${GREY[200]}`

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
      primary: '#27272A',
      secondary: '#71717A',
      disabled: '#A1A1AA',
    },
    background: {
      paper: '#FFFFFF',
      default: '#F4F4F5',
      soft: '#FAFAFA',
    },
    divider: GREY[200],
    action: {
      hover: alpha(GREY[500], 0.08),
      selected: alpha(PRIMARY.main, 0.12),
      disabled: GREY[400],
      disabledBackground: GREY[100],
      focus: alpha(PRIMARY.main, 0.2),
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: "'Inter', 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontWeightRegular: 400,
    fontWeightMedium: 600,
    fontWeightBold: 700,
    h1: { fontWeight: 700, lineHeight: 1.2, fontSize: '3rem', color: '#27272A' },
    h2: { fontWeight: 700, lineHeight: 1.2, fontSize: '2.25rem', color: '#27272A' },
    h3: { fontWeight: 700, lineHeight: 1.2, fontSize: '1.875rem', color: '#27272A' },
    h4: { fontWeight: 700, lineHeight: 1.2, fontSize: '1.5rem', color: '#27272A' },
    h5: { fontWeight: 700, lineHeight: 1.2, fontSize: '1.25rem', color: '#27272A' },
    h6: { fontWeight: 700, lineHeight: 1.2, fontSize: '1rem', color: '#27272A' },
    subtitle1: { fontWeight: 700, lineHeight: 1.5, fontSize: '0.9rem' },
    subtitle2: { fontWeight: 700, lineHeight: 1.5, fontSize: '0.82rem' },
    body1: { lineHeight: 1.6, fontSize: '0.9rem' },
    body2: { lineHeight: 1.55, fontSize: '0.82rem' },
    caption: { lineHeight: 1.45, fontSize: '0.74rem' },
    overline: {
      fontWeight: 800,
      lineHeight: 1.5,
      fontSize: '0.68rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    button: {
      fontWeight: 700,
      lineHeight: 1.5,
      fontSize: '0.78rem',
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
          backgroundColor: '#F4F4F5',
          color: '#27272A',
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
          borderRadius: 12,
          minHeight: 40,
          paddingInline: 20,
          boxShadow: 'none',
          whiteSpace: 'nowrap',
          fontWeight: 600,
          fontSize: '0.875rem',
          textTransform: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        sizeSmall: {
          minHeight: 32,
          paddingInline: 16,
          borderRadius: 10,
          fontSize: '0.8125rem',
        },
        containedPrimary: {
          backgroundImage: PRIMARY.gradient,
          boxShadow: SHADOWS.colored,
          '&:hover': {
            backgroundImage: PRIMARY.gradient,
            boxShadow: '0 6px 12px -1px rgba(249, 115, 22, 0.45)',
            transform: 'translateY(-1px)',
          },
        },
        containedInherit: {
          backgroundColor: '#344767',
          color: '#FFFFFF',
          '&:hover': { backgroundColor: '#1F2A44' },
        },
        outlined: ({ ownerState, theme: muiTheme }) => {
          const colorMap = { primary: PRIMARY, secondary: SECONDARY, info: INFO, success: SUCCESS, warning: WARNING, error: ERROR }
          const tone = colorMap[ownerState.color] || SECONDARY
          const isNeutral = !ownerState.color || ownerState.color === 'inherit' || ownerState.color === 'secondary'
          return {
            borderColor: isNeutral ? muiTheme.palette.divider : alpha(tone.main, 0.32),
            color: isNeutral ? muiTheme.palette.text.secondary : tone.dark,
            backgroundColor: '#FFFFFF',
            '&:hover': {
              borderColor: isNeutral ? muiTheme.palette.divider : tone.main,
              backgroundColor: isNeutral ? alpha(GREY[500], 0.08) : alpha(tone.main, 0.08),
              color: isNeutral ? muiTheme.palette.text.primary : tone.dark,
            },
          }
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: '#71717A',
          '&:hover': {
            color: '#27272A',
            backgroundColor: alpha(GREY[500], 0.08),
          },
        },
        sizeSmall: {
          width: 32,
          height: 32,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
          border: `1px solid ${alpha('#000', 0.05)}`,
          boxShadow: SHADOWS.sm,
          backgroundImage: 'none',
          overflow: 'hidden',
          position: 'relative',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '1.5rem 1.5rem 1rem',
        },
        title: {
          fontSize: '1rem',
          fontWeight: 700,
          color: '#27272A',
        },
        subheader: {
          fontSize: '0.875rem',
          color: '#71717A',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '1.5rem',
          '&:last-child': {
            paddingBottom: '1.5rem',
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
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          boxShadow: SHADOWS.lg,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '1.25rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 800,
          borderBottom: solidDivider,
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
          borderTop: solidDivider,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: SHADOWS.lg,
          padding: 4,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: SHADOWS.lg,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 36,
          color: '#67748E',
          fontSize: '0.82rem',
          fontWeight: 600,
          '&:hover': {
            color: '#344767',
            backgroundColor: alpha(GREY[500], 0.08),
          },
          '&.Mui-selected': {
            color: PRIMARY.dark,
            backgroundColor: alpha(PRIMARY.main, 0.12),
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: GREY[200],
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: GREY[300],
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: PRIMARY.main,
            borderWidth: 1,
          },
          '&.Mui-focused': {
            boxShadow: `0 0 0 3px ${alpha(PRIMARY.main, 0.12)}`,
          },
        },
        input: {
          fontSize: '0.84rem',
          fontWeight: 500,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '0.84rem',
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#67748E',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 800,
          height: 25,
        },
        sizeSmall: {
          height: 22,
          fontSize: '0.68rem',
        },
        outlined: {
          borderColor: GREY[200],
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 800,
          boxShadow: SHADOWS.xs,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 46,
        },
        indicator: {
          height: 3,
          borderRadius: 999,
          backgroundImage: PRIMARY.gradient,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 800,
          minHeight: 46,
          minWidth: 48,
          color: '#67748E',
          '&.Mui-selected': {
            color: PRIMARY.dark,
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
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: solidDivider,
          padding: '0.75rem 1.5rem',
          color: '#344767',
          fontSize: '0.8rem',
          verticalAlign: 'middle',
        },
        head: {
          color: '#8392AB',
          fontSize: '0.64rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          backgroundColor: '#FFFFFF',
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
          opacity: 0.78,
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
            backgroundColor: alpha(PRIMARY.main, 0.08),
            '&:hover': {
              backgroundColor: alpha(PRIMARY.main, 0.12),
            },
          },
        },
        hover: {
          '&:hover': {
            backgroundColor: alpha(GREY[500], 0.04),
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          color: '#67748E',
          fontWeight: 800,
          '&.Mui-selected': {
            color: '#FFFFFF',
            backgroundImage: PRIMARY.gradient,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: 0,
          fontWeight: 600,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#344767',
          borderRadius: 8,
          fontSize: '0.72rem',
        },
        arrow: {
          color: '#344767',
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
          borderRadius: 10,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: GREY[200],
          color: '#67748E',
          fontWeight: 800,
          textTransform: 'none',
          '&.Mui-selected': {
            color: PRIMARY.dark,
            backgroundColor: alpha(PRIMARY.main, 0.12),
          },
        },
      },
    },
  },
})

export default theme
export { GREY, PRIMARY, SECONDARY, INFO, SUCCESS, WARNING, ERROR, SHADOWS }
