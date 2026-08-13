import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading">Carregando sistema...</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
