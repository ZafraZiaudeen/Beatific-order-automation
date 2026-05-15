export const ROLE_COLORS = {
  owner: { bgcolor: '#D3FCD2', color: '#118D57' },
  admin: { bgcolor: '#CAFDF5', color: '#006C9C' },
  member: { bgcolor: '#F4F6F8', color: '#637381' },
}

export const TEAM_ROLES = ['admin', 'member']

export const getInitials = (name) =>
  name ? name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) : '??'

export const formatInviteExpiry = (date) =>
  date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

export const canManageTeam = (user) => user?.role === 'owner' || user?.role === 'admin'
