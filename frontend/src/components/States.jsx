import { FiAlertCircle } from 'react-icons/fi'

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="state" role="status">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state">
      <FiAlertCircle className="state-icon err" />
      <p>{message}</p>
      {onRetry && (
        <button className="btn ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

// The furrow "V" from the logo, drawn as three nested chevrons
export function EmptyState({ message, hint, children }) {
  return (
    <div className="state empty">
      <svg className="furrow" viewBox="0 0 120 72" aria-hidden="true">
        <path d="M10 14 60 56 110 14" />
        <path d="M26 14 60 42 94 14" />
        <path d="M42 14 60 28 78 14" />
      </svg>
      <p className="empty-title">{message}</p>
      {hint && <p className="muted">{hint}</p>}
      {children}
    </div>
  )
}
