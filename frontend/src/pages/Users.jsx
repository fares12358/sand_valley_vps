import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiCheckCircle, FiKey, FiMail, FiPlus, FiTrash2 } from 'react-icons/fi'
import { usersApi } from '../api/catalogs'
import { invalidateAll, useQuery } from '../api/useQuery'
import { useAuth } from '../auth/AuthContext'
import Confirm from '../components/Confirm'
import ItemForm from '../components/ItemForm'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { useToast } from '../components/Toast'

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', required: true },
  { name: 'username', label: 'Username', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', required: true, inputMode: 'email' },
  { name: 'password', label: 'Password (min 6 characters)', type: 'password', required: true },
]

const RESET_FIELDS = [
  { name: 'newPassword', label: 'New password (min 6 characters)', type: 'password', required: true },
  { name: 'confirm', label: 'Confirm new password', type: 'password', required: true },
]

const checkReset = (v) =>
  v.newPassword.length < 6 ? 'The password must be at least 6 characters.' : v.newPassword !== v.confirm ? 'The passwords do not match.' : ''

export default function Users() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [dialog, setDialog] = useState(null)

  const { data: users, loading, error, reload } = useQuery('users', usersApi.list, { enabled: isAdmin })
  const load = () => {
    invalidateAll()
    reload()
  }

  if (!isAdmin) return <Navigate to="/" replace />

  const resend = async (u) => {
    try {
      await usersApi.resendVerification(u._id)
      toast.success(`Verification email sent to ${u.email}`)
    } catch (e) {
      toast.error(e.friendly || 'Could not send the email.')
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="head-text">
          <p className="eyebrow">Team</p>
          <h1>Users</h1>
          <p className="muted">Accounts that can sign in to manage the catalog.</p>
        </div>
        <div className="head-actions">
          <button className="btn primary" onClick={() => setDialog({ kind: 'add' })}>
            <FiPlus /> Add user
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !users ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState message="No users yet." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr key={u._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                  <td data-label="Name">
                    <span className="who">
                      <span className="avatar sm">{(u.name || u.username || '?').slice(0, 1).toUpperCase()}</span>
                      {u.name}
                    </span>
                  </td>
                  <td data-label="Username">{u.username}</td>
                  <td data-label="Email" className="break">{u.email}</td>
                  <td data-label="Status">
                    {u.isEmailVerified ? <span className="pill ok"><FiCheckCircle /> Verified</span> : <span className="pill">Not verified</span>}
                  </td>
                  <td className="row-actions">
                    {!u.isEmailVerified && (
                      <button className="icon-btn" title="Resend verification email" aria-label="Resend verification email" onClick={() => resend(u)}>
                        <FiMail />
                      </button>
                    )}
                    <button className="icon-btn" title="Reset password" aria-label={`Reset password for ${u.username}`} onClick={() => setDialog({ kind: 'reset', user: u })}>
                      <FiKey />
                    </button>
                    <button className="icon-btn danger" title="Delete" aria-label={`Delete ${u.username}`} onClick={() => setDialog({ kind: 'delete', user: u })}>
                      <FiTrash2 />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {dialog?.kind === 'add' && (
          <ItemForm
            key="add"
            title="Add user"
            fields={FIELDS}
            submitLabel="Create"
            onClose={() => setDialog(null)}
            onSubmit={async (v) => {
              await usersApi.create(v)
              toast.success('User created. A verification email was sent.')
              setDialog(null)
              load()
            }}
          />
        )}
        {dialog?.kind === 'reset' && (
          <ItemForm
            key="reset"
            title={`Reset password · ${dialog.user.username}`}
            note="Sets a new password right away. Tell the user their new password; they can change it later."
            fields={RESET_FIELDS}
            submitLabel="Reset password"
            validate={checkReset}
            onClose={() => setDialog(null)}
            onSubmit={async (v) => {
              await usersApi.resetPassword(dialog.user._id, v.newPassword)
              toast.success(`Password reset for ${dialog.user.username}`)
              setDialog(null)
            }}
          />
        )}
        {dialog?.kind === 'delete' && (
          <Confirm
            key="delete"
            title="Delete user?"
            message={`${dialog.user.username} will lose access immediately.`}
            onClose={() => setDialog(null)}
            onConfirm={async () => {
              await usersApi.remove(dialog.user._id)
              toast.success('User deleted')
              load()
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
