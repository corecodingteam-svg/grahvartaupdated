import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, Gem, Heart, Briefcase, Activity } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import KundliChart from '../components/ui/KundliChart'
import PlanetStrengthChart from '../components/ui/PlanetStrengthChart'
import DashaTimeline from '../components/ui/DashaTimeline'
import ElementBalanceChart from '../components/ui/ElementBalanceChart'
import Badge from '../components/ui/Badge'
import { buildKundli } from '../lib/astro'
import { setPageMeta } from '../lib/demo'

const demoFallback = { name: 'Demo User', dob: '1995-06-15', tob: '10:30', place: 'New Delhi, India' }

const loadingMessages = [
  'Calculating planetary positions…',
  'Mapping your birth chart houses…',
  'Reading your Nakshatra and Dasha…',
  'Consulting the stars…',
]

const severityTone = { High: 'text-error', Medium: 'text-gold', Low: 'text-success' }

export default function KundliResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const formData = location.state || demoFallback

  const fallback = useMemo(() => buildKundli(formData), [formData])
  const [ai, setAi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  useEffect(() => {
    setPageMeta(
      `${fallback.name}'s Kundli | GrahVarta`,
      `View ${fallback.name}'s free demo Kundli — Rashi, Nakshatra, planet positions, Dasha and Dosha details.`
    )
  }, [fallback.name])

  useEffect(() => {
    let cancelled = false
    let stepTimer

    setLoading(true)
    setError(false)
    setLoadingStep(0)
    stepTimer = setInterval(() => {
      setLoadingStep((s) => (s + 1) % loadingMessages.length)
    }, 1400)

    fetch('/web-api/kundli', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
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
  }, [formData.name, formData.dob, formData.tob, formData.place])

  const houses = ai?.houses || fallback.houses
  const planetPositions = ai?.planets || fallback.planetPositions
  const rashi = ai?.moonSign || fallback.rashi
  const nakshatra = ai
    ? `${ai.nakshatra}${ai.nakshatraPada ? ` (Pada ${ai.nakshatraPada})` : ''}`
    : fallback.nakshatra
  const doshas = ai?.doshas?.length
    ? ai.doshas
    : fallback.doshas.map((d) => ({ ...d, severity: d.present ? 'Medium' : 'Low', description: '' }))

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
        onClick={() => navigate('/kundli')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6"
      >
        <ArrowLeft size={16} /> Generate another Kundli
      </button>

      <SectionHeading level="h1" eyebrow="Your Result" title={`${fallback.name}'s Birth Chart`} />

      {error && (
        <p className="text-xs text-text-muted -mt-4 mb-6">
          Showing an offline demo reading — live reading is temporarily unavailable.
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Birth info + chart */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Birth Details</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Name</dt><dd className="font-medium">{fallback.name}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Date of Birth</dt><dd className="font-medium">{fallback.dob}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Time of Birth</dt><dd className="font-medium">{fallback.tob}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Birth Place</dt><dd className="font-medium text-right">{fallback.place}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Birth Chart</h2>
            <KundliChart houses={houses} />
            <p className="text-[11px] text-text-muted text-center mt-3">
              House 1 (orange border) is your Ascendant.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Rashi &amp; Nakshatra</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {ai?.ascendant && (
                <div className="flex justify-between"><dt className="text-text-secondary">Ascendant (Lagna)</dt><dd className="font-semibold text-gold">{ai.ascendant}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-text-secondary">Rashi (Moon Sign)</dt><dd className="font-semibold text-gold">{rashi}</dd></div>
              {ai?.sunSign && (
                <div className="flex justify-between"><dt className="text-text-secondary">Sun Sign</dt><dd className="font-semibold text-gold">{ai.sunSign}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-text-secondary">Nakshatra</dt><dd className="font-semibold text-gold">{nakshatra}</dd></div>
            </dl>
          </Card>

          {ai?.elementBalance && (
            <Card>
              <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Element Balance</h2>
              <ElementBalanceChart balance={ai.elementBalance} />
            </Card>
          )}

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Lucky Details</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Lucky Number</dt><dd className="font-semibold text-gold">{ai?.luckyNumber ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Lucky Color</dt><dd className="font-semibold text-gold">{ai?.luckyColor ?? '—'}</dd></div>
              {ai?.luckyGemstone && (
                <div className="flex justify-between"><dt className="text-text-secondary">Lucky Gemstone</dt><dd className="font-semibold text-gold">{ai.luckyGemstone}</dd></div>
              )}
            </dl>
          </Card>
        </div>

        {/* Planet positions + dasha + dosha + AI reading */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">Planet Positions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="py-2 pr-4 font-medium">Planet</th>
                    <th className="py-2 pr-4 font-medium">Sign</th>
                    <th className="py-2 pr-4 font-medium">House</th>
                    {ai && <th className="py-2 font-medium">Degree</th>}
                  </tr>
                </thead>
                <tbody>
                  {planetPositions.map((p) => (
                    <tr key={p.key} className="border-b border-divider last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {p.label} {p.retrograde && <span className="text-error text-xs font-bold">(R)</span>}
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{p.sign}</td>
                      <td className="py-2 pr-4 text-text-secondary">{p.house}</td>
                      {ai && <td className="py-2 text-text-secondary">{p.degree}°</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {ai?.planets && (
            <Card>
              <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">Planet Strength</h2>
              <PlanetStrengthChart planets={ai.planets} />
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Vimshottari Dasha</h2>
              <Badge tone="gold">Active Period</Badge>
            </div>
            <p className="text-lg font-bold text-orange mb-1">
              {(ai?.dasha?.currentLord || fallback.dasha.lord)} Mahadasha
            </p>
            <p className="text-xs text-text-secondary mb-4">
              {ai
                ? `${ai.dasha.yearsRemaining.toFixed(1)} years remaining in current period`
                : `${fallback.dasha.yearsRemaining} of ${fallback.dasha.yearsTotal} years remaining (offline estimate)`}
            </p>
            {ai?.dasha?.segments && (
              <DashaTimeline segments={ai.dasha.segments} totalYears={ai.dasha.totalYears} />
            )}
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Dosha Check</h2>
            <div className="flex flex-col gap-3">
              {doshas.map((d) => (
                <div key={d.name} className="flex flex-col gap-1 pb-3 border-b border-divider last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm">
                    <span>{d.name}</span>
                    {d.present ? (
                      <span className={`inline-flex items-center gap-1.5 font-medium ${severityTone[d.severity] || 'text-error'}`}>
                        <XCircle size={16} /> Present {d.severity && `(${d.severity})`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-success font-medium">
                        <CheckCircle2 size={16} /> No
                      </span>
                    )}
                  </div>
                  {d.description && <p className="text-xs text-text-muted">{d.description}</p>}
                </div>
              ))}
            </div>
          </Card>

          {ai?.personality && (
            <Card>
              <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide flex items-center gap-2">
                <Sparkles size={16} className="text-orange" /> Personality
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">{ai.personality}</p>
              {(ai.strengths?.length > 0 || ai.challenges?.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
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
                </div>
              )}
            </Card>
          )}

          {(ai?.career || ai?.relationships || ai?.health) && (
            <div className="grid sm:grid-cols-3 gap-4">
              {ai?.career && (
                <Card>
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-orange" /> Career
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{ai.career}</p>
                </Card>
              )}
              {ai?.relationships && (
                <Card>
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Heart size={14} className="text-orange" /> Relationships
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{ai.relationships}</p>
                </Card>
              )}
              {ai?.health && (
                <Card>
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Activity size={14} className="text-orange" /> Health
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{ai.health}</p>
                </Card>
              )}
            </div>
          )}

          {ai?.remedies?.length > 0 && (
            <Card>
              <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide flex items-center gap-2">
                <Gem size={16} className="text-orange" /> Suggested Remedies
              </h2>
              <ul className="flex flex-col gap-2">
                {ai.remedies.map((r) => (
                  <li key={r} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange shrink-0 mt-2" /> {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-text-secondary">
              Want a deeper, personalised reading of your chart?
            </p>
            <Link to="/astrologers" className="btn-primary shrink-0">Talk to an Astrologer</Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
