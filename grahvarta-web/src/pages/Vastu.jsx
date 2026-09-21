import { useEffect, useState } from 'react'
import { CheckCircle2, Compass, Home, Building2, MapPinned } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { vastuConsultations, consultationIncludes } from '../data/vastu'
import { demoOnly, setPageMeta } from '../lib/demo'

// Explicit map (rather than `import * as Icons`) keeps this page's bundle
// limited to only the icons it actually uses.
const Icons = { Home, Building2, MapPinned }

export default function Vastu() {
  const [activeId, setActiveId] = useState(vastuConsultations[0].id)

  useEffect(() => {
    setPageMeta(
      'Vastu Consultation | GrahVarta',
      'Book a Vastu consultation for your Home, Office or Plot — expert guidance on direction, layout and placement.'
    )
  }, [])

  const active = vastuConsultations.find((c) => c.id === activeId) || vastuConsultations[0]

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Consultation"
        title="Vastu Consultation"
        subtitle="Time-tested space and direction principles for a more balanced home, office or plot."
      />

      <Card className="flex items-start gap-4 mb-8 max-w-3xl">
        <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
          <Compass size={20} />
        </span>
        <p className="text-sm text-text-secondary leading-relaxed">
          Our Vastu consultants review your space and offer practical, low-disruption suggestions around direction,
          layout and placement — for a home that feels at ease, an office that supports focus, or a plot ready for
          a strong start.
        </p>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {vastuConsultations.map((c) => {
          const Icon = Icons[c.icon] || Compass
          const isActive = c.id === activeId
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-orange text-white' : 'bg-surface text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={16} /> {c.label}
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold text-lg mb-2">{active.label} Consultation</h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-5">{active.description}</p>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">What We Check</h3>
          <ul className="flex flex-col gap-2.5">
            {active.checks.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 size={16} className="text-orange shrink-0 mt-0.5" />
                <span className="text-text-secondary">{point}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Consultation Includes</h3>
          <ul className="flex flex-col gap-2.5">
            {consultationIncludes.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                <span className="text-text-secondary">{point}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => demoOnly('Demo only — booking not available.')}
            className="btn-primary w-full mt-2"
          >
            Book Consultation
          </button>
        </Card>
      </div>
    </div>
  )
}
