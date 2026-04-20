import { useState, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Menu from '@mui/material/Menu'
import { alpha } from '@mui/material/styles'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'

const ROLE_COLORS = {
  owner: { bgcolor: '#D3FCD2', color: '#118D57' },
  admin: { bgcolor: '#D6E4FF', color: '#1939B7' },
  member: { bgcolor: '#F4F6F8', color: '#637381' },
}

const getInitials = (name) =>
  name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '??'

function InviteDialog({ open, onClose, onInvited }) {
  const [form, setForm] = useState({ email: '', role: 'member' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => { setForm({ email: '', role: 'member' }); setError('') }

  useEffect(() => { if (!open) reset() }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim()) { setError('Email is required'); return }
    setLoading(true); setError('')
    try {
      await api.post('/team/invite', form)
      onInvited()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Invite Team Member</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.82rem' }}>
          They'll receive an email with a link to create their account.
        </Alert>
        <form onSubmit={handleSubmit} id="invite-form">
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            sx={{ mb: 2 }}
            autoFocus
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              <MenuItem value="admin">Admin : Can manage products, orders, and invite members</MenuItem>
              <MenuItem value="member">Member : Can view and process orders</MenuItem>
            </Select>
          </FormControl>
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button form="invite-form" type="submit" variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddOutlinedIcon />}>
          {loading ? 'Sending...' : 'Send Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function TeamPage() {
  const { user } = useAuthStore()
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuMember, setMenuMember] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [roleEdit, setRoleEdit] = useState(null) // { member, newRole }
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/team/members')
      setMembers(data.members || [])
      setPendingInvites(data.pendingInvites || [])
    } catch {
      setError('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  const canManage = user?.role === 'owner' || user?.role === 'admin'

  const handleRoleChange = async (memberId, newRole) => {
    setActionLoading(true)
    try {
      await api.patch(`/team/members/${memberId}/role`, { role: newRole })
      fetchTeam()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role')
    } finally {
      setActionLoading(false)
    }
    setMenuAnchor(null)
  }

  const handleRemove = async (memberId) => {
    setActionLoading(true)
    try {
      await api.delete(`/team/members/${memberId}`)
      setDeleteConfirm(null)
      fetchTeam()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelInvite = async (inviteId) => {
    try {
      await api.delete(`/team/invitations/${inviteId}`)
      fetchTeam()
    } catch {
      //
    }
  }

  const canActOn = (member) => {
    if (member.role === 'owner') return false
    if (member._id === user?._id) return false
    if (user?.role === 'admin' && member.role === 'admin') return false
    return canManage
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Team</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your team members and invitations.
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite Member
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Members */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <GroupOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Members ({loading ? '…' : members.length})
          </Typography>
        </Box>

        <List disablePadding>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <ListItem key={i} sx={{ px: 3, py: 2 }}>
                <ListItemAvatar><Skeleton variant="circular" width={40} height={40} /></ListItemAvatar>
                <ListItemText
                  primary={<Skeleton width="40%" />}
                  secondary={<Skeleton width="60%" />}
                />
              </ListItem>
            ))
          ) : members.map((member, i) => (
            <Box key={member._id}>
              {i > 0 && <Divider sx={{ mx: 3 }} />}
              <ListItem
                sx={{ px: 3, py: 1.5 }}
                secondaryAction={
                  canActOn(member) ? (
                    <IconButton
                      size="small"
                      onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuMember(member) }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700, fontSize: '0.875rem' }}>
                    {getInitials(member.name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {member.name}
                        {member._id === user?._id && (
                          <Box component="span" sx={{ ml: 0.75, fontSize: '0.72rem', color: 'text.disabled', fontWeight: 400 }}>
                            (you)
                          </Box>
                        )}
                      </Typography>
                      <Chip
                        label={member.role}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          ...ROLE_COLORS[member.role],
                        }}
                      />
                    </Box>
                  }
                  secondary={member.email}
                />
              </ListItem>
            </Box>
          ))}
        </List>
      </Card>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <Card>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
            <EmailOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Pending Invitations ({pendingInvites.length})
            </Typography>
          </Box>
          <List disablePadding>
            {pendingInvites.map((invite, i) => (
              <Box key={invite._id}>
                {i > 0 && <Divider sx={{ mx: 3 }} />}
                <ListItem
                  sx={{ px: 3, py: 1.5 }}
                  secondaryAction={
                    canManage && (
                      <Tooltip title="Cancel invitation">
                        <IconButton size="small" color="error" onClick={() => handleCancelInvite(invite._id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha('#637381', 0.1), color: 'text.secondary', fontSize: '0.875rem' }}>
                      <EmailOutlinedIcon fontSize="small" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{invite.email}</Typography>
                        <Chip
                          label={invite.role}
                          size="small"
                          sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', ...ROLE_COLORS[invite.role] }}
                        />
                      </Box>
                    }
                    secondary={`Expires ${formatDate(invite.expiresAt)}`}
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Card>
      )}

      {/* Action menu */}
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={() => { setMenuAnchor(null); setMenuMember(null) }}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>
          Change Role
        </Typography>
        {['admin', 'member'].map((role) => (
          <MenuItem
            key={role}
            disabled={menuMember?.role === role || actionLoading}
            onClick={() => handleRoleChange(menuMember?._id, role)}
            sx={{ textTransform: 'capitalize' }}
          >
            {role}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => { setDeleteConfirm(menuMember); setMenuAnchor(null) }}
          sx={{ color: 'error.main' }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} /> Remove
        </MenuItem>
      </Menu>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteConfirm?.name}</strong> from the team? They will lose access immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)} color="inherit">Cancel</Button>
          <Button onClick={() => handleRemove(deleteConfirm?._id)} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={fetchTeam} />
    </Box>
  )
}
