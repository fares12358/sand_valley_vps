import axios from 'axios'

const TOKEN_KEY = 'sv_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api/auth`,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

// The backend prefixes many messages with emoji; strip them for display.
const clean = (s) => String(s).replace(/^[^\p{L}\p{N}]+/u, '').trim()

export function errorMessage(err) {
  if (err?.code === 'ECONNABORTED') return 'The request timed out. Try again.'
  if (!err?.response) return 'Cannot reach the server. Check your connection.'
  const { status, data } = err.response
  if (status >= 500) return 'Something went wrong on the server. Try again later.'
  if (status === 429) return 'Too many attempts. Please wait a few minutes.'
  return clean(data?.message || `Request failed (${status})`)
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || ''
    // 401 = no token, 403 "Invalid or expired token" = expired, revoked or deleted account.
    // (A 403 for a plain "admins only" refusal is not a lost session.) Login failures stay on the form.
    const status = err.response?.status
    const message = String(err.response?.data?.message || '')
    const sessionLost = status === 401 || (status === 403 && /token/i.test(message))
    if (sessionLost && !url.includes('/login')) onUnauthorized()
    err.friendly = errorMessage(err)
    return Promise.reject(err)
  },
)

export default api

// Builds multipart bodies for the image endpoints; skips empty values.
export function toFormData(values) {
  const fd = new FormData()
  Object.entries(values).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    fd.append(k, v)
  })
  return fd
}
