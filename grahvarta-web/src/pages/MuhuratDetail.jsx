import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { getMuhuratBySlug } from '../data/muhurat'
import { setPageMeta } from '../lib/demo'

export default function MuhuratDetail() {
  const { slug } = useParams()
  const fallback = getMuhuratBySlug(slug)
  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (fallback) {
      setPageMeta(`${fallback.title} Muhurat Dates | GrahVarta`, fallback.description)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    let cancelled = false
    fetch('/api/muhurat')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data) => {
        if (!cancelled) {
          const found = (data.categories || []).find((c) => c.slug === slug)
          if (found) setCategory(found)
        }
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
  }, [slug])

  if (!fallback) {
    return <Navigate to="/muhurat" replace />
  }

  const display = category || (error ? fallback : null)

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/muhurat" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6">
        <ArrowLeft size={16} /> All categories
      </Link>

      <SectionHeading level="h1" eyebrow="Subh Muhurat" title={fallback.title} subtitle={fallback.description} />

      {loading && !display ? (
        <div className="flex flex-col gap-3 max-w-2xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl">
          {display?.dates.map((d, i) => (
            <Card key={i} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{d.date}</p>
                <p className="text-xs text-text-muted">{d.day}</p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-gold font-medium">
                <Clock size={16} /> {d.time}
              </div>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-text-muted mt-4">
          Showing offline dates — live data is temporarily unavailable.
        </p>
      )}
    </div>
  )
}
