import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import api from '../../lib/api'
import useAuthStore from '../../stores/authStore'

export default function AcceptInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { acceptInvite, loading, error, clearError } = useAuthStore()
  const formRef = useRef(null)

  const [invite, setInvite] = useState(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const { data } = await api.get(`/auth/invite/${token}`)
        setInvite(data)
        setForm((f) => ({ ...f, email: data.email || '' }))
      } catch (err) {
        setInviteError(err.response?.data?.message || 'Invalid or expired invitation')
      } finally {
        setLoadingInvite(false)
      }
    }
    if (token) fetchInvite()
  }, [token])

  useEffect(() => {
    if (!loadingInvite && invite && formRef.current) {
      const els = formRef.current.querySelectorAll('.fade-item')
      gsap.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.45, ease: 'power2.out' })
    }
  }, [loadingInvite, invite])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setFieldErrors((v) => ({ ...v, [key]: '' }))
    clearError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    if (form.password.length < 8) errs.password = 'At least 8 characters'
    if (form.password !== form.confirm) errs.confirm = "Passwords don't match"
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    try {
      await acceptInvite({ token, name: form.name, email: form.email, password: form.password })
      navigate('/dashboard', { replace: true })
    } catch {
      // error handled by store
    }
  }

  if (loadingInvite) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8' }}>
        <Paper sx={{ maxWidth: 440, width: '100%', p: 5, borderRadius: 3 }}>
          <Skeleton variant="rectangular" height={40} sx={{ mb: 2, borderRadius: 1 }} />
          <Skeleton variant="text" width="60%" sx={{ mb: 3 }} />
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
        </Paper>
      </Box>
    )
  }

  if (inviteError) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8', px: 2 }}>
        <Paper sx={{ maxWidth: 440, width: '100%', p: 5, borderRadius: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Invitation Invalid</Typography>
          <Alert severity="error" sx={{ mb: 3 }}>{inviteError}</Alert>
          <Button variant="contained" onClick={() => navigate('/login')}>Go to Login</Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8', px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          maxWidth: 440,
          width: '100%',
          p: { xs: 3, sm: 5 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 20px 60px rgba(15,23,42,0.10)',
        }}
      >
        <Box ref={formRef}>
          <Box className="fade-item" sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                bgcolor: 'primary.lighter',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <GroupAddOutlinedIcon sx={{ fontSize: 26, color: 'primary.main' }} />
            </Box>
            <Typography variant="h4" sx={{ mb: 0.5 }}>Join the team</Typography>
            <Chip
              icon={<BusinessOutlinedIcon sx={{ fontSize: 16 }} />}
              label={invite?.company?.name}
              variant="outlined"
              sx={{ mt: 1, fontWeight: 600 }}
            />
          </Box>

          {error && <Alert className="fade-item" severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Box className="fade-item" sx={{ mb: 2 }}>
              <TextField
                label="Full Name"
                fullWidth
                value={form.name}
                onChange={set('name')}
                error={!!fieldErrors.name}
                helperText={fieldErrors.name}
              />
            </Box>
            <Box className="fade-item" sx={{ mb: 2 }}>
              <TextField
                label="Email"
                fullWidth
                type="email"
                value={form.email}
                onChange={set('email')}
                error={!!fieldErrors.email}
                helperText={fieldErrors.email}
                disabled={!!invite?.email}
              />
            </Box>
            <Box className="fade-item" sx={{ mb: 2 }}>
              <TextField
                label="Password"
                fullWidth
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                error={!!fieldErrors.password}
                helperText={fieldErrors.password || 'Minimum 8 characters'}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPw((v) => !v)} edge="end" size="small">
                          {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
            <Box className="fade-item" sx={{ mb: 3 }}>
              <TextField
                label="Confirm Password"
                fullWidth
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                error={!!fieldErrors.confirm}
                helperText={fieldErrors.confirm}
              />
            </Box>
            <Box className="fade-item">
              <Button
                fullWidth
                variant="contained"
                size="large"
                type="submit"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Accept & Create Account'}
              </Button>
            </Box>
          </form>

          <Typography className="fade-item" variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
            By joining you agree to our Terms of Service & Privacy Policy
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
