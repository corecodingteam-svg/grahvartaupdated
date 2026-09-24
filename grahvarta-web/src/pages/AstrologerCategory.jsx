import { translateText } from '@i18n'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AstrologerCard from '../components/astrologer/AstrologerCard'
import { AstrologerCardSkeleton } from '../components/ui/Skeleton'
import SectionHeading from '../components/ui/SectionHeading'
import { fetchAstrologers } from '../lib/astrologers'
import { normalizeAstrologer } from '../lib/astrologerDisplay'
import { astrologerCategories } from '../data/categories'
import { setPageMeta } from '../lib/demo'

export default function AstrologerCategory() {
  const { category } = useParams()
  const meta = astrologerCategories.find((c) => c.id === category)

  const [astrologers, setAstrologers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (meta) {
      setPageMeta(`${meta.label} Astrologers | GrahVarta`, `Consult expert ${meta.label} astrologers on GrahVarta.`)
    }
  }, [meta])

  useEffect(() => {
    if (!meta) return
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchAstrologers({ limit: 100 })
      .then(({ list }) => {
        if (!cancelled) setAstrologers(list.map(normalizeAstrologer))
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
  }, [meta])

  // The real specialization strings astrologers register with aren't a known
  // fixed taxonomy, so this matches loosely (substring, case-insensitive)
  // against expertise/bio rather than requiring an exact field match.
  const list = useMemo(() => {
    if (!meta) return []
    const keyword = meta.label.toLowerCase().split(/\s+&\s+|\s+/)[0]
    return astrologers.filter(
      (a) =>
        a.expertise.some((tag) => tag.toLowerCase().includes(keyword)) ||
        a.bio.toLowerCase().includes(keyword)
    )
  }, [astrologers, meta])

  if (!meta) {
    return <Navigate to="/astrologers" replace />
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/astrologers" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-4">
        <ArrowLeft size={16} /> All astrologers
      </Link>
      <SectionHeading
        level="h1"
        eyebrow="Category"
        title={`${translateText(meta.label)} Astrologers`}
        subtitle={
          loading
            ? 'Loading…'
            : list.length === 1
              ? `1 expert available for ${translateText(meta.label).toLowerCase()} consultations.`
              : `${list.length} experts available for ${translateText(meta.label).toLowerCase()} consultations.`
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <AstrologerCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">Could not load astrologers right now. Please try again shortly.</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">No astrologers available in this category right now.</p>
          <Link to="/astrologers" className="btn-outline mt-4 inline-flex">
            Browse all astrologers
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((a) => (
            <AstrologerCard key={a.id} astrologer={a} />
          ))}
        </div>
      )}
    </div>
  )
}
