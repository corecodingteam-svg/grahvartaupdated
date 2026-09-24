import { useEffect, useState } from 'react'
import { CheckCircle2, Compass, Home, Building2, MapPinned, Loader2, Gauge } from 'lucide-react'
import toast from 'react-hot-toast'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { vastuConsultations, consultationIncludes } from '../data/vastu'
import { setPageMeta } from '../lib/demo'

// Explicit map (rather than `import * as Icons`) keeps this page's bundle
// limited to only the icons it actually uses.
const Icons = { Home, Building2, MapPinned }

const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']

export default function Vastu() {
  const [activeId, setActiveId] = useState(vastuConsultations[0].id)
  const [facingDirection, setFacingDirection] = useState('North-East')
  const [concern, setConcern] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setPageMeta(
      'Vastu Consultation | GrahVarta',
      'Get a personalized Vastu assessment for your Home, Office or Plot — guidance on direction, layout and placement.'
    )
  }, [])

  const active = vastuConsultations.find((c) => c.id === activeId) || vastuConsultations[0]

  function handleSelectTab(id) {
    setActiveId(id)
    setResult(null)
  }

  async function handleAnalyze(e) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    setResult(null)

    try {
      const res = await fetch('/web-api/vastu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceType: activeId, facingDirection, concern: concern.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'request failed')
      setResult(data)
    } catch {
      setError(true)
      toast.error('Could not reach the Vastu assessment service — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Free Tool"
        title="Vastu Consultation"
        subtitle="Time-tested space and direction principles — get a personalized assessment for your home, office or plot."
      />

      <Card className="flex items-start gap-4 mb-8 max-w-3xl">
        <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
          <Compass size={20} />
        </span>
        <p className="text-sm text-text-secondary leading-relaxed">
          Tell us the facing direction of your space and any specific concern, and get practical, low-disruption
          suggestions around direction, layout and placement.
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
              onClick={() => handleSelectTab(c.id)}
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
        </Card>

        <Card className="lg:col-span-3">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">Get Your Free Assessment</h3>
          <form onSubmit={handleAnalyze} className="grid sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-1">
              <label htmlFor="vastu-direction" className="block text-sm font-medium mb-1.5">Facing Direction</label>
              <select
                id="vastu-direction"
                value={facingDirection}
                onChange={(e) => setFacingDirection(e.target.value)}
                className="input-field"
              >
                {directions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="vastu-concern" className="block text-sm font-medium mb-1.5">
                Specific Concern <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                id="vastu-concern"
                type="text"
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                placeholder="e.g. kitchen feels cramped and dark"
                className="input-field"
                maxLength={200}
              />
            </div>
            <button type="submit" className="btn-primary sm:col-span-3 inline-flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Analyzing…' : `Analyze My ${active.label}`}
            </button>
          </form>

          {result && (
            <div className="mt-6 pt-6 border-t border-divider flex flex-col gap-5 animate-fade-in">
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-gold flex items-center justify-center text-white shrink-0">
                  <Gauge size={24} />
                </span>
                <div>
                  <p className="text-2xl font-bold text-orange">{result.score}<span className="text-sm text-text-muted font-normal">/100</span></p>
                  <p className="text-xs text-text-secondary uppercase tracking-wide">Vastu Compatibility Score</p>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{result.assessment}</p>

              {result.suggestions?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Suggestions</h4>
                  <ul className="flex flex-col gap-2">
                    {result.suggestions.map((s) => (
                      <li key={s} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                        <span className="text-text-secondary">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.remedies?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Simple Remedies</h4>
                  <ul className="flex flex-col gap-2">
                    {result.remedies.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0 mt-2" />
                        <span className="text-text-secondary">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <p className="text-xs text-text-muted">Live assessment is temporarily unavailable — please try again.</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
