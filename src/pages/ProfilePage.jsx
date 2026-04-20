import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import useAuthStore from '../stores/authStore'
import api from '../lib/api'

const ROLE_COLORS = {
  owner: { bgcolor: '#D3FCD2', color: '#118D57' },
  admin: { bgcolor: '#D6E4FF', color: '#1939B7' },
  member: { bgcolor: '#F4F6F8', color: '#637381' },
}

const getInitials = (name) =>
  name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '??'

export default function ProfilePage() {
  const { user, company, fetchMe } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState('')
  const [nameError, setNameError] = useState('')

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  const handleNameSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setNameError('Name is required'); return }
    setNameLoading(true); setNameError(''); setNameSuccess('')
    try {
      await api.patch('/auth/profile', { name: name.trim() })
      await fetchMe()
      setNameSuccess('Profile updated successfully')
      setTimeout(() => setNameSuccess(''), 3000)
    } catch (err) {
      setNameError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setNameLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPw.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (pwForm.newPw !== pwForm.confirm) { setPwError("Passwords don't match"); return }
    setPwLoading(true); setPwError(''); setPwSuccess('')
    try {
      await api.patch('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.newPw })
      setPwSuccess('Password updated successfully')
      setPwForm({ current: '', newPw: '', confirm: '' })
      setTimeout(() => setPwSuccess(''), 3000)
    } catch (err) {
      setPwError(err.response?.data?.message || 'Failed to update password')
    } finally {
      setPwLoading(false)
    }
  }

  const togglePw = (field) => () => setShowPw((v) => ({ ...v, [field]: !v[field] }))

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Profile</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account settings and change your password.
        </Typography>
      </Box>

      {/* Identity card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, fontSize: '1.25rem', fontWeight: 700, bgcolor: 'primary.main' }}>
              {getInitials(user?.name)}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.75 }}>
                <Chip
                  label={user?.role}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', ...ROLE_COLORS[user?.role] }}
                />
                <Chip label={company?.name} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Name form */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonOutlineIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Account Information</Typography>
          </Box>

          {nameSuccess && <Alert severity="success" sx={{ mb: 2 }}>{nameSuccess}</Alert>}
          {nameError && <Alert severity="error" sx={{ mb: 2 }}>{nameError}</Alert>}

          <form onSubmit={handleNameSave}>
            <TextField
              label="Full Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Email"
              fullWidth
              value={user?.email || ''}
              disabled
              helperText="Email cannot be changed"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Company"
              fullWidth
              value={company?.name || ''}
              disabled
              helperText="Company name is managed by the owner"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={nameLoading || name === user?.name}
                startIcon={nameLoading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {nameLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Change Password</Typography>
          </Box>

          {pwSuccess && <Alert severity="success" sx={{ mb: 2 }}>{pwSuccess}</Alert>}
          {pwError && <Alert severity="error" sx={{ mb: 2 }}>{pwError}</Alert>}

          <form onSubmit={handlePasswordChange}>
            {['current', 'newPw', 'confirm'].map((field, i) => (
              <TextField
                key={field}
                label={field === 'current' ? 'Current Password' : field === 'newPw' ? 'New Password' : 'Confirm New Password'}
                fullWidth
                type={showPw[field] ? 'text' : 'password'}
                value={pwForm[field]}
                onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                helperText={field === 'newPw' ? 'Minimum 8 characters' : undefined}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    endAdornment: field !== 'confirm' ? (
                      <InputAdornment position="end">
                        <IconButton onClick={togglePw(field)} edge="end" size="small">
                          {showPw[field] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={pwLoading || !pwForm.current || !pwForm.newPw}
                startIcon={pwLoading ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  )
}
