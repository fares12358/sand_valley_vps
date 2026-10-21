import { useEffect, useId, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowLeft, FiCheckCircle, FiLock } from 'react-icons/fi'
import { forgotApi } from '../api/catalogs'
import { useAuth } from '../auth/AuthContext'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import { useToast } from '../components/Toast'

const STEPS = ['Account', 'Code', 'New password']
const RESEND_SECONDS = 60
const MIN_PASSWORD = 6

// Three steps against the existing endpoints: e-mail a code, check it, set the new password.
export default function ForgotPassword() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const ids = { input: useId(), otp: useId(), pw: useId(), confirm: useId() }

  const [step, setStep] = useState(0)
  const [input, setInput] = useState(location.state?.username || '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  if (user) return <Navigate to="/" replace />

  const run = async (fn) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      await fn()
    } catch (e) {
      setError(e.friendly || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const sendCode = (e) => {
    e.preventDefault()
    if (!input.trim()) return setError('Enter your username or email.')
    return run(async () => {
      await forgotApi.request(input.trim())
      setWait(RESEND_SECONDS)
      setStep(1)
      setInfo('We sent a 6-digit code to the email on your account. It expires in 10 minutes.')
    })
  }

  const resend = () =>
    run(async () => {
      await forgotApi.request(input.trim())
      setWait(RESEND_SECONDS)
      setInfo('A new code was sent.')
    })

  const checkCode = (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the 6-digit code.')
    return run(async () => {
      await forgotApi.verify(input.trim(), otp.trim())
      setStep(2)
    })
  }

  const savePassword = (e) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(`The password must be at least ${MIN_PASSWORD} characters.`)
    if (password !== confirm) return setError('The passwords do not match.')
    return run(async () => {
      await forgotApi.reset(input.trim(), otp.trim(), password)
      toast.success('Password updated. Sign in with your new password.')
      navigate('/login', { replace: true })
    })
  }

  const back = () => {
    setError('')
    setInfo('')
    setStep((s) => Math.max(0, s - 1))
  }

  return (
    <AuthShell>
      <motion.div
        className="auth-form"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <p className="eyebrow">Password help</p>
        <h1>Reset your password</h1>

        <ol className="steps" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'on' : i < step ? 'done' : ''}>
              <span>{i < step ? <FiCheckCircle /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          <motion.form
            key={step}
            noValidate
            className="forgot-form"
            onSubmit={step === 0 ? sendCode : step === 1 ? checkCode : savePassword}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <div className="field">
                <label className="label" htmlFor={ids.input}>Username or email</label>
                <input id={ids.input} value={input} onChange={(e) => setInput(e.target.value)} autoComplete="username" autoFocus />
                <small className="muted">We will email a code to the address on this account.</small>
              </div>
            )}

            {step === 1 && (
              <>
                {info && <p className="note-ok">{info}</p>}
                <div className="field">
                  <label className="label" htmlFor={ids.otp}>6-digit code</label>
                  <input
                    id={ids.otp}
                    className="otp"
                    value={otp}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>
                <button type="button" className="link-btn" disabled={busy || wait > 0} onClick={resend}>
                  {wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="field">
                  <label className="label" htmlFor={ids.pw}>New password (min {MIN_PASSWORD} characters)</label>
                  <PasswordInput id={ids.pw} value={password} onChange={(e) => setPassword(e.target.value)} icon={<FiLock />} autoFocus />
                </div>
                <div className="field">
                  <label className="label" htmlFor={ids.confirm}>Confirm new password</label>
                  <PasswordInput id={ids.confirm} value={confirm} onChange={(e) => setConfirm(e.target.value)} icon={<FiLock />} />
                </div>
              </>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="auth-actions">
              {step > 0 && (
                <button type="button" className="btn ghost" onClick={back} disabled={busy}>
                  <FiArrowLeft /> Back
                </button>
              )}
              <button type="submit" className="btn primary grow" disabled={busy}>
                {busy ? 'Please wait…' : step === 0 ? 'Send code' : step === 1 ? 'Verify code' : 'Save password'}
              </button>
            </div>
          </motion.form>
        </AnimatePresence>

        <Link to="/login" className="link-btn center">
          <FiArrowLeft /> Back to sign in
        </Link>
      </motion.div>
    </AuthShell>
  )
}
