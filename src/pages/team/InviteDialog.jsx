import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import api from '../../lib/api'

const EMPTY_INVITE_FORM = { email: '', role: 'member' }

function InviteDialog({ open, onClose, onInvited }) {
  const [form, setForm] = useState(EMPTY_INVITE_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_INVITE_FORM)
      setError('')
    }
  }, [open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim()) { setError('Email is required'); return }

    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/team/invite', form)
      await onInvited(data)
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
          We&apos;ll email them an invite link. If delivery fails, you&apos;ll get a copyable link here right away.
        </Alert>
        <form onSubmit={handleSubmit} id="invite-form">
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={form.email}
            onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
            sx={{ mb: 2 }}
            autoFocus
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={form.role}
              onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
            >
              <MenuItem value="admin">Admin : Can manage products, orders, and invite members</MenuItem>
              <MenuItem value="member">Member : Can view and process orders</MenuItem>
            </Select>
          </FormControl>
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          form="invite-form"
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PersonAddOutlinedIcon />}
        >
          {loading ? 'Sending...' : 'Send Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InviteDialog
