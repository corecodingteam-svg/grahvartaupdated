import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { Mic, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAstrologerById } from '../data/astrologers'
import { setPageMeta } from '../lib/demo'

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Call() {
  const { id } = useParams()
  const astrologer = getAstrologerById(id)
  const navigate = useNavigate()

  const [status, setStatus] = useState('Connecting...')
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speakerOn, setSpeakerOn] = useState(true)

  useEffect(() => {
    if (astrologer) {
      setPageMeta(`Call with ${astrologer.name} | GrahVarta`, `Demo call consultation with ${astrologer.name}.`)
    }
  }, [astrologer])

  useEffect(() => {
    const t1 = setTimeout(() => setStatus('Ringing...'), 1200)
    const t2 = setTimeout(() => setStatus('Connected'), 2800)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    if (status !== 'Connected') return
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [status])

  if (!astrologer) {
    return <Navigate to="/astrologers" replace />
  }

  function endCall() {
    toast('Demo call ended', { icon: '✨' })
    navigate(`/astrologer/profile/${id}`)
  }

  return (
    <div className="container-page py-8 sm:py-12 flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center gap-6">
      <div className="relative">
        <img
          src={astrologer.photo}
          alt={astrologer.name}
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-orange/40"
        />
        {status === 'Connected' && (
          <span className="absolute inset-0 rounded-full border-2 border-orange animate-pulse" aria-hidden="true" />
        )}
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{astrologer.name}</h1>
        <p className="text-sm text-text-secondary mt-1">₹{astrologer.pricePerMin}/min</p>
      </div>

      <div className="h-8 flex items-center justify-center">
        {status === 'Connected' ? (
          <span className="text-2xl font-mono text-gold" aria-label="Call duration">
            {formatTime(seconds)}
          </span>
        ) : (
          <span className="text-sm text-text-secondary animate-pulse" aria-live="polite">
            {status}
          </span>
        )}
      </div>

      <div className="flex items-center gap-5 mt-4">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
          aria-pressed={muted}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
            muted ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary'
          }`}
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          type="button"
          onClick={endCall}
          aria-label="End call"
          className="w-16 h-16 rounded-full flex items-center justify-center bg-error text-white hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-error"
        >
          <PhoneOff size={24} />
        </button>

        <button
          type="button"
          onClick={() => setSpeakerOn((s) => !s)}
          aria-label={speakerOn ? 'Turn speaker off' : 'Turn speaker on'}
          aria-pressed={speakerOn}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange ${
            speakerOn ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary'
          }`}
        >
          {speakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

      <p className="text-[11px] text-text-muted mt-2">This is a demo call — no real audio is connected.</p>
    </div>
  )
}
