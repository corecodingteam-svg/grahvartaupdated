import { useEffect } from 'react'
import { Orbit } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { planetTransits } from '../data/planetTransit'
import { setPageMeta } from '../lib/demo'

export default function PlanetTransit() {
  useEffect(() => {
    setPageMeta(
      'Planet Transit — Current Graha Positions | GrahVarta',
      'See the current zodiac transit of all nine grahas — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu.'
    )
  }, [])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Transits"
        title="Planet Transit"
        subtitle="Current zodiac transit of the nine grahas and their general influence."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {planetTransits.map((p) => (
          <Card key={p.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange text-lg">
                  {p.symbol}
                </span>
                <div>
                  <h2 className="font-semibold">{p.name}</h2>
                  <p className="text-xs text-text-muted">{p.transitDate}</p>
                </div>
              </div>
              <span className="badge-gold shrink-0">{p.sign}</span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">{p.interpretation}</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-text-muted mt-6">
        <Orbit size={14} /> Demo transit data for illustration only.
      </div>
    </div>
  )
}
