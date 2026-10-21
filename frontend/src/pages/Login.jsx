import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiLock, FiUser } from 'react-icons/fi'
import { useAuth } from '../auth/AuthContext'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return setError('Enter your username and password.')
    setBusy(true)
    setError('')
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(err.friendly || 'Login failed.')
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <motion.form
        className="auth-form"
        onSubmit={submit}
        noValidate
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <p className="eyebrow">Dashboard</p>
        <h1>Sign in</h1>
        <p className="muted lead">Use the account you were given by the master admin.</p>

        <label className="field">
          <span className="label">Username</span>
          <div className="input-wrap">
            <FiUser />
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          </div>
        </label>

        <div className="field">
          <label className="label" htmlFor="login-password">Password</label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            icon={<FiLock />}
          />
        </div>

        <Link to="/forgot-password" state={{ username }} className="link-btn right">
          Forgot password?
        </Link>

        {error && (
          <motion.p className="form-error" role="alert" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            {error}
          </motion.p>
        )}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </motion.form>
    </AuthShell>
  )
}
