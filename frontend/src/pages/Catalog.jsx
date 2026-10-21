import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowRight, FiChevronRight, FiEdit2, FiFileText, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi'
import { catalogs } from '../api/catalogs'
import { invalidateAll, useQuery } from '../api/useQuery'
import Confirm from '../components/Confirm'
import ItemForm from '../components/ItemForm'
import SafeImg from '../components/SafeImg'
import { EmptyState, ErrorState, Spinner } from '../components/States'
import { useToast } from '../components/Toast'

const plural = (noun, n = 2) => (n === 1 ? noun : noun.endsWith('y') ? `${noun.slice(0, -1)}ies` : `${noun}s`)

// One page drives every catalog: the URL is /<catalog>/<parentId>/<parentId>...,
// and the number of ids tells which level of the hierarchy is shown.
export default function Catalog() {
  const { catalog: key, '*': rest } = useParams()
  const cfg = catalogs[key]
  const ids = useMemo(() => (rest || '').split('/').filter(Boolean), [rest])
  const levelIndex = ids.length
  const level = cfg?.levels[levelIndex]
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState(null) // { kind: 'add' | 'edit' | 'delete' | 'detail', item? }

  // parent names travel in router state so the breadcrumb can show them without extra requests
  const names = useMemo(() => location.state?.names || [], [location.state])

  // cached per path: reopening a tab shows the last data at once and refreshes quietly
  const { data, loading, refreshing, error, reload } = useQuery(
    level ? `${key}/${ids.join('/')}` : null,
    () => level.list(ids),
  )
  const items = data ?? null
  const refresh = () => {
    invalidateAll()
    reload()
  }
  const pathKey = `${key}/${rest || ''}`
  useEffect(() => setQuery(''), [pathKey])

  if (!cfg || !level) return <Navigate to="/" replace />

  const base = `/${key}`
  const canOpen = (item) => !level.leaf && levelIndex < cfg.levels.length - 1 && (!level.hasChildren || level.hasChildren(item))
  const open = (item) => navigate(`${base}/${[...ids, item._id].join('/')}`, { state: { names: [...names.slice(0, levelIndex), item.name] } })

  const filtered = (items || []).filter((i) => (i.name || '').toLowerCase().includes(query.trim().toLowerCase()))

  const fieldsFor = (item) => {
    const only = item && level.editFields?.(item)
    return only ? level.fields.filter((f) => only.includes(f.name)) : level.fields
  }

  const done = (msg) => {
    toast.success(msg)
    setDialog(null)
    refresh()
  }

  const crumbs = [{ label: cfg.title, to: base }]
  ids.forEach((id, i) => crumbs.push({ label: names[i] || cfg.levels[i].noun, to: `${base}/${ids.slice(0, i + 1).join('/')}`, state: { names: names.slice(0, i + 1) } }))

  const Icon = cfg.icon

  return (
    <div className="catalog" style={{ '--accent': cfg.accent }}>
      {ids.length > 0 && (
      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.to}>
            {i > 0 && <FiChevronRight />}
            {i === crumbs.length - 1 ? <strong>{c.label}</strong> : <Link to={c.to} state={c.state}>{c.label}</Link>}
          </span>
        ))}
      </nav>
      )}

      <div className="page-head">
        <div className="head-title">
          <span className="head-icon"><Icon /></span>
          <div className="head-text">
            <p className="eyebrow">{levelIndex === 0 ? 'Catalog' : cfg.title}</p>
            <h1 className="cap">{levelIndex === 0 ? cfg.title : plural(level.noun)}</h1>
            <p className="muted">{items ? `${items.length} ${plural(level.noun, items.length)}${refreshing ? ' · updating…' : ''}` : ' '}</p>
          </div>
        </div>
        <div className="head-actions">
          <div className="search">
            <FiSearch />
            <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
          </div>
          <button className="btn primary" onClick={() => setDialog({ kind: 'add' })}>
            <FiPlus /> Add {level.noun}
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !items ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={query ? 'Nothing matches your search.' : `No ${plural(level.noun)} here yet.`}
          hint={query ? 'Try a different spelling, or clear the search.' : `Add one and it appears in the app.`}
        >
          {!query && (
            <button className="btn primary" onClick={() => setDialog({ kind: 'add' })}>
              <FiPlus /> Add {level.noun}
            </button>
          )}
        </EmptyState>
      ) : (
        <div className="grid">
          <AnimatePresence initial>
            {filtered.map((item, i) => (
              <motion.article
                key={item._id}
                layout
                className={`card${canOpen(item) ? ' clickable' : ''}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                              >
                <div className="thumb" onClick={canOpen(item) ? () => open(item) : undefined}>
                  <SafeImg src={item.img?.url} loading="lazy" />
                </div>
                <div className="card-body" onClick={canOpen(item) ? () => open(item) : undefined}>
                  <h3 title={item.name}>{item.name}</h3>
                  {level.subtitle?.(item) ? <p className="muted clamp">{level.subtitle(item)}</p> : null}
                </div>
                {canOpen(item) && <FiArrowRight className="card-go" aria-hidden="true" />}
                <div className="card-actions">
                  {level.detail && (
                    <button className="icon-btn" title={level.detail.label} aria-label={level.detail.label} onClick={() => setDialog({ kind: 'detail', item })}>
                      <FiFileText />
                    </button>
                  )}
                  <button className="icon-btn" title="Edit" aria-label={`Edit ${item.name}`} onClick={() => setDialog({ kind: 'edit', item })}>
                    <FiEdit2 />
                  </button>
                  <button className="icon-btn danger" title="Delete" aria-label={`Delete ${item.name}`} onClick={() => setDialog({ kind: 'delete', item })}>
                    <FiTrash2 />
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {dialog?.kind === 'add' && (
          <ItemForm
            key="add"
            title={`Add ${level.noun}`}
            fields={level.fields}
            submitLabel="Add"
            onClose={() => setDialog(null)}
            onSubmit={async (v) => {
              await level.add(ids, v)
              done(`${level.noun} added`)
            }}
          />
        )}
        {dialog?.kind === 'edit' && (
          <ItemForm
            key="edit"
            title={`Edit ${level.noun}`}
            fields={fieldsFor(dialog.item)}
            initial={dialog.item}
            editing
            onClose={() => setDialog(null)}
            onSubmit={async (v) => {
              await level.update(ids, dialog.item, v)
              done(`${level.noun} updated`)
            }}
          />
        )}
        {dialog?.kind === 'detail' && (
          <ItemForm
            key="detail"
            title={`${level.detail.label} · ${dialog.item.name}`}
            fields={level.detail.fields}
            initial={level.detail.values(dialog.item)}
            editing
            onClose={() => setDialog(null)}
            onSubmit={async (v) => {
              await level.detail.save(dialog.item, v)
              done(`${level.detail.label.toLowerCase()} saved`)
            }}
          />
        )}
        {dialog?.kind === 'delete' && (
          <Confirm
            key="delete"
            title={`Delete ${level.noun}?`}
            message={`“${dialog.item.name}” and everything inside it will be permanently removed, including its images.`}
            onClose={() => setDialog(null)}
            onConfirm={async () => {
              await level.remove(ids, dialog.item)
              toast.success(`${level.noun} deleted`)
              refresh()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
