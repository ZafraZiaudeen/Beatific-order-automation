import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/auth/AuthPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<AuthPage defaultTab="login" />} />
      <Route path="/register" element={<AuthPage defaultTab="register" />} />
      <Route path="*"         element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
