import { useEffect, useMemo, useState } from 'react'
import { Sunrise, Sunset, AlertTriangle, CheckCircle2 } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { setPageMeta } from '../lib/demo'

export default function Panchang() {
  const today = useMemo(() => new Date(), [])
  const dateLabel = useMemo(
    () => today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    [today]
  )

  const [panchang, setPanchang] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setPageMeta(
      "Today's Panchang | GrahVarta",
      'View today’s Panchang — Tithi, Nakshatra, Yoga, Karana, sunrise/sunset and Rahu Kaal timings.'
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/panchang')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data) => {
        if (!cancelled) setPanchang(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="container-page py-24 flex flex-col items-center justify-center text-center gap-4 min-h-[40vh]">
        <span className="w-12 h-12 rounded-full border-4 border-surface-light border-t-orange animate-spin" />
        <p className="text-sm text-text-secondary animate-pulse">Reading today's Panchang…</p>
      </div>
    )
  }

  if (!panchang) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-sm text-text-muted">Panchang is temporarily unavailable — please try again shortly.</p>
      </div>
    )
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading level="h1" eyebrow={dateLabel} title="Today's Panchang" subtitle="Daily auspicious timing overview." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Tithi</p>
          <p className="text-lg font-bold text-gold">{panchang.tithi}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Nakshatra</p>
          <p className="text-lg font-bold text-gold">{panchang.nakshatra}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Yoga</p>
          <p className="text-lg font-bold text-gold">{panchang.yoga}</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Karana</p>
          <p className="text-lg font-bold text-gold">{panchang.karana}</p>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Card className="flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
            <Sunrise size={20} />
          </span>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Sunrise</p>
            <p className="text-base font-semibold">{panchang.sunrise}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
            <Sunset size={20} />
          </span>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Sunset</p>
            <p className="text-base font-semibold">{panchang.sunset}</p>
          </div>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="flex items-start gap-4 border-error/30">
          <span className="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center text-error shrink-0">
            <AlertTriangle size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold mb-1">Rahu Kaal (Inauspicious)</p>
            <p className="text-sm text-text-secondary">{panchang.rahuKaal}</p>
            <p className="text-xs text-text-muted mt-1">Avoid starting new or important work during this window.</p>
          </div>
        </Card>
        <Card className="flex items-start gap-4 border-success/30">
          <span className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center text-success shrink-0">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold mb-1">Abhijit Muhurat (Auspicious)</p>
            <p className="text-sm text-text-secondary">{panchang.abhijitMuhurat}</p>
            <p className="text-xs text-text-muted mt-1">A generally favourable window for important tasks.</p>
          </div>
        </Card>
      </div>

      {panchang.dayQuality && (
        <Card className="mt-6">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Today's Outlook</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{panchang.dayQuality}</p>
        </Card>
      )}
    </div>
  )
}
