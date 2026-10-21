import { useEffect, useId, useMemo, useState } from 'react'
import { FiUpload } from 'react-icons/fi'
import Modal from './Modal'
import PasswordInput from './PasswordInput'
import SafeImg from './SafeImg'

// Generic add/edit form driven by a list of field definitions (see api/catalogs.js).
// `onSubmit(values)` returns a promise; failures are shown inside the dialog.
const MAX_IMAGE_MB = 10

export default function ItemForm({ title, fields, initial = {}, editing, onSubmit, onClose, submitLabel = 'Save', validate, note }) {
  const visible = useMemo(() => fields.filter((f) => !(editing && f.onlyOnAdd)), [fields, editing])
  const [values, setValues] = useState(() =>
    Object.fromEntries(visible.filter((f) => f.type !== 'file').map((f) => [f.name, initial[f.name] ?? (f.type === 'checkbox' ? false : '')])),
  )
  const [file, setFile] = useState(null)
  const uid = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }))
  const blobUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])
  useEffect(() => () => blobUrl && URL.revokeObjectURL(blobUrl), [blobUrl]) // free the picture when it is replaced or the dialog closes
  const preview = blobUrl || initial.img?.url || ''

  const submit = async (e) => {
    e.preventDefault()
    const out = {}
    for (const f of visible) {
      if (f.type === 'file') {
        if (!file && f.required && !editing) return setError('Please choose an image.')
        if (file) out[f.name] = file
        continue
      }
      if (f.hideWhen && values[f.hideWhen]) continue
      const v = f.type === 'checkbox' ? values[f.name] : f.type === 'password' ? String(values[f.name]) : String(values[f.name]).trim()
      if (f.required && !v) return setError(`${f.label} is required.`)
      out[f.name] = v
    }
    const problem = validate?.(out)
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    try {
      await onSubmit(out)
    } catch (err) {
      setError(err.friendly || 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body form-grid">
          {note && <p className="muted">{note}</p>}
          {visible.map((f) => {
            if (f.hideWhen && values[f.hideWhen]) return null
            if (f.type === 'file') {
              return (
                <div className="field" key={f.name}>
                  <span className="label">{f.label}{f.required && !editing ? ' *' : ''}</span>
                  <label className="drop">
                    <SafeImg src={preview} fallback={<FiUpload />} />
                    <span>{file ? file.name : preview ? 'Click to replace' : 'Click to choose an image'}</span>
                    <small>Converted to WebP and resized automatically</small>
                    <input type="file" accept="image/*" hidden onChange={(e) => {
                      const picked = e.target.files?.[0] || null
                      if (picked && picked.size > MAX_IMAGE_MB * 1024 * 1024) {
                        setError(`That image is larger than ${MAX_IMAGE_MB} MB.`)
                        e.target.value = ''
                        return
                      }
                      setError('')
                      setFile(picked)
                    }} />
                  </label>
                </div>
              )
            }
            if (f.type === 'checkbox') {
              return (
                <label className="check" key={f.name}>
                  <input type="checkbox" checked={values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                  <span>{f.label}</span>
                </label>
              )
            }
            if (f.type === 'password') {
              return (
                <div className="field" key={f.name}>
                  <label className="label" htmlFor={`${uid}-${f.name}`}>{f.label}{f.required ? ' *' : ''}</label>
                  <PasswordInput
                    id={`${uid}-${f.name}`}
                    value={values[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                    autoFocus={f === visible[0]}
                  />
                </div>
              )
            }
            const Tag = f.type === 'textarea' ? 'textarea' : 'input'
            return (
              <label className="field" key={f.name}>
                <span className="label">{f.label}{f.required ? ' *' : ''}</span>
                <Tag
                  value={values[f.name]}
                  rows={f.type === 'textarea' ? 4 : undefined}
                  inputMode={f.inputMode}
                  onChange={(e) => set(f.name, e.target.value)}
                  autoFocus={f === visible[0]}
                />
              </label>
            )
          })}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : submitLabel}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
