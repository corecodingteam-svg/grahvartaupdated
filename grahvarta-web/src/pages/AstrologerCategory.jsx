import { useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AstrologerCard from '../components/astrologer/AstrologerCard'
import SectionHeading from '../components/ui/SectionHeading'
import { getAstrologersByCategory } from '../data/astrologers'
import { astrologerCategories } from '../data/categories'
import { setPageMeta } from '../lib/demo'

export default function AstrologerCategory() {
  const { category } = useParams()
  const meta = astrologerCategories.find((c) => c.id === category)
  const list = getAstrologersByCategory(category)

  useEffect(() => {
    if (meta) {
      setPageMeta(`${meta.label} Astrologers | GrahVarta`, `Consult expert ${meta.label} astrologers on GrahVarta.`)
    }
  }, [meta])

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
        title={`${meta.label} Astrologers`}
        subtitle={`${list.length} expert${list.length === 1 ? '' : 's'} available for ${meta.label.toLowerCase()} consultations.`}
      />

      {list.length === 0 ? (
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
