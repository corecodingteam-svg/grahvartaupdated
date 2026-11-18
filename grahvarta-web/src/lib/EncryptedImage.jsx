import { useEffect, useState } from 'react'
import { loadImage } from './chatCrypto'

/** Photo from an end-to-end encrypted chat: downloaded as ciphertext and decrypted in the browser. */
export default function EncryptedImage({ payload, className = '' }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    loadImage(payload).then((u) => live && setSrc(u)).catch(() => live && setFailed(true))
    return () => { live = false }
  }, [payload])
  if (failed) return <span className="text-xs opacity-70">📷 Photo unavailable</span>
  if (!src) return <span className="block w-48 h-36 rounded-xl bg-black/10 animate-pulse" />
  return (
    <a href={src} target="_blank" rel="noreferrer">
      <img src={src} alt="Shared in chat" className={`max-w-[240px] max-h-[240px] rounded-xl object-cover ${className}`} />
    </a>
  )
}
