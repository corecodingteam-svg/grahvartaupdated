import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../components/ui/SectionHeading'
import { zodiacSigns } from '../data/zodiac'
import { setPageMeta } from '../lib/demo'

export default function Horoscope() {
  useEffect(() => {
    setPageMeta(
      'Daily Horoscope — All Zodiac Signs | GrahVarta',
      'Read today’s, tomorrow’s, weekly, monthly and yearly horoscope for all 12 zodiac signs.'
    )
  }, [])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Zodiac"
        title="Daily Horoscope"
        subtitle="Select your zodiac sign to view today's outlook and more."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {zodiacSigns.map((sign) => (
          <Link
            key={sign.id}
            to={`/horoscope/${sign.id}`}
            className="card flex flex-col items-center text-center gap-2 py-7 hover:border-orange/50 transition-colors"
          >
            <span className="text-3xl text-gold" aria-hidden="true">{sign.symbol}</span>
            <span className="font-semibold">{sign.label}</span>
            <span className="text-xs text-text-muted">{sign.dateRange}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
