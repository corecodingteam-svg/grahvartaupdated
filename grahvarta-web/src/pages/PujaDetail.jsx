import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import Card from '../components/ui/Card'
import { getPujaBySlug } from '../data/puja'
import { demoOnly, setPageMeta } from '../lib/demo'

export default function PujaDetail() {
  const { slug } = useParams()
  const puja = getPujaBySlug(slug)

  useEffect(() => {
    if (puja) {
      setPageMeta({
        title: `${puja.name} | GrahVarta`,
        description: puja.shortDescription,
        image: puja.image,
      })
    }
  }, [puja])

  if (!puja) {
    return <Navigate to="/puja" replace />
  }

  const { name, image, description, benefits, price, duration, includes } = puja

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/puja" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6">
        <ArrowLeft size={16} /> All pujas
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <img src={image} alt={name} className="w-full h-64 sm:h-80 object-cover rounded-2xl border border-border" />

          <section>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">{name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-text-muted mb-4">
              <Clock size={15} /> {duration}
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Benefits</h2>
            <ul className="flex flex-col gap-2.5">
              {benefits.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm">
                  <Sparkles size={16} className="text-orange shrink-0 mt-0.5" />
                  <span className="text-text-secondary">{point}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Puja fee</span>
              <span className="text-lg font-bold text-orange">₹{price.toLocaleString('en-IN')}</span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2.5">Includes</h3>
              <ul className="flex flex-col gap-2">
                {includes.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />
                    <span className="text-text-secondary">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => demoOnly('Demo only — booking not available.')}
              className="btn-primary w-full"
            >
              Book Now
            </button>
            <p className="text-xs text-text-muted text-center">
              This is a demo site — booking is not functional.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
