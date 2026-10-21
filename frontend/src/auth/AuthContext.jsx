import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { loginRequest, meRequest } from '../api/catalogs'
import { setUnauthorizedHandler, tokenStore } from '../api/client'

const USER_KEY = 'sv_user'
const AuthContext = createContext(null)

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw && tokenStore.get() ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)

  const logout = useCallback(() => {
    tokenStore.clear()
    try {
      localStorage.removeItem(USER_KEY)
    } catch {
      /* storage unavailable */
    }
    setUser(null)
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await loginRequest(username, password)
    const u = { ...data.user, token: undefined }
    tokenStore.set(data.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
    return u
  }, [])

  // an expired, revoked or deleted session (the API answers 401, or 403 "Invalid or expired token")
  useEffect(() => setUnauthorizedHandler(logout), [logout])

  // The catalog pages use public read endpoints, so a dead token would go unnoticed until the first save.
  // Ask the server who we are whenever a session starts or is restored: a dead token logs out right away
  // (the response interceptor handles that), and the role shown always comes from the database.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    meRequest().then(
      (fresh) => {
        if (cancelled) return
        setUser((prev) => {
          if (!prev) return prev
          const next = { ...prev, ...fresh }
          try {
            localStorage.setItem(USER_KEY, JSON.stringify(next))
          } catch {
            /* storage unavailable */
          }
          return next
        })
      },
      () => {} // network trouble: keep the session, the interceptor already handled a real 401/403
    )
    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo(
    () => ({ user, login, logout, isAdmin: user?.role === 'admin' }),
    [user, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
