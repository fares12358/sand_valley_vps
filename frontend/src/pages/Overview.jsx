import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowUpRight } from 'react-icons/fi'
import { SECTIONS, getOverview } from '../api/catalogs'
import { useQuery } from '../api/useQuery'
import { useAuth } from '../auth/AuthContext'
import SafeImg from '../components/SafeImg'
import { ErrorState, Spinner } from '../components/States'

const list = (v) => (Array.isArray(v) ? v : [])
const sum = (arr, pick) => list(arr).reduce((n, x) => n + list(pick(x)).length, 0)
const plural = (n, one, many = `${one}s`) => `${n === 1 ? one : many}`

// Counts + a few real pictures per section, so the board shows what is actually in the app.
function summarize(d) {
  return SECTIONS.map((s) => {
    const rows = list(d[s.dataKey]?.data)
    if (s.key === 'communication') {
      const engineers = rows.flatMap((p) => list(p.eng))
      return {
        ...s,
        main: rows.length, mainLabel: plural(rows.length, 'place'),
        sub: engineers.length, subLabel: plural(engineers.length, 'engineer'),
        pics: engineers.map((e) => e.img?.url).filter(Boolean),
      }
    }
    const subLabel = s.key === 'insecticide' ? 'product' : 'type'
    const sub = sum(rows, (c) => c.Type)
    return {
      ...s,
      main: rows.length, mainLabel: plural(rows.length, 'category', 'categories'),
      sub, subLabel: plural(sub, subLabel),
      pics: rows.map((c) => c.img?.url).filter(Boolean),
    }
  })
}

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Overview() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useQuery('overview', getOverview)
  const tiles = useMemo(() => (data ? summarize(data) : null), [data])
  const first = (user?.name || user?.username || '').split(' ')[0]

  return (
    <>
      <div className="page-head">
        <div className="head-text">
          <p className="eyebrow">Overview</p>
          <h1>{greeting()}{first ? `, ${first}` : ''}</h1>
          <p className="muted">Here is what the Sand Valley app shows farmers right now.</p>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !tiles ? (
        <Spinner />
      ) : (
        <div className="tile-grid">
          {tiles.map((t, i) => (
            <motion.div key={t.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
              <Link to={t.to} className="tile" style={{ '--accent': t.accent }}>
                <div className="tile-top">
                  <span className="tile-icon"><t.icon /></span>
                  <h3>{t.label}</h3>
                  <FiArrowUpRight className="tile-go" />
                </div>

                <div className="tile-figures">
                  <div>
                    <b>{t.main}</b>
                    <span>{t.mainLabel}</span>
                  </div>
                  <div>
                    <b>{t.sub}</b>
                    <span>{t.subLabel}</span>
                  </div>
                </div>

                <div className="tile-pics" aria-hidden="true">
                  {t.pics.slice(0, 5).map((src, k) => (
                    <SafeImg key={k} src={src} loading="lazy" fallback={<i className="pic-ph" />} />
                  ))}
                  {t.pics.length > 5 && <span>+{t.pics.length - 5}</span>}
                  {t.pics.length === 0 && <em>Nothing added yet</em>}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}
