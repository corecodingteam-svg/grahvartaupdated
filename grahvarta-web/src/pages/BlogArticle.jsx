import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { getBlogArticleBySlug, getRelatedArticles } from '../data/blog'
import { setPageMeta } from '../lib/demo'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogArticle() {
  const { slug } = useParams()
  const article = getBlogArticleBySlug(slug)
  const related = getRelatedArticles(article)

  useEffect(() => {
    if (article) {
      setPageMeta({
        title: `${article.title} | GrahVarta Blog`,
        description: article.excerpt,
        image: article.image,
        type: 'article',
      })
    }
  }, [article])

  if (!article) {
    return <Navigate to="/blog" replace />
  }

  const { title, category, image, publishedDate, body } = article

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6">
        <ArrowLeft size={16} /> All articles
      </Link>

      <article className="max-w-3xl">
        <img src={image} alt={title} className="w-full h-64 sm:h-80 object-cover rounded-2xl border border-border mb-6" />

        <Badge tone="orange" className="w-fit mb-3">{category}</Badge>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{title}</h1>
        <div className="flex items-center gap-1.5 text-sm text-text-muted mb-6">
          <CalendarDays size={15} /> {formatDate(publishedDate)}
        </div>

        <div className="flex flex-col gap-4">
          {body.map((paragraph, i) => (
            <p key={i} className="text-sm sm:text-base text-text-secondary leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        <p className="text-xs text-text-muted mt-8">
          This article is for entertainment and spiritual guidance purposes only and is not a substitute for
          professional advice.
        </p>
      </article>

      {related.length > 0 && (
        <section className="max-w-5xl mt-12">
          <h2 className="text-lg font-semibold mb-4">Related Articles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {related.map((r) => (
              <Link key={r.slug} to={`/blog/${r.slug}`}>
                <Card className="flex flex-col gap-3 overflow-hidden h-full hover:border-orange/50 transition-colors">
                  <img
                    src={r.image}
                    alt={r.title}
                    className="w-full h-36 object-cover rounded-xl -mt-5 -mx-5 mb-1"
                    style={{ width: 'calc(100% + 2.5rem)' }}
                    loading="lazy"
                  />
                  <Badge tone="orange" className="w-fit">{r.category}</Badge>
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2">{r.title}</h3>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
