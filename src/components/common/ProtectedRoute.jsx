import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'

export default function ProtectedRoute({ children }) {
  const { user, token } = useAuthStore()
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If email not verified, redirect to verify page
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />
  }

  return children
}
