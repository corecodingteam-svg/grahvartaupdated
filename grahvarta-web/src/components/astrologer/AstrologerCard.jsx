import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Phone } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import StarRating from '../ui/StarRating'

export default function AstrologerCard({ astrologer }) {
  const navigate = useNavigate()
  const { id, name, photo, badge, expertise, languages, experienceYears, rating, reviewCount, pricePerMin, online } =
    astrologer

  return (
    <Card className="flex flex-col gap-3 hover:border-orange/50 transition-colors">
      <Link to={`/astrologer/profile/${id}`} className="flex gap-3 items-start">
        <div className="relative shrink-0">
          <img
            src={photo}
            alt={name}
            className="w-16 h-16 rounded-xl object-cover border border-border"
            loading="lazy"
          />
          <span
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-card ${
              online ? 'bg-success' : 'bg-text-muted'
            }`}
            aria-label={online ? 'Online' : 'Offline'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary truncate">{name}</h3>
          </div>
          <Badge tone="gold" className="mt-1">{badge}</Badge>
          <StarRating rating={rating} reviewCount={reviewCount} className="mt-1.5" />
        </div>
      </Link>

      <div className="flex flex-wrap gap-1.5">
        {expertise.slice(0, 3).map((tag) => (
          <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-text-secondary">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{languages.join(', ')}</span>
        <span>{experienceYears} yrs exp</span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-divider">
        <span className="text-sm font-semibold text-orange">₹{pricePerMin}/min</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/chat/${id}`)}
            className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-orange transition-colors"
            aria-label={`Chat with ${name} (demo)`}
          >
            <MessageCircle size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/call/${id}`)}
            className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-orange transition-colors"
            aria-label={`Call ${name} (demo)`}
          >
            <Phone size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}
