import { useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import DiamondOutlinedIcon from '@mui/icons-material/DiamondOutlined'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import { alpha } from '@mui/material/styles'
import { SoftButton } from '../soft-ui'

function HelpCard({ onClose, onHide }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 16, sm: 24 },
        bottom: { xs: 16, sm: 24 },
        width: { xs: 'calc(100vw - 32px)', sm: 280 },
        maxWidth: 320,
        zIndex: 1300,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: 2.5,
          borderRadius: '1rem',
          color: '#fff',
          backgroundImage: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
          boxShadow: '0 20px 45px rgba(24, 24, 27, 0.28)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.2,
            background: 'radial-gradient(circle at 80% 20%, #FACC15 0, transparent 50%)',
          }}
        />
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '0.75rem',
                bgcolor: '#fff',
                color: '#27272a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <DiamondOutlinedIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Hide help" arrow>
                <IconButton
                  size="small"
                  onClick={onHide}
                  sx={{
                    width: 30,
                    height: 30,
                    color: alpha('#fff', 0.9),
                    '&:hover': { bgcolor: alpha('#fff', 0.12) },
                  }}
                >
                  <KeyboardArrowRightIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close" arrow>
                <IconButton
                  size="small"
                  onClick={onClose}
                  sx={{
                    width: 30,
                    height: 30,
                    color: alpha('#fff', 0.9),
                    '&:hover': { bgcolor: alpha('#fff', 0.12) },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
            Need help?
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', color: alpha('#fff', 0.8), mb: 2, lineHeight: 1.5 }}>
            Please check our docs
          </Typography>
          <SoftButton size="small" fullWidth sx={{ bgcolor: '#fff', color: '#27272a', '&:hover': { bgcolor: '#f4f4f5' } }}>
            Documentation
          </SoftButton>
        </Box>
      </Box>
    </Box>
  )
}

export default function FloatingHelp() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  if (hidden) {
    return (
      <Tooltip title="Show help" placement="left" arrow>
        <IconButton
          onClick={() => {
            setHidden(false)
            setOpen(false)
          }}
          sx={{
            position: 'fixed',
            right: 0,
            bottom: { xs: 92, sm: 104 },
            width: 34,
            height: 44,
            borderRadius: '0.75rem 0 0 0.75rem',
            bgcolor: '#27272a',
            color: '#fff',
            boxShadow: '0 10px 24px rgba(24, 24, 27, 0.22)',
            zIndex: 1300,
                '&:hover': { bgcolor: '#18181b', color: '#FA8D36' },
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 19 }} />
        </IconButton>
      </Tooltip>
    )
  }

  if (open) {
    return (
      <HelpCard
        onClose={() => setOpen(false)}
        onHide={() => {
          setOpen(false)
          setHidden(true)
        }}
      />
    )
  }

  return (
    <Tooltip title="Need help?" placement="left" arrow>
      <IconButton
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          right: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          width: 52,
          height: 52,
          borderRadius: '50%',
          bgcolor: '#27272a',
          color: '#fff',
          boxShadow: '0 14px 30px rgba(24, 24, 27, 0.26)',
          zIndex: 1300,
          '&:hover': {
            bgcolor: '#18181b',
            transform: 'translateY(-1px)',
            color: '#FA8D36',
          },
          transition: 'transform 0.15s ease, background-color 0.15s ease',
        }}
      >
        <HelpOutlineIcon sx={{ fontSize: 26 }} />
      </IconButton>
    </Tooltip>
  )
}
