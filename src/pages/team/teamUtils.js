export const ROLE_COLORS = {
  owner: { bgcolor: '#FFF7ED', color: '#EA580C' },
  admin: { bgcolor: '#E0F2FE', color: '#0369A1' },
  member: { bgcolor: '#F4F6F8', color: '#637381' },
}

export const TEAM_ROLES = ['admin', 'member']

export const getInitials = (name) =>
  name ? name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2) : '??'

export const formatInviteExpiry = (date) =>
  date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''

export const canManageTeam = (user) => user?.role === 'owner' || user?.role === 'admin'
