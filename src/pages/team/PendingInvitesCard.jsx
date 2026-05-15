import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { ROLE_COLORS, formatInviteExpiry } from './teamUtils'

function PendingInvitesCard({ pendingInvites, canManage, onCancelInvite }) {
  if (pendingInvites.length === 0) return null

  return (
    <Card>
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <EmailOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Pending Invitations ({pendingInvites.length})
        </Typography>
      </Box>
      <List disablePadding>
        {pendingInvites.map((invite, index) => (
          <Box key={invite._id}>
            {index > 0 && <Divider sx={{ mx: 3 }} />}
            <ListItem
              sx={{ px: 3, py: 1.5 }}
              secondaryAction={
                canManage && (
                  <Tooltip title="Cancel invitation">
                    <IconButton size="small" color="error" onClick={() => onCancelInvite(invite._id)}>
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
                secondary={`Expires ${formatInviteExpiry(invite.expiresAt)}`}
              />
            </ListItem>
          </Box>
        ))}
      </List>
    </Card>
  )
}

export default PendingInvitesCard
