import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_RANK } from '../data/seeds'

export default function AccessRoute({ minimumRole = null }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="app-loading">Carregando sistema...</div>
  if (!user) return <Navigate to="/login" replace />
  if (minimumRole && (ROLE_RANK[user.role] ?? -1) < ROLE_RANK[minimumRole]) return <Navigate to="/hierarquia" replace />
  return <Outlet />
}
