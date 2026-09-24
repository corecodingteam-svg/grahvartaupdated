import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import CompatibilityMeter from '../components/ui/CompatibilityMeter'
import { buildMatch } from '../lib/astro'
import { setPageMeta } from '../lib/demo'

const demoFallback = {
  person1: { name: 'Aarav', dob: '1994-03-12', tob: '08:15', place: 'Mumbai, India' },
  person2: { name: 'Diya', dob: '1996-07-22', tob: '14:40', place: 'Jaipur, India' },
}

const loadingMessages = [
  'Comparing birth charts…',
  'Calculating Ashtakoot Guna Milan…',
  'Weighing Varna, Vashya, Tara, Yoni…',
  'Reading Graha Maitri and Nadi…',
]

export default function KundliMatchingResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { person1, person2 } = location.state || demoFallback

  const fallback = buildMatch(person1, person2)
  const [ai, setAi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  useEffect(() => {
    setPageMeta(
      `${person1.name} & ${person2.name} Kundli Match | GrahVarta`,
      `Guna Milan compatibility score for ${person1.name} and ${person2.name}.`
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person1.name, person2.name])

  useEffect(() => {
    let cancelled = false
    let stepTimer

    setLoading(true)
    setError(false)
    stepTimer = setInterval(() => {
      setLoadingStep((s) => (s + 1) % loadingMessages.length)
    }, 1400)

    fetch('/web-api/kundli-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person1, person2 }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data) => {
        if (!cancelled) setAi(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
        clearInterval(stepTimer)
      })

    return () => {
      cancelled = true
      clearInterval(stepTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person1.name, person1.dob, person1.tob, person1.place, person2.name, person2.dob, person2.tob, person2.place])

  const match = ai || fallback

  if (loading) {
    return (
      <div className="container-page py-24 flex flex-col items-center justify-center text-center gap-4 min-h-[50vh]">
        <span className="w-12 h-12 rounded-full border-4 border-surface-light border-t-orange animate-spin" />
        <p className="text-sm text-text-secondary animate-pulse">{loadingMessages[loadingStep]}</p>
      </div>
    )
  }

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

      {error && (
        <p className="text-xs text-text-muted -mt-4 mb-6">
          Showing an offline demo score — live matching is temporarily unavailable.
        </p>
      )}

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

        {(ai?.strengths?.length > 0 || ai?.challenges?.length > 0) && (
          <Card className="lg:col-span-3 grid sm:grid-cols-2 gap-6">
            {ai.strengths?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-success uppercase tracking-wide mb-2">Strengths</h3>
                <ul className="flex flex-col gap-1.5">
                  {ai.strengths.map((s) => (
                    <li key={s} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ai.challenges?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-error uppercase tracking-wide mb-2">Growth Areas</h3>
                <ul className="flex flex-col gap-1.5">
                  {ai.challenges.map((c) => (
                    <li key={c} className="text-sm text-text-secondary flex items-start gap-1.5">
                      <XCircle size={14} className="text-error shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

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
