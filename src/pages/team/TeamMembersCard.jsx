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
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { getInitials, ROLE_COLORS } from './teamUtils'

function TeamMembersCard({ members, loading, user, canActOn, onOpenMemberMenu }) {
  return (
    <Card sx={{ mb: 3 }}>
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <GroupOutlinedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Members ({loading ? '...' : members.length})
        </Typography>
      </Box>

      <List disablePadding>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <ListItem key={index} sx={{ px: 3, py: 2 }}>
              <ListItemAvatar><Skeleton variant="circular" width={40} height={40} /></ListItemAvatar>
              <ListItemText
                primary={<Skeleton width="40%" />}
                secondary={<Skeleton width="60%" />}
              />
            </ListItem>
          ))
        ) : members.map((member, index) => (
          <Box key={member._id}>
            {index > 0 && <Divider sx={{ mx: 3 }} />}
            <ListItem
              sx={{ px: 3, py: 1.5 }}
              secondaryAction={
                canActOn(member) ? (
                  <IconButton
                    size="small"
                    onClick={(e) => onOpenMemberMenu(e.currentTarget, member)}
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
  )
}

export default TeamMembersCard
