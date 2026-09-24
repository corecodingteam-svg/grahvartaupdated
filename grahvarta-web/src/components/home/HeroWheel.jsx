import { Link } from 'react-router-dom'
import { Sparkles, Sun, ArrowRight } from 'lucide-react'
import { zodiacSigns } from '../../data/services'
import Avatar from '../ui/Avatar'

// Decorative rotating zodiac wheel with two floating cards. The astrologer card
// uses real data when one is online; otherwise it falls back to a static card.
const R = 158
const CENTER = 200

export default function HeroWheel({ astrologer }) {
  return (
    <div className="relative mx-auto w-full max-w-[460px] aspect-square">
      <div className="absolute inset-6 rounded-full bg-orange/25 blur-3xl animate-glow" aria-hidden="true" />

      <svg viewBox="0 0 400 400" className="relative w-full h-full" role="img" aria-label="Zodiac wheel">
        <defs>
          <radialGradient id="hw-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F08C3E" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E8762A" stopOpacity="0.15" />
          </radialGradient>
        </defs>

        <g className="animate-spin-slow" style={{ transformOrigin: '200px 200px' }}>
          <circle cx={CENTER} cy={CENTER} r="188" fill="none" stroke="#E8762A" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="2 8" />
          <circle cx={CENTER} cy={CENTER} r="128" fill="none" stroke="#D4A843" strokeOpacity="0.5" strokeWidth="1.5" />
          {zodiacSigns.map((sign, i) => {
            const angle = (i / zodiacSigns.length) * Math.PI * 2 - Math.PI / 2
            const x = CENTER + R * Math.cos(angle)
            const y = CENTER + R * Math.sin(angle)
            return (
              <g key={sign.id}>
                <circle cx={x} cy={y} r="19" fill="rgb(var(--color-card))" stroke="#E8762A" strokeOpacity="0.4" />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="19"
                  fill="#D4A843"
                  className="animate-spin-slow-reverse"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                  {sign.symbol}
                </text>
              </g>
            )
          })}
        </g>

        <g className="animate-spin-mid-reverse" style={{ transformOrigin: '200px 200px' }}>
          <circle cx={CENTER} cy={CENTER} r="88" fill="none" stroke="#E8762A" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 6" />
          <circle cx={CENTER + 88} cy={CENTER} r="7" fill="#E8762A" />
          <circle cx={CENTER - 62} cy={CENTER + 62} r="5" fill="#D4A843" />
          <circle cx={CENTER - 30} cy={CENTER - 83} r="4" fill="#B85C1A" />
        </g>

        <circle cx={CENTER} cy={CENTER} r="52" fill="url(#hw-core)" />
        <circle cx={CENTER} cy={CENTER} r="52" fill="none" stroke="#E8762A" strokeOpacity="0.6" strokeWidth="2" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Sparkles size={44} className="text-white drop-shadow" />
      </div>

      <Link
        to="/horoscope"
        className="card absolute -left-2 sm:-left-8 top-6 !p-3.5 flex items-center gap-3 animate-float shadow-lg"
      >
        <span className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center">
          <Sun size={18} />
        </span>
        <span className="text-left">
          <span className="block text-sm font-semibold leading-tight">Today&apos;s Horoscope</span>
          <span className="block text-xs text-text-muted">Tap your sign</span>
        </span>
      </Link>

      {astrologer ? (
        <Link
          to={`/astrologer/profile/${astrologer.id}`}
          className="card absolute -right-2 sm:-right-8 bottom-8 !p-3.5 flex items-center gap-3 animate-float-delayed shadow-lg"
        >
          <Avatar src={astrologer.photo} name={astrologer.name} size={40} online />
          <span className="text-left min-w-0">
            <span className="block text-sm font-semibold leading-tight truncate max-w-[9rem]">{astrologer.name}</span>
            <span className="block text-xs text-text-muted">
              Online &middot; {astrologer.pricePerMin > 0 ? `₹${astrologer.pricePerMin}/min` : 'Available'}
            </span>
          </span>
          <ArrowRight size={16} className="text-orange shrink-0" />
        </Link>
      ) : (
        <Link
          to="/astrologers"
          className="card absolute -right-2 sm:-right-8 bottom-8 !p-3.5 flex items-center gap-3 animate-float-delayed shadow-lg"
        >
          <span className="w-9 h-9 rounded-xl bg-orange/15 text-orange flex items-center justify-center">
            <Sparkles size={18} />
          </span>
          <span className="text-left">
            <span className="block text-sm font-semibold leading-tight">Chat &middot; Call &middot; Video</span>
            <span className="block text-xs text-text-muted">Find your astrologer</span>
          </span>
        </Link>
      )}
    </div>
  )
}
