import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import useAuthStore from '../stores/authStore'
import api from '../lib/api'
import { SoftPageHeader, SoftCard, SoftButton, SoftAvatar, SoftBadge } from '../components/soft-ui'

const ROLE_COLORS = {
  owner: { bgcolor: '#fff7ed', color: '#ea580c', border: '1px solid #ea580c' },
  admin: { bgcolor: '#e0f2fe', color: '#0369a1', border: '1px solid #0369a1' },
  member: { bgcolor: '#f4f6f8', color: '#637381', border: '1px solid #637381' },
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
    <Box>
      <SoftPageHeader
        title="My Profile"
        subtitle="Manage your account settings, preferences, and security."
      />

      <Grid container spacing={3}>
        {/* Left Column - Identity Card */}
        <Grid item xs={12} md={4}>
          <SoftCard 
            elevation={0} 
            sx={{ 
              borderRadius: 3, 
              border: '1px solid', 
              borderColor: 'divider',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0px 4px 20px rgba(0,0,0,0.03)'
            }}
          >
            {/* Banner Background */}
            <Box 
              sx={{ 
                height: 100, 
                background: 'linear-gradient(135deg, #EA580C 0%, #FACC15 100%)',
                width: '100%'
              }} 
            />
            
            <Box sx={{ pt: 0, px: 3, pb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <SoftAvatar 
                size={80}
                color="primary"
                sx={{ 
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  border: '3px solid',
                  borderColor: 'background.paper',
                  mt: -5,
                  mb: 1.5,
                  boxShadow: '0px 4px 10px rgba(0,0,0,0.1)'
                }}
              >
                {getInitials(user?.name)}
              </SoftAvatar>
              
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
                {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {user?.email}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
                <SoftBadge
                  label={user?.role}
                  size="small"
                  color={user?.role === 'owner' ? 'warning' : user?.role === 'admin' ? 'info' : 'default'}
                  sx={{ 
                    textTransform: 'capitalize', 
                    px: 1
                  }}
                />
                <SoftBadge 
                  label={company?.name} 
                  size="small" 
                  variant="outlined"
                />
              </Stack>
              
              <Divider sx={{ width: '100%', mb: 2.5 }} />
              
              <Box sx={{ width: '100%' }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <EmailOutlinedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                      {user?.email}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <BusinessOutlinedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                      {company?.name}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <ShieldOutlinedIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {user?.role} Access
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </SoftCard>
        </Grid>

        {/* Right Column - Forms */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            
            {/* Account Info Form */}
            <SoftCard 
              elevation={0} 
              sx={{ 
                borderRadius: 3, 
                border: '1px solid', 
                borderColor: 'divider',
                boxShadow: '0px 4px 20px rgba(0,0,0,0.03)'
              }}
            >
              <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'primary.lighter', color: 'primary.main', display: 'flex' }}>
                    <PersonOutlineIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Personal Information</Typography>
                    <Typography variant="caption" color="text.secondary">Update your basic profile details here.</Typography>
                  </Box>
                </Box>

                {nameSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: 2, py: 0 }}>{nameSuccess}</Alert>}
                {nameError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, py: 0 }}>{nameError}</Alert>}

                <form onSubmit={handleNameSave}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        size="small"
                        label="Full Name"
                        fullWidth
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        variant="outlined"
                        slotProps={{ input: { sx: { borderRadius: 2 } } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        label="Email Address"
                        fullWidth
                        value={user?.email || ''}
                        disabled
                        helperText="Email cannot be changed"
                        variant="outlined"
                        slotProps={{ input: { sx: { borderRadius: 2 } } }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        label="Company"
                        fullWidth
                        value={company?.name || ''}
                        disabled
                        helperText="Managed by the owner"
                        variant="outlined"
                        slotProps={{ input: { sx: { borderRadius: 2 } } }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
                    <SoftButton
                      type="submit"
                      variant="contained"
                      disabled={nameLoading || name === user?.name}
                      sx={{ px: 3, py: 0.8 }}
                      startIcon={nameLoading ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      {nameLoading ? 'Saving...' : 'Save Changes'}
                    </SoftButton>
                  </Box>
                </form>
              </Box>
            </SoftCard>

            {/* Password Form */}
            <SoftCard 
              elevation={0} 
              sx={{ 
                borderRadius: 3, 
                border: '1px solid', 
                borderColor: 'divider',
                boxShadow: '0px 4px 20px rgba(0,0,0,0.03)'
              }}
            >
              <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                  <Box sx={{ p: 0.75, borderRadius: 2, bgcolor: 'error.lighter', color: 'error.main', display: 'flex' }}>
                    <LockOutlinedIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Security</Typography>
                    <Typography variant="caption" color="text.secondary">Use a long, random password to stay secure.</Typography>
                  </Box>
                </Box>

                {pwSuccess && <Alert severity="success" sx={{ mb: 2, borderRadius: 2, py: 0 }}>{pwSuccess}</Alert>}
                {pwError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, py: 0 }}>{pwError}</Alert>}

                <form onSubmit={handlePasswordChange}>
                  <Stack spacing={2}>
                    <TextField
                      size="small"
                      label="Current Password"
                      fullWidth
                      type={showPw.current ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                      variant="outlined"
                      slotProps={{
                        input: {
                          sx: { borderRadius: 2 },
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={togglePw('current')} edge="end" size="small">
                                {showPw.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          size="small"
                          label="New Password"
                          fullWidth
                          type={showPw.newPw ? 'text' : 'password'}
                          value={pwForm.newPw}
                          onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))}
                          helperText="Minimum 8 characters"
                          variant="outlined"
                          slotProps={{
                            input: {
                              sx: { borderRadius: 2 },
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={togglePw('newPw')} edge="end" size="small">
                                    {showPw.newPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          size="small"
                          label="Confirm New Password"
                          fullWidth
                          type={showPw.newPw ? 'text' : 'password'}
                          value={pwForm.confirm}
                          onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                          variant="outlined"
                          slotProps={{ input: { sx: { borderRadius: 2 } } }}
                        />
                      </Grid>
                    </Grid>
                  </Stack>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
                    <SoftButton
                      type="submit"
                      variant="contained"
                      color="dark"
                      disabled={pwLoading || !pwForm.current || !pwForm.newPw}
                      sx={{ px: 3, py: 0.8 }}
                      startIcon={pwLoading ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                      {pwLoading ? 'Updating...' : 'Update Password'}
                    </SoftButton>
                  </Box>
                </form>
              </Box>
            </SoftCard>

          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
