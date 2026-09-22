import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { muhuratCategories as fallbackCategories } from '../data/muhurat'
import { setPageMeta } from '../lib/demo'

export default function Muhurat() {
  const [categories, setCategories] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setPageMeta(
      'Subh Muhurat — Auspicious Dates & Times | GrahVarta',
      'Find auspicious Subh Muhurat dates and times for Marriage, Griha Pravesh, Mundan, Naamkaran and more.'
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/muhurat')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data) => {
        if (!cancelled) setCategories(data.categories)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const list = categories || (error ? fallbackCategories : [])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Auspicious Timing"
        title="Subh Muhurat"
        subtitle="Browse upcoming auspicious dates and times for important life events."
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((cat) => (
            <Link
              key={cat.slug}
              to={`/muhurat/${cat.slug}`}
              className="card flex flex-col gap-3 hover:border-orange/50 transition-colors"
            >
              <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
                <CalendarDays size={20} />
              </span>
              <h2 className="font-semibold">{cat.title}</h2>
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{cat.description}</p>
              <span className="text-xs text-orange font-semibold mt-auto">
                {cat.dates.length} upcoming dates &rarr;
              </span>
            </Link>
          ))}
        </div>
      )}
      {error && (
        <p className="text-xs text-text-muted mt-6">
          Showing offline dates — live data is temporarily unavailable.
        </p>
      )}
    </div>
  )
}
