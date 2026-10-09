import { Navigate, Route, Routes } from 'react-router'
import { Title } from '@mantine/core'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import AppLayout from './components/AppLayout.jsx'
import LoginPage from './pages/LoginPage.jsx'

// Placeholders until the employee list and insights slices are built.
function Placeholder({ title }) {
  return <Title order={1}>{title}</Title>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/employees" element={<Placeholder title="Employees" />} />
          <Route path="/insights" element={<Placeholder title="Insights" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  )
}
