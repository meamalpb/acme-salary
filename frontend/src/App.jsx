import { Navigate, Route, Routes } from 'react-router'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import AppLayout from './components/AppLayout.jsx'
import EmployeesPage from './pages/EmployeesPage.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/employees" element={<EmployeesPage key="active" status="active" />} />
          <Route path="/employees/terminated" element={<EmployeesPage key="terminated" status="terminated" />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  )
}
