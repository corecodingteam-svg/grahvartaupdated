import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionHeading from '../components/ui/SectionHeading'
import { blogArticles, blogCategories } from '../data/blog'
import { setPageMeta } from '../lib/demo'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Blog() {
  const [category, setCategory] = useState('')

  useEffect(() => {
    setPageMeta({
      title: 'Astrology Blog & Articles | GrahVarta',
      description: 'Read articles on Vedic astrology, tarot, numerology, vastu, horoscopes and kundli — insights and guides from the GrahVarta astrology content library.',
    })
  }, [])

  const filtered = useMemo(() => {
    if (!category) return blogArticles
    return blogArticles.filter((a) => a.category === category)
  }, [category])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Learn"
        title="Astrology Insights"
        subtitle="Articles and guides on Vedic astrology, tarot, numerology, vastu and more."
      />

      <div className="flex flex-wrap gap-2 mb-8">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            category === '' ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary hover:text-text-primary'
          }`}
        >
          All
        </button>
        {blogCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              category === c ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary hover:text-text-primary'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">No articles in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((article) => (
            <Link key={article.slug} to={`/blog/${article.slug}`}>
              <Card className="flex flex-col gap-3 overflow-hidden h-full hover:border-orange/50 transition-colors">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-44 object-cover rounded-xl -mt-5 -mx-5 mb-1"
                  style={{ width: 'calc(100% + 2.5rem)' }}
                  loading="lazy"
                />
                <Badge tone="orange" className="w-fit">{article.category}</Badge>
                <h2 className="font-semibold text-lg leading-snug line-clamp-2">{article.title}</h2>
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{article.excerpt}</p>
                <div className="flex items-center gap-1.5 text-xs text-text-muted mt-auto pt-2 border-t border-divider">
                  <CalendarDays size={13} /> {formatDate(article.publishedDate)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
