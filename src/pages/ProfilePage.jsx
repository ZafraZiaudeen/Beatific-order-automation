import { useMemo, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import api from '../lib/api'
import { buildAssetThumbnailUrl, uploadAssetFile, validateAssetFile } from '../lib/assets'
import { canManageWorkspace } from '../lib/permissions'
import useAuthStore from '../stores/authStore'
import defaultProfileImage from '../assets/profile.svg'
import { SoftButton, SoftCard } from '../components/soft-ui'

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024
const LOCAL_IMAGE_PREFIX = 'beatific_profile_image_'

const roleStyles = {
  owner: { color: '#9a3412', bgcolor: '#fff7ed', borderColor: '#fed7aa' },
  admin: { color: '#075985', bgcolor: '#e0f2fe', borderColor: '#bae6fd' },
  member: { color: '#3f3f46', bgcolor: '#f4f4f5', borderColor: '#e4e4e7' },
}

const getInitials = (name) =>
  name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '??'

const getLocalImage = (userId) => {
  if (!userId) return ''
  return localStorage.getItem(`${LOCAL_IMAGE_PREFIX}${userId}`) || ''
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })

function ProfileMetric({ icon, label, value }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        p: 1.55,
        borderRadius: '0.875rem',
        bgcolor: '#fafafa',
        border: '1px solid',
        borderColor: alpha('#000', 0.06),
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ color: '#f97316', display: 'flex' }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography noWrap sx={{ fontSize: '0.875rem', color: '#27272a', fontWeight: 700 }}>
            {value || 'Not set'}
          </Typography>
        </Box>
      </Stack>
    </Box>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.25 }}>
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '0.75rem',
          bgcolor: '#fff7ed',
          color: '#ea580c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: '#18181b', lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: '#71717a', mt: 0.35 }}>
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  )
}

export default function ProfilePage() {
  const { user, company, fetchMe } = useAuthStore()
  const canUploadProfileImage = canManageWorkspace(user)
  const fileInputRef = useRef(null)
  const localImageKey = `${LOCAL_IMAGE_PREFIX}${user?._id || 'guest'}`

  const [name, setName] = useState(user?.name || '')
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl || getLocalImage(user?._id))
  const [imageUploading, setImageUploading] = useState(false)
  const [imageProgress, setImageProgress] = useState(0)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState('')
  const [nameError, setNameError] = useState('')

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')

  const roleStyle = roleStyles[user?.role] || roleStyles.member
  const displayImage = useMemo(() => {
    if (!profileImageUrl) return defaultProfileImage
    if (profileImageUrl.startsWith('data:') || profileImageUrl.startsWith('blob:')) return profileImageUrl
    return buildAssetThumbnailUrl(profileImageUrl, 600)
  }, [profileImageUrl])

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

  const handleProfileImageSelect = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const validation = validateAssetFile(file, {
      allowImages: true,
      allowPdf: false,
      maxSize: MAX_PROFILE_IMAGE_SIZE,
    })
    if (validation) { setNameError(validation); return }

    setImageUploading(true)
    setImageProgress(0)
    setNameError('')
    setNameSuccess('')

    try {
      const uploadedUrl = await uploadAssetFile({
        file,
        folder: 'profiles',
        onProgress: setImageProgress,
      })

      if (uploadedUrl?.startsWith('blob:')) {
        const dataUrl = await fileToDataUrl(file)
        localStorage.setItem(localImageKey, dataUrl)
        setProfileImageUrl(dataUrl)
        setNameSuccess('Profile image preview saved for this browser')
        return
      }

      await api.patch('/auth/profile', { profileImageUrl: uploadedUrl })
      localStorage.removeItem(localImageKey)
      setProfileImageUrl(uploadedUrl)
      await fetchMe()
      setNameSuccess('Profile image updated successfully')
    } catch (err) {
      setNameError(err.response?.data?.message || err.message || 'Failed to upload profile image')
    } finally {
      setImageUploading(false)
      setImageProgress(0)
      setTimeout(() => setNameSuccess(''), 3000)
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
    <Box sx={{ pb: 3 }}>
      <SoftCard
        hover={false}
        sx={{
          minHeight: { md: 'calc(100vh - 124px)' },
          borderRadius: '1.25rem',
          borderColor: alpha('#000', 0.08),
          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box
          sx={{
            minHeight: 230,
            p: { xs: 2.25, md: 4 },
            display: 'flex',
            alignItems: 'flex-end',
            background:
              'linear-gradient(135deg, #FA852C 0%, #FABE93 100%)',
            borderBottom: '1px solid',
            borderColor: alpha('#000', 0.06),
          }}
        >
          <Grid container spacing={3} alignItems="flex-end">
            <Grid item xs={12} md={8}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'flex-end' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: { xs: 132, sm: 154 },
                    height: { xs: 132, sm: 154 },
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '5px solid #fff',
                    boxShadow: '0 18px 36px rgba(39, 39, 42, 0.18)',
                    bgcolor: '#f4f4f5',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    component="img"
                    src={displayImage}
                    alt={user?.name ? `${user.name} profile` : 'Profile'}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {canUploadProfileImage && (
                    <Tooltip title="Upload profile image">
                      <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageUploading}
                        sx={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          mx: 'auto',
                          width: '100%',
                          height: 44,
                          borderRadius: 0,
                          color: '#fff',
                          bgcolor: alpha('#000', 0.56),
                          '&:hover': { bgcolor: alpha('#000', 0.68) },
                        }}
                      >
                        {imageUploading ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraOutlinedIcon />}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
                    <Chip
                      label={user?.role || 'member'}
                      size="small"
                      sx={{
                        textTransform: 'capitalize',
                        fontWeight: 800,
                        color: roleStyle.color,
                        bgcolor: roleStyle.bgcolor,
                        border: '1px solid',
                        borderColor: roleStyle.borderColor,
                      }}
                    />
                  </Stack>
                  <Typography
                    sx={{
                      color: '#18181b',
                      fontSize: { xs: '2rem', md: '2.65rem' },
                      lineHeight: 1.05,
                      fontWeight: 900,
                      letterSpacing: 0,
                    }}
                  >
                    {user?.name || 'Profile'}
                  </Typography>
                  <Typography sx={{ mt: 1, color: '#52525b', fontSize: '0.95rem', maxWidth: 560 }}>
                    Manage identity, workspace access, and account security from one clean settings view.
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={4}>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6} md={12}>
                  <ProfileMetric icon={<EmailOutlinedIcon fontSize="small" />} label="Email" value={user?.email} />
                </Grid>
                <Grid item xs={12} sm={6} md={12}>
                  <ProfileMetric icon={<BusinessOutlinedIcon fontSize="small" />} label="Company" value={company?.name} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleProfileImageSelect}
          />
        </Box>

        {imageUploading && <LinearProgress variant="determinate" value={imageProgress} />}

        <Box sx={{ p: { xs: 2.25, md: 4 } }}>
          {(nameSuccess || nameError) && (
            <Alert
              severity={nameError ? 'error' : 'info'}
              sx={{
                mb: 2,
                borderRadius: '0.875rem',
                ...(nameSuccess && {
                  color: '#9a3412',
                  bgcolor: '#fff7ed',
                  '& .MuiAlert-icon': { color: '#f97316' },
                }),
              }}
            >
              {nameError || nameSuccess}
            </Alert>
          )}

          <Grid container columnSpacing={3} rowSpacing={0}>
            <Grid item xs={12} lg={8}>
              <Stack spacing={5}>
                <Box
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    border: '1px solid',
                    borderColor: alpha('#000', 0.08),
                    borderRadius: '1rem',
                    bgcolor: '#fff',
                  }}
                >
                  <SectionHeader
                    icon={<BadgeOutlinedIcon fontSize="small" />}
                    title="Contact Details"
                    subtitle="Update the details shown inside your workspace."
                  />

                  <form onSubmit={handleNameSave}>
                    <Grid container spacing={1.8}>
                      <Grid item xs={12} md={12}>
                        <TextField
                          size="small"
                          label="Full Name"
                          fullWidth
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          variant="outlined"
                          slotProps={{ input: { sx: { borderRadius: '0.875rem', minHeight: 48 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={12}>
                        <TextField
                          size="small"
                          label="Email Address"
                          fullWidth
                          value={user?.email || ''}
                          disabled
                          variant="outlined"
                          slotProps={{ input: { sx: { borderRadius: '0.875rem', minHeight: 48 } } }}
                        />
                      </Grid>
                      <Grid item xs={12} md={12}>
                        <TextField
                          size="small"
                          label="Company"
                          fullWidth
                          value={company?.name || ''}
                          disabled
                          variant="outlined"
                          slotProps={{ input: { sx: { borderRadius: '0.875rem', minHeight: 48 } } }}
                        />
                      </Grid>
                    </Grid>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 2.25 }}>
                      <SoftButton
                        type="button"
                        variant="outlined"
                        startIcon={<AddPhotoAlternateOutlinedIcon />}
                        disabled={!canUploadProfileImage || imageUploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {canUploadProfileImage ? 'Change Photo' : 'Admin Photo Only'}
                      </SoftButton>
                      <SoftButton
                        type="submit"
                        variant="contained"
                        disabled={nameLoading || name === user?.name}
                        startIcon={nameLoading ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{
                          color: '#fff',
                          '&.Mui-disabled': { color: '#fff' },
                        }}
                      >
                        {nameLoading ? 'Saving...' : 'Save Changes'}
                      </SoftButton>
                    </Stack>
                  </form>
                </Box>

                <Box
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    border: '1px solid',
                    borderColor: alpha('#000', 0.08),
                    borderRadius: '1rem',
                    bgcolor: '#fff',
                  }}
                >
                  <SectionHeader
                    icon={<LockOutlinedIcon fontSize="small" />}
                    title="Security"
                    subtitle="Change your password with your current credentials."
                  />

                  {pwSuccess && (
                    <Alert
                      severity="info"
                      sx={{
                        mb: 2,
                        borderRadius: '0.875rem',
                        color: '#9a3412',
                        bgcolor: '#fff7ed',
                        '& .MuiAlert-icon': { color: '#f97316' },
                      }}
                    >
                      {pwSuccess}
                    </Alert>
                  )}
                  {pwError && <Alert severity="error" sx={{ mb: 2, borderRadius: '0.875rem' }}>{pwError}</Alert>}

                  <form onSubmit={handlePasswordChange}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={12}>
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
                              sx: { borderRadius: '0.875rem', minHeight: 48 },
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={togglePw('current')} edge="end">
                                    {showPw.current ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={12}>
                        <TextField
                          size="small"
                          label="New Password"
                          fullWidth
                          type={showPw.newPw ? 'text' : 'password'}
                          value={pwForm.newPw}
                          onChange={(e) => setPwForm((f) => ({ ...f, newPw: e.target.value }))}
                          variant="outlined"
                          slotProps={{
                            input: {
                              sx: { borderRadius: '0.875rem', minHeight: 48 },
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton onClick={togglePw('newPw')} edge="end">
                                    {showPw.newPw ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={12}>
                        <TextField
                          size="small"
                          label="Confirm New Password"
                          fullWidth
                          type="password"
                          value={pwForm.confirm}
                          onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                          variant="outlined"
                          slotProps={{ input: { sx: { borderRadius: '0.875rem', minHeight: 48 } } }}
                        />
                      </Grid>
                    </Grid>
                    <SoftButton
                      type="submit"
                      variant="contained"
                      disabled={pwLoading || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
                      startIcon={pwLoading ? <CircularProgress size={16} color="inherit" /> : null}
                      sx={{
                        mt: 2.25,
                        color: '#fff',
                        '&.Mui-disabled': { color: '#fff' },
                      }}
                    >
                      {pwLoading ? 'Updating...' : 'Update Password'}
                    </SoftButton>
                  </form>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Box
                sx={{
                  p: { xs: 2, md: 2.5 },
                  border: '1px solid',
                  borderColor: alpha('#000', 0.08),
                  borderRadius: '1rem',
                  bgcolor: '#fff',
                }}
              >
                <SectionHeader
                  icon={<ShieldOutlinedIcon fontSize="small" />}
                  title="Account Overview"
                  subtitle="Current access and workspace identity."
                />

                <Stack spacing={1.25}>
                  <ProfileMetric icon={<BadgeOutlinedIcon fontSize="small" />} label="Display Initials" value={getInitials(user?.name)} />
                  <ProfileMetric icon={<ShieldOutlinedIcon fontSize="small" />} label="Access Level" value={`${user?.role || 'member'} access`} />
                  <ProfileMetric icon={<BusinessOutlinedIcon fontSize="small" />} label="Workspace" value={company?.name} />
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </SoftCard>
    </Box>
  )
}
