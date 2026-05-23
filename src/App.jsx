import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/auth/AuthPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import ProductLibrary2Page from './pages/ProductLibrary2Page'
import ProductLibrary2ProductsPage from './pages/ProductLibrary2ProductsPage'
import EtsyOrdersPage from './pages/EtsyOrdersPage'
import EtsyOrderDetailPage from './pages/EtsyOrderDetailPage'
import Etsy2OrdersPage from './pages/Etsy2OrdersPage'
import Etsy2OrderDetailPage from './pages/Etsy2OrderDetailPage'
import Etsy2ItemMappingPage from './pages/Etsy2ItemMappingPage'
import Etsy2StatusFlowPage from './pages/Etsy2StatusFlowPage'
import GeneratedPdfsPage from './pages/GeneratedPdfsPage'
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
          <Route path="/orders/etsy2" element={<Etsy2OrdersPage />} />
          <Route path="/orders/etsy2/:orderId" element={<Etsy2OrderDetailPage />} />
          <Route path="/orders/etsy2/:orderId/item/:itemId/mapping" element={<Etsy2ItemMappingPage />} />
          <Route path="/orders/etsy2/flow" element={<Etsy2StatusFlowPage />} />
          <Route path="/orders/generated-pdfs" element={<GeneratedPdfsPage />} />
          <Route path="/orders/lulu" element={<LuluOrdersPage />} />

          {/* Products */}
          <Route path="/product-library-2/product" element={<ProductLibrary2ProductsPage mode="list" />} />
          <Route path="/product-library-2/product/new" element={<ProductLibrary2ProductsPage mode="create" />} />
          <Route path="/product-library-2/product/:productId/edit" element={<ProductLibrary2ProductsPage mode="edit" />} />
          <Route path="/product-library-2/product/:productId/designer" element={<ProductLibrary2ProductsPage mode="designer" />} />
          <Route path="/product-library-2" element={<ProductLibrary2Page />} />
          <Route path="/product-library-2/:section/categories" element={<ProductLibrary2Page />} />
          <Route path="/product-library-2/:section" element={<ProductLibrary2Page />} />

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
