import { useState } from 'react'
import Modal from './Modal'

// `onConfirm` returns a promise; the dialog shows progress and any error message.
export default function Confirm({ title, message, confirmLabel = 'Delete', tone = 'danger', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(e.friendly || 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="modal-body">
        <p className="muted">{message}</p>
        {error && <p className="form-error">{error}</p>}
      </div>
      <footer className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className={`btn ${tone}`} onClick={run} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </footer>
    </Modal>
  )
}
