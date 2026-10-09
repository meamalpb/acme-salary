import { Navigate, Route, Routes } from 'react-router'
import { Title } from '@mantine/core'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import AppLayout from './components/AppLayout.jsx'
import EmployeesPage from './pages/EmployeesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'

// Placeholders until the Terminated list and insights slices are built.
function Placeholder({ title }) {
  return <Title order={1}>{title}</Title>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/terminated" element={<Placeholder title="Terminated employees" />} />
          <Route path="/insights" element={<Placeholder title="Insights" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  )
}
