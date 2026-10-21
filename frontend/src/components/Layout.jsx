import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiGrid, FiImage, FiLogOut, FiMenu, FiUsers, FiX } from 'react-icons/fi'
import { SECTIONS } from '../api/catalogs'
import { useAuth } from '../auth/AuthContext'
import Confirm from './Confirm'

// Navigation groups mirror how the work is organised: the catalog itself, what the app home shows, the team.
const GROUPS = [
  { items: [{ to: '/', label: 'Overview', icon: FiGrid, end: true }] },
  { title: 'Catalog', items: SECTIONS.map((s) => ({ to: s.to, label: s.label, icon: s.icon, accent: s.accent })) },
  { title: 'App', items: [{ to: '/main-images', label: 'Home images', icon: FiImage }] },
  { title: 'Team', adminOnly: true, items: [{ to: '/users', label: 'Users', icon: FiUsers }] },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const location = useLocation()
  // detail pages share a section; only the first path segment drives the transition
  const section = location.pathname.split('/')[1] || 'home'

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <FiMenu />
        </button>
        <img className="brand-logo top" src="/logo.png" alt="" />
        <strong>Sand Valley</strong>
      </header>

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="Sand Valley" />
          <div>
            <strong>Sand Valley</strong>
            <small>Dashboard</small>
          </div>
          <button className="icon-btn close-menu" onClick={() => setOpen(false)} aria-label="Close menu">
            <FiX />
          </button>
        </div>

        <nav onClick={() => setOpen(false)} aria-label="Main">
          {GROUPS.filter((g) => !g.adminOnly || isAdmin).map((g, gi) => (
            <div className="nav-group" key={gi}>
              {g.title && <p className="nav-title">{g.title}</p>}
              {g.items.map(({ to, label, icon: Icon, end, accent }) => (
                <NavLink key={to} to={to} end={end} className="nav-item" style={accent ? { '--accent': accent } : undefined}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                      <Icon className={`nav-icon${accent ? ' chip' : ''}`} />
                      <span className="nav-label">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="me">
          <div className="avatar">{(user?.name || user?.username || '?').slice(0, 1).toUpperCase()}</div>
          <div className="me-info">
            <strong>{user?.name || user?.username}</strong>
            <small>{isAdmin ? 'Master admin' : 'Admin'}</small>
          </div>
          <button className="icon-btn" onClick={() => setConfirmLogout(true)} aria-label="Log out" title="Log out">
            <FiLogOut />
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="content">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {confirmLogout && (
          <Confirm
            title="Log out?"
            message="You will need to sign in again to manage the catalog."
            confirmLabel="Log out"
            tone="primary"
            onClose={() => setConfirmLogout(false)}
            onConfirm={async () => logout()}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
