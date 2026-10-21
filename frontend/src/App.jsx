import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Layout from './components/Layout'
import Catalog from './pages/Catalog'
import ForgotPassword from './pages/ForgotPassword'
import Login from './pages/Login'
import MainImages from './pages/MainImages'
import Overview from './pages/Overview'
import Users from './pages/Users'

function Protected({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Overview />} />
        <Route path="main-images" element={<MainImages />} />
        <Route path="users" element={<Users />} />
        <Route path=":catalog/*" element={<Catalog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
