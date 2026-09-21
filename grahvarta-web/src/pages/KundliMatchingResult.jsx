import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import CompatibilityMeter from '../components/ui/CompatibilityMeter'
import { buildMatch } from '../lib/astro'
import { setPageMeta } from '../lib/demo'

const demoFallback = {
  person1: { name: 'Aarav', dob: '1994-03-12', tob: '08:15', place: 'Mumbai, India' },
  person2: { name: 'Diya', dob: '1996-07-22', tob: '14:40', place: 'Jaipur, India' },
}

export default function KundliMatchingResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { person1, person2 } = location.state || demoFallback

  const match = useMemo(() => buildMatch(person1, person2), [person1, person2])

  useEffect(() => {
    setPageMeta(
      `${person1.name} & ${person2.name} Kundli Match | GrahVarta`,
      `Demo Guna Milan compatibility score for ${person1.name} and ${person2.name}.`
    )
  }, [person1, person2])

  return (
    <div className="container-page py-8 sm:py-12">
      <button
        type="button"
        onClick={() => navigate('/kundli-matching')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6"
      >
        <ArrowLeft size={16} /> Match another couple
      </button>

      <SectionHeading level="h1" eyebrow="Your Result" title={`${person1.name} & ${person2.name}`} />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center text-center gap-4">
          <CompatibilityMeter percentage={match.percentage} label="Compatible" />
          <p className="text-lg font-bold text-gold">
            {match.totalScore} / {match.maxScore} Guna Milan
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{match.summary}</p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">Koota Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="py-2 pr-4 font-medium">Koota</th>
                  <th className="py-2 pr-4 font-medium">Max Score</th>
                  <th className="py-2 font-medium">Awarded</th>
                </tr>
              </thead>
              <tbody>
                {match.breakdown.map((b) => (
                  <tr key={b.key} className="border-b border-divider last:border-0">
                    <td className="py-2 pr-4 font-medium">{b.label}</td>
                    <td className="py-2 pr-4 text-text-secondary">{b.max}</td>
                    <td className="py-2 text-text-secondary">{b.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-secondary">
            Want a detailed matching report from a real expert?
          </p>
          <Link to="/astrologers" className="btn-primary shrink-0">Talk to an Astrologer</Link>
        </Card>
      </div>
    </div>
  )
}
