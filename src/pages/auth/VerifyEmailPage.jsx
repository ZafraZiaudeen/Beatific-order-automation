import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined'
import useAuthStore from '../../stores/authStore'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, verifyEmail, resendCode, loading, error, clearError } = useAuthStore()
  const email = location.state?.email || user?.email || ''

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [success, setSuccess] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((v) => v - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    clearError()

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every((d) => d !== '')) {
      handleSubmit(newCode.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
      handleSubmit(pasted)
    }
  }

  const handleSubmit = async (fullCode) => {
    try {
      await verifyEmail({ email, code: fullCode })
      setSuccess('Email verified! Redirecting...')
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch {
      // error is set in store
    }
  }

  const handleResend = async () => {
    try {
      await resendCode(email)
      setResendCooldown(60)
      setSuccess('New code sent to your email')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      // error handled by store
    }
  }

  if (!email) {
    navigate('/login', { replace: true })
    return null
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          width: '100%',
          p: { xs: 3, sm: 5 },
          borderRadius: 2,
          textAlign: 'center',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 0 2px 0 rgba(145,158,171,0.20), 0 12px 24px -4px rgba(145,158,171,0.12)',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: 1,
            bgcolor: 'primary.lighter',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <MarkEmailReadOutlinedIcon sx={{ fontSize: 28, color: 'primary.main' }} />
        </Box>

        <Typography variant="h4" sx={{ mb: 1 }}>
          Check your email
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          We've sent a 6-digit verification code to{' '}
          <strong>{email}</strong>
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
            {success}
          </Alert>
        )}

        {/* OTP Input */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            justifyContent: 'center',
            mb: 4,
          }}
          onPaste={handlePaste}
        >
          {code.map((digit, i) => (
            <TextField
              key={i}
              inputRef={(el) => (inputRefs.current[i] = el)}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              inputProps={{
                maxLength: 1,
                style: {
                  textAlign: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  padding: '12px 0',
                },
                inputMode: 'numeric',
              }}
              sx={{
                width: 52,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                },
              }}
            />
          ))}
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={loading || code.some((d) => d === '')}
          onClick={() => handleSubmit(code.join(''))}
          sx={{ mb: 2, py: 1.5 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Verify Email'}
        </Button>

        <Typography variant="body2" color="text.secondary">
          Didn't receive the code?{' '}
          <Button
            variant="text"
            size="small"
            disabled={resendCooldown > 0 || loading}
            onClick={handleResend}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </Button>
        </Typography>
      </Paper>
    </Box>
  )
}
