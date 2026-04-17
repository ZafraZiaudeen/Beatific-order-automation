import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/auth/AuthPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import PlaceholderPage from './pages/PlaceholderPage'
import ProtectedRoute from './components/common/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<AuthPage defaultTab="login" />} />
      <Route path="/register" element={<AuthPage defaultTab="register" />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      {/* Dashboard routes — protected */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Orders */}
        <Route path="/orders/etsy" element={<PlaceholderPage />} />
        <Route path="/orders/lulu" element={<PlaceholderPage />} />

        {/* Products */}
        <Route path="/products" element={<PlaceholderPage />} />

        {/* Import */}
        <Route path="/import" element={<PlaceholderPage />} />

        {/* Settings */}
        <Route path="/settings/team" element={<PlaceholderPage />} />
        <Route path="/settings/stores" element={<PlaceholderPage />} />
        <Route path="/settings/profile" element={<PlaceholderPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
