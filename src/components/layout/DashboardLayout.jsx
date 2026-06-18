import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import Sidebar from './Sidebar'
import Header from './Header'
import FloatingHelp from './FloatingHelp'
import useAuthStore from '../../stores/authStore'

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { fetchMe, token } = useAuthStore()

  useEffect(() => {
    if (!token) return
    fetchMe()
  }, [fetchMe, token])

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          px: { xs: 1.5, sm: 2, lg: 3 },
          pb: 3,
        }}
      >
        <Header onMenuToggle={() => setMobileOpen(true)} />

        <Box
          sx={{
            flex: 1,
            maxWidth: 1500,
            width: '100%',
            mx: 'auto',
            pt: { xs: 1.5, lg: 2 },
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <FloatingHelp />
    </Box>
  )
}
