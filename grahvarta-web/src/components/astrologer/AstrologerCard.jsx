import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Phone } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import StarRating from '../ui/StarRating'
import Avatar from '../ui/Avatar'
import { useRequireAuth } from '../../context/RequireAuthContext'

export default function AstrologerCard({ astrologer }) {
  const navigate = useNavigate()
  const requireAuth = useRequireAuth()
  const { id, name, photo, badge, expertise, languages, experienceYears, rating, reviewCount, pricePerMin, online } =
    astrologer

  function startChat() {
    requireAuth(() => navigate(`/chat/${id}`), `Log in to chat with ${name}.`)
  }

  function startCall() {
    requireAuth(() => navigate(`/call/${id}`), `Log in to call ${name}.`)
  }

  return (
    <Card className="flex flex-col gap-3 hover:border-orange/50 transition-colors">
      <Link to={`/astrologer/profile/${id}`} className="flex gap-3 items-start">
        <Avatar src={photo} name={name} size={64} online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary truncate">{name}</h3>
          </div>
          {badge && <Badge tone="gold" className="mt-1">{badge}</Badge>}
          <StarRating rating={rating} reviewCount={reviewCount} className="mt-1.5" />
        </div>
      </Link>

      {expertise.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {expertise.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-text-secondary">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{languages.join(', ') || '—'}</span>
        <span>{experienceYears} yrs exp</span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-divider">
        <span className="text-sm font-semibold text-orange">
          {pricePerMin > 0 ? `₹${pricePerMin}/min` : '—'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startChat}
            className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-orange transition-colors"
            aria-label={`Chat with ${name}`}
          >
            <MessageCircle size={16} />
          </button>
          <button
            type="button"
            onClick={startCall}
            className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-orange transition-colors"
            aria-label={`Call ${name}`}
          >
            <Phone size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}
