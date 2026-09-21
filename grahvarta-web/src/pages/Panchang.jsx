import { useEffect, useMemo } from 'react'
import { Sunrise, Sunset, AlertTriangle, CheckCircle2 } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { hashString, pickFromHash, setPageMeta } from '../lib/demo'

const tithis = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami']
const nakshatraOptions = ['Rohini', 'Hasta', 'Swati', 'Pushya', 'Anuradha', 'Shravana', 'Uttara Ashadha']
const yogas = ['Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Siddhi', 'Shukla']
const karanas = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti']

export default function Panchang() {
  const today = useMemo(() => new Date(), [])
  const dateLabel = useMemo(
    () => today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    [today]
  )

  const seed = useMemo(() => today.toISOString().slice(0, 10), [today])

  const panchang = useMemo(() => {
    const h = hashString(seed)
    return {
      tithi: pickFromHash(h, tithis),
      nakshatra: pickFromHash(hashString(`${seed}-nak`), nakshatraOptions),
      yoga: pickFromHash(hashString(`${seed}-yoga`), yogas),
      karana: pickFromHash(hashString(`${seed}-karana`), karanas),
      sunrise: '06:14 AM',
      sunset: '06:32 PM',
      rahuKaal: '04:30 PM – 06:00 PM',
    }
  }, [seed])

  useEffect(() => {
    setPageMeta(
      "Today's Panchang | GrahVarta",
      'View today’s Panchang — Tithi, Nakshatra, Yoga, Karana, sunrise/sunset and Rahu Kaal timings.'
    )
  }, [])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading level="h1" eyebrow={dateLabel} title="Today's Panchang" subtitle="Daily auspicious timing overview (demo data)." />

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
            <p className="text-sm text-text-secondary">11:48 AM – 12:36 PM</p>
            <p className="text-xs text-text-muted mt-1">A generally favourable window for important tasks.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
