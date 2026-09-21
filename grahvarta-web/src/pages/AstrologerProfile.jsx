import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Phone, X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import Badge from '../components/ui/Badge'
import StarRating from '../components/ui/StarRating'
import Card from '../components/ui/Card'
import { getAstrologerById } from '../data/astrologers'
import { setPageMeta } from '../lib/demo'

export default function AstrologerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const astrologer = getAstrologerById(id)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    if (astrologer) {
      setPageMeta({
        title: `${astrologer.name} — Astrologer Profile | GrahVarta`,
        description: astrologer.about,
        image: astrologer.photo,
      })
    }
  }, [astrologer])

  const gallery = astrologer?.gallery

  useEffect(() => {
    if (lightboxIndex === null || !gallery) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') setLightboxIndex(null)
      else if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % gallery.length)
      else if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + gallery.length) % gallery.length)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, gallery])

  if (!astrologer) {
    return <Navigate to="/astrologers" replace />
  }

  const {
    name, photo, badge, expertise, languages, experienceYears, rating,
    reviewCount, pricePerMin, online, about, reviews,
  } = astrologer

  function showNext() {
    setLightboxIndex((i) => (i + 1) % gallery.length)
  }
  function showPrev() {
    setLightboxIndex((i) => (i - 1 + gallery.length) % gallery.length)
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/astrologers" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6">
        <ArrowLeft size={16} /> All astrologers
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: main info */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <Card className="flex flex-col sm:flex-row gap-5">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <img
                src={photo}
                alt={name}
                className="w-32 h-32 rounded-2xl object-cover border border-border"
              />
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${
                  online ? 'bg-success' : 'bg-text-muted'
                }`}
                aria-label={online ? 'Online' : 'Offline'}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-bold">{name}</h1>
                <Badge tone="gold" className="w-fit mx-auto sm:mx-0">
                  <CheckCircle2 size={12} /> {badge}
                </Badge>
              </div>
              <StarRating rating={rating} reviewCount={reviewCount} className="justify-center sm:justify-start mt-2" />
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-3">
                {expertise.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-text-secondary mt-3">
                <span>{languages.join(', ')}</span>
                <span>{experienceYears} yrs experience</span>
                <span className="text-orange font-semibold">₹{pricePerMin}/min</span>
              </div>
            </div>
          </Card>

          <section>
            <h2 className="text-lg font-semibold mb-2">About</h2>
            <p className="text-sm text-text-secondary leading-relaxed">{about}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Areas of Expertise</h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {expertise.map((tag) => (
                <li key={tag} className="card !p-3 text-sm text-center">{tag}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {gallery.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="rounded-xl overflow-hidden border border-border aspect-square"
                  aria-label={`View gallery image ${i + 1} of ${name}`}
                >
                  <img src={src} alt={`${name} gallery ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Reviews</h2>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-gold">{rating.toFixed(1)}</span>
              <div>
                <StarRating rating={rating} showValue={false} />
                <p className="text-xs text-text-muted mt-0.5">{reviewCount.toLocaleString()} reviews</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <Card key={r.id} className="!p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold">{r.user}</p>
                    <span className="text-xs text-text-muted">{r.date}</span>
                  </div>
                  <StarRating rating={r.rating} showValue={false} className="mb-1.5" />
                  <p className="text-sm text-text-secondary leading-relaxed">{r.text}</p>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Right: sticky consult card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Consultation fee</span>
              <span className="text-lg font-bold text-orange">₹{pricePerMin}/min</span>
            </div>
            <button type="button" onClick={() => navigate(`/chat/${id}`)} className="btn-primary w-full">
              <MessageCircle size={18} /> Chat Now
            </button>
            <button type="button" onClick={() => navigate(`/call/${id}`)} className="btn-outline w-full">
              <Phone size={18} /> Call Now
            </button>
            <p className="text-xs text-text-muted text-center">
              This is a demo site — chat and call are not functional.
            </p>
          </Card>
        </div>
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image viewer"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-primary"
            aria-label="Close gallery"
          >
            <X size={20} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); showPrev() }}
            className="absolute left-4 w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-primary"
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>
          <img
            src={gallery[lightboxIndex]}
            alt={`${name} gallery large view ${lightboxIndex + 1}`}
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); showNext() }}
            className="absolute right-4 w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-text-primary"
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
