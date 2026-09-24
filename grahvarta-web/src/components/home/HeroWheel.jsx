import { Link } from 'react-router-dom'
import { Sparkles, Sun, ArrowRight } from 'lucide-react'
import { zodiacSigns } from '../../data/services'
import Avatar from '../ui/Avatar'

// Decorative rotating zodiac wheel plus two floating cards. Built from plain
// positioned elements (not SVG text) so each sign can counter-rotate and stay
// upright. The astrologer card uses real data when someone is online.
const SIGN_RADIUS = 46 // % of the wheel box

function place(angleRad, radiusPct) {
  return {
    left: `${50 + radiusPct * Math.cos(angleRad)}%`,
    top: `${50 + radiusPct * Math.sin(angleRad)}%`,
  }
}

export default function HeroWheel({ astrologer }) {
  return (
    <div className="relative mx-auto w-full max-w-[500px] aspect-square">
      <div className="absolute inset-[10%] rounded-full bg-orange/25 blur-3xl animate-glow" aria-hidden="true" />

      {/* Wheel */}
      <div className="absolute inset-[8%]" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-dashed border-orange/40" />

        {/* Sign ring */}
        <div className="absolute inset-0 animate-spin-slow">
          {zodiacSigns.map((sign, i) => {
            const angle = (i / zodiacSigns.length) * Math.PI * 2 - Math.PI / 2
            return (
              <div key={sign.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={place(angle, SIGN_RADIUS)}>
                <span className="animate-spin-slow-reverse flex w-10 h-10 items-center justify-center rounded-full bg-card border border-orange/30 shadow-sm text-xl text-gold">
                  {sign.symbol}&#xFE0E;
                </span>
              </div>
            )
          })}
        </div>

        <div className="absolute inset-[17%] rounded-full border border-gold/50" />

        {/* Inner orbit with planets */}
        <div className="absolute inset-[27%] rounded-full border border-dashed border-orange/30 animate-spin-mid-reverse">
          <span className="absolute w-3.5 h-3.5 rounded-full bg-orange" style={{ ...place(0, 50), transform: 'translate(-50%, -50%)' }} />
          <span className="absolute w-2.5 h-2.5 rounded-full bg-gold" style={{ ...place(2.4, 50), transform: 'translate(-50%, -50%)' }} />
          <span className="absolute w-2 h-2 rounded-full bg-orange-dark" style={{ ...place(4.4, 50), transform: 'translate(-50%, -50%)' }} />
        </div>

        {/* Core */}
        <div className="absolute inset-[37%] rounded-full bg-gradient-to-br from-orange-light to-orange shadow-lg shadow-orange/40 flex items-center justify-center">
          <Sparkles size={40} className="text-white" />
        </div>
      </div>

      <Link
        to="/horoscope"
        className="card !absolute left-0 top-2 !p-3 flex items-center gap-3 animate-float shadow-lg"
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
          className="card !absolute right-0 bottom-2 !p-3 flex items-center gap-3 animate-float-delayed shadow-lg"
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
          className="card !absolute right-0 bottom-2 !p-3 flex items-center gap-3 animate-float-delayed shadow-lg"
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
