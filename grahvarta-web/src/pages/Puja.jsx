import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Clock } from 'lucide-react'
import Card from '../components/ui/Card'
import SectionHeading from '../components/ui/SectionHeading'
import { pujaServices } from '../data/puja'
import { setPageMeta } from '../lib/demo'

export default function Puja() {
  const [query, setQuery] = useState('')

  useEffect(() => {
    setPageMeta(
      'Book a Puja | GrahVarta',
      'Book traditional Vedic pujas and rituals online — Graha Shanti, Navgraha, Ganesh Puja and more.'
    )
  }, [])

  const filtered = useMemo(() => {
    if (!query) return pujaServices
    return pujaServices.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  }, [query])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Rituals"
        title="Book a Puja"
        subtitle="Traditional Vedic pujas performed by experienced pandits — booked online, from wherever you are."
      />

      <div className="relative max-w-md mb-8">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pujas, e.g. Ganesh Puja"
          className="input-field pl-9"
          aria-label="Search pujas"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">No pujas match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((puja) => (
            <Card key={puja.slug} className="flex flex-col gap-3 overflow-hidden hover:border-orange/50 transition-colors">
              <img
                src={puja.image}
                alt={puja.name}
                className="w-full h-44 object-cover rounded-xl -mt-5 -mx-5 mb-1"
                style={{ width: 'calc(100% + 2.5rem)' }}
                loading="lazy"
              />
              <h3 className="font-semibold text-lg line-clamp-2">{puja.name}</h3>
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{puja.shortDescription}</p>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Clock size={13} /> {puja.duration}
              </div>
              <div className="flex items-center justify-between pt-2 mt-auto border-t border-divider">
                <span className="text-lg font-bold text-orange">₹{puja.price.toLocaleString('en-IN')}</span>
                <Link to={`/puja/${puja.slug}`} className="btn-outline !py-2 !px-4 text-sm">
                  View Details
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
