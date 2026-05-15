export const canManageWorkspace = (user) => user?.role === 'owner' || user?.role === 'admin'
