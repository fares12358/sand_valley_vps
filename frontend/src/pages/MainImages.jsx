import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiUpload } from 'react-icons/fi'
import { MAIN_SECTIONS, SECTIONS, getMainImages, setMainImage } from '../api/catalogs'
import { invalidateAll, useQuery } from '../api/useQuery'
import SafeImg from '../components/SafeImg'
import { ErrorState, Spinner } from '../components/States'
import { useToast } from '../components/Toast'

const sectionByDataKey = Object.fromEntries(SECTIONS.map((s) => [s.dataKey, s]))

// A small replica of the app's home screen: round picture + green label, alternating sides.
function PhonePreview({ images }) {
  return (
    <div className="phone" aria-label="Preview of the app home screen">
      <div className="phone-screen">
        {MAIN_SECTIONS.map(({ key }, i) => {
          const url = images[key]?.img?.url
          const s = sectionByDataKey[key]
          return (
            <div key={key} className={`phone-row${i % 2 ? ' flip' : ''}`}>
              <span className="phone-pic"><SafeImg src={url} /></span>
              <span className="phone-label" lang="ar" dir="rtl">{s.appLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MainImages() {
  const toast = useToast()
  const { data: images, loading, error, reload } = useQuery('main-images', getMainImages)
  const [busyKey, setBusyKey] = useState('')

  const change = async (section, file) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return toast.error('That image is larger than 10 MB.')
    setBusyKey(section)
    try {
      await setMainImage(section, Boolean(images?.[section]?.img?.url), file)
      toast.success('Image updated')
      invalidateAll()
      reload()
    } catch (e) {
      toast.error(e.friendly || 'Upload failed.')
    } finally {
      setBusyKey('')
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="head-text">
          <p className="eyebrow">App</p>
          <h1>Home images</h1>
          <p className="muted">The picture behind each section button on the app home screen.</p>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !images ? (
        <Spinner />
      ) : (
        <div className="home-images">
          <div className="grid wide-cards">
            {MAIN_SECTIONS.map(({ key, label }, i) => {
              const url = images[key]?.img?.url
              const s = sectionByDataKey[key]
              return (
                <motion.article
                  key={key}
                  className="card"
                  style={{ '--accent': s.accent }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="thumb tall"><SafeImg src={url} alt={label} /></div>
                  <div className="card-body row">
                    <h3>{label}</h3>
                    <label className={`btn ghost${busyKey === key ? ' disabled' : ''}`}>
                      <FiUpload /> {busyKey === key ? 'Uploading…' : url ? 'Replace' : 'Upload'}
                      <input type="file" accept="image/*" hidden disabled={Boolean(busyKey)} onChange={(e) => { change(key, e.target.files?.[0]); e.target.value = '' }} />
                    </label>
                  </div>
                </motion.article>
              )
            })}
          </div>

          <aside className="phone-wrap">
            <p className="eyebrow">Preview</p>
            <PhonePreview images={images} />
            <p className="muted small">How the home screen looks to farmers.</p>
          </aside>
        </div>
      )}
    </>
  )
}
