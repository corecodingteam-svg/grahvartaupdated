import { useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { getMuhuratBySlug } from '../data/muhurat'
import { setPageMeta } from '../lib/demo'

export default function MuhuratDetail() {
  const { slug } = useParams()
  const category = getMuhuratBySlug(slug)

  useEffect(() => {
    if (category) {
      setPageMeta(`${category.title} Muhurat Dates | GrahVarta`, category.description)
    }
  }, [category])

  if (!category) {
    return <Navigate to="/muhurat" replace />
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/muhurat" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6">
        <ArrowLeft size={16} /> All categories
      </Link>

      <SectionHeading level="h1" eyebrow="Subh Muhurat" title={category.title} subtitle={category.description} />

      <div className="flex flex-col gap-3 max-w-2xl">
        {category.dates.map((d, i) => (
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
    </div>
  )
}
