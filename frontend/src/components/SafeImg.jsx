import { useState } from 'react'
import { FiImage } from 'react-icons/fi'

// <img> that shows a fallback instead of a broken-image box when the file is missing or fails to load.
export default function SafeImg({ src, alt = '', fallback = <FiImage />, ...rest }) {
  const [failedSrc, setFailedSrc] = useState(null)
  if (!src || failedSrc === src) return fallback
  return <img src={src} alt={alt} onError={() => setFailedSrc(src)} {...rest} />
}
