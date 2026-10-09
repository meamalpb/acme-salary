import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './context.js'

export default function ProtectedRoute() {
  const { isSignedIn } = useAuth()
  const location = useLocation()

  if (!isSignedIn) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
