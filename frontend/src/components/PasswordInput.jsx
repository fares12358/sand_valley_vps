import { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'

// Password box with a show/hide toggle. Pass `id` so an external <label htmlFor> can point at it.
export default function PasswordInput({ id, value, onChange, autoComplete = 'new-password', autoFocus, icon }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-wrap">
      {icon}
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        title={show ? 'Hide password' : 'Show password'}
      >
        {show ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  )
}
