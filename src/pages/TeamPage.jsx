import { useState, useEffect, useCallback } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import api from '../lib/api'
import useAuthStore from '../stores/authStore'
import InviteDialog from './team/InviteDialog'
import PendingInvitesCard from './team/PendingInvitesCard'
import TeamMembersCard from './team/TeamMembersCard'
import { TEAM_ROLES, canManageTeam } from './team/teamUtils'
import { SoftPageHeader, SoftButton } from '../components/soft-ui'

export default function TeamPage() {
  const { user } = useAuthStore()
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [menuMember, setMenuMember] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteStatus, setInviteStatus] = useState(null)

  const canManage = canManageTeam(user)

  const fetchTeam = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/team')
      setMembers(data.members || [])
      setPendingInvites(data.pendingInvites || [])
    } catch {
      setError('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  const handleInviteCreated = async (result) => {
    await fetchTeam()

    if (result?.emailSent === false) {
      setInviteStatus({
        severity: 'warning',
        message: result.message || 'Invitation created, but the email could not be delivered.',
        inviteLink: result.inviteLink || '',
        deliveryError: result.deliveryError || '',
      })
      return
    }

    setInviteStatus({
      severity: 'success',
      message: result?.message || 'Invitation sent successfully.',
      inviteLink: '',
      deliveryError: '',
    })
  }

  const handleCopyInviteLink = async () => {
    if (!inviteStatus?.inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteStatus.inviteLink)
      setInviteStatus((current) => current ? {
        ...current,
        message: 'Invite link copied. Share it with your teammate to let them join.',
      } : current)
    } catch {
      setError('Failed to copy the invite link. You can still copy it from the field below.')
    }
  }

  const handleOpenMemberMenu = (anchor, member) => {
    setMenuAnchor(anchor)
    setMenuMember(member)
  }

  const handleCloseMemberMenu = () => {
    setMenuAnchor(null)
    setMenuMember(null)
  }

  const handleRoleChange = async (memberId, newRole) => {
    setActionLoading(true)
    try {
      await api.patch(`/team/${memberId}/role`, { role: newRole })
      await fetchTeam()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role')
    } finally {
      setActionLoading(false)
    }
    handleCloseMemberMenu()
  }

  const handleRemove = async (memberId) => {
    setActionLoading(true)
    try {
      await api.delete(`/team/${memberId}`)
      setDeleteConfirm(null)
      await fetchTeam()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelInvite = async (inviteId) => {
    try {
      await api.delete(`/team/invite/${inviteId}`)
      await fetchTeam()
    } catch {
      // Keep the page quiet here; a stale invite can be refreshed away on the next load.
    }
  }

  const canActOn = (member) => {
    if (member.role === 'owner') return false
    if (member._id === user?._id) return false
    if (user?.role === 'admin' && member.role === 'admin') return false
    return canManage
  }

  return (
    <Box>
      <SoftPageHeader
        title="Team"
        subtitle="Manage team members, invitations, and workspace roles."
        actions={canManage && (
          <SoftButton
            variant="contained"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite Member
          </SoftButton>
        )}
      />

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}
      {inviteStatus && (
        <Alert
          severity={inviteStatus.severity}
          sx={{ mb: 3 }}
          onClose={() => setInviteStatus(null)}
          action={inviteStatus.inviteLink ? (
            <SoftButton color="inherit" size="small" onClick={handleCopyInviteLink}>
              Copy Invite Link
            </SoftButton>
          ) : null}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {inviteStatus.message}
            </Typography>
            {inviteStatus.deliveryError && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                Email provider response: {inviteStatus.deliveryError}
              </Typography>
            )}
            {inviteStatus.inviteLink && (
              <TextField
                fullWidth
                size="small"
                margin="dense"
                value={inviteStatus.inviteLink}
                slotProps={{ input: { readOnly: true } }}
              />
            )}
          </Box>
        </Alert>
      )}

      <TeamMembersCard
        members={members}
        loading={loading}
        user={user}
        canActOn={canActOn}
        onOpenMemberMenu={handleOpenMemberMenu}
      />

      <PendingInvitesCard
        pendingInvites={pendingInvites}
        canManage={canManage}
        onCancelInvite={handleCancelInvite}
      />

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMemberMenu}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>
          Change Role
        </Typography>
        {TEAM_ROLES.map((role) => (
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

      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteConfirm?.name}</strong> from the team? They will lose access immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <SoftButton onClick={() => setDeleteConfirm(null)} color="dark" variant="outlined">Cancel</SoftButton>
          <SoftButton onClick={() => handleRemove(deleteConfirm?._id)} color="error" variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Remove'}
          </SoftButton>
        </DialogActions>
      </Dialog>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={handleInviteCreated} />
    </Box>
  )
}
