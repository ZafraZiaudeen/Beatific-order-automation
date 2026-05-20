import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/auth/AuthPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import ProductLibraryPage from './pages/ProductLibraryPage'
import EtsyOrdersPage from './pages/EtsyOrdersPage'
import EtsyOrderDetailPage from './pages/EtsyOrderDetailPage'
import LuluOrdersPage from './pages/LuluOrdersPage'
import TeamPage from './pages/TeamPage'
import StoresPage from './pages/StoresPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/common/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import useAuthStore from './stores/authStore'
import { canManageWorkspace } from './lib/permissions'

function AdminOnly({ children }) {
  const { user } = useAuthStore()
  if (!canManageWorkspace(user)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<AuthPage defaultTab="login" />} />
        <Route path="/register" element={<AuthPage defaultTab="register" />} />
        <Route path="/forgot-password" element={<AuthPage defaultTab="forgot" />} />
        <Route path="/reset-password" element={<AuthPage defaultTab="reset" />} />
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
          <Route path="/orders/etsy" element={<EtsyOrdersPage />} />
          <Route path="/orders/etsy/:etsyOrderId" element={<EtsyOrderDetailPage />} />
          <Route path="/orders/lulu" element={<LuluOrdersPage />} />

          {/* Products */}
          <Route path="/products" element={<ProductLibraryPage />} />

          {/* Settings */}
          <Route path="/settings/team" element={<AdminOnly><TeamPage /></AdminOnly>} />
          <Route path="/settings/stores" element={<AdminOnly><StoresPage /></AdminOnly>} />
          <Route path="/settings/profile" element={<ProfilePage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
