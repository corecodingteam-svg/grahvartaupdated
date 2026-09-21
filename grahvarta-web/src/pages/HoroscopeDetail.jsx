import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Card from '../components/ui/Card'
import SectionHeading from '../components/ui/SectionHeading'
import { getZodiacById, getHoroscopeContent, getLuckyDetails, horoscopePeriods } from '../data/zodiac'
import { setPageMeta } from '../lib/demo'

const periodLabels = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export default function HoroscopeDetail() {
  const { sign } = useParams()
  const zodiac = getZodiacById(sign)
  const [period, setPeriod] = useState('today')

  useEffect(() => {
    if (zodiac) {
      setPageMeta(
        `${zodiac.label} Horoscope | GrahVarta`,
        `Read ${zodiac.label}'s today, weekly, monthly and yearly horoscope predictions.`
      )
    }
  }, [zodiac])

  if (!zodiac) {
    return <Navigate to="/horoscope" replace />
  }

  const lucky = getLuckyDetails(zodiac.id)
  const blurb = getHoroscopeContent(zodiac.id, period)

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/horoscope" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6">
        <ArrowLeft size={16} /> All signs
      </Link>

      <SectionHeading
        level="h1"
        eyebrow={zodiac.dateRange}
        title={
          <span className="inline-flex items-center gap-2">
            <span className="text-gold" aria-hidden="true">{zodiac.symbol}</span> {zodiac.label}
          </span>
        }
        subtitle={`Element: ${zodiac.element} · Ruling Planet: ${zodiac.rulingPlanet}`}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-5">
            {horoscopePeriods.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  period === p ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary hover:text-text-primary'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">{blurb}</p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">Lucky Details</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Lucky Number</dt>
              <dd className="font-semibold text-gold">{lucky.number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Lucky Color</dt>
              <dd className="font-semibold text-gold">{lucky.color}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">Lucky Day</dt>
              <dd className="font-semibold text-gold">{lucky.day}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}
