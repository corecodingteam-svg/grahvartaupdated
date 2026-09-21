import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import KundliChart from '../components/ui/KundliChart'
import Badge from '../components/ui/Badge'
import { buildKundli } from '../lib/astro'
import { setPageMeta } from '../lib/demo'

const demoFallback = { name: 'Demo User', dob: '1995-06-15', tob: '10:30', place: 'New Delhi, India' }

export default function KundliResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const formData = location.state || demoFallback

  const kundli = useMemo(() => buildKundli(formData), [formData])

  useEffect(() => {
    setPageMeta(
      `${kundli.name}'s Kundli | GrahVarta`,
      `View ${kundli.name}'s free demo Kundli — Rashi, Nakshatra, planet positions, Dasha and Dosha details.`
    )
  }, [kundli])

  return (
    <div className="container-page py-8 sm:py-12">
      <button
        type="button"
        onClick={() => navigate('/kundli')}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6"
      >
        <ArrowLeft size={16} /> Generate another Kundli
      </button>

      <SectionHeading level="h1" eyebrow="Your Result" title={`${kundli.name}'s Birth Chart`} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Birth info + chart */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Birth Details</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Name</dt><dd className="font-medium">{kundli.name}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Date of Birth</dt><dd className="font-medium">{kundli.dob}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Time of Birth</dt><dd className="font-medium">{kundli.tob}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Birth Place</dt><dd className="font-medium text-right">{kundli.place}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Birth Chart</h2>
            <KundliChart houses={kundli.houses} />
            <p className="text-[11px] text-text-muted text-center mt-3">Demo chart for illustration — numbers indicate house 1–12.</p>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Rashi &amp; Nakshatra</h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-text-secondary">Rashi (Moon Sign)</dt><dd className="font-semibold text-gold">{kundli.rashi}</dd></div>
              <div className="flex justify-between"><dt className="text-text-secondary">Nakshatra</dt><dd className="font-semibold text-gold">{kundli.nakshatra}</dd></div>
            </dl>
          </Card>
        </div>

        {/* Planet positions + dasha + dosha */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wide">Planet Positions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="py-2 pr-4 font-medium">Planet</th>
                    <th className="py-2 pr-4 font-medium">Sign</th>
                    <th className="py-2 font-medium">House</th>
                  </tr>
                </thead>
                <tbody>
                  {kundli.planetPositions.map((p) => (
                    <tr key={p.key} className="border-b border-divider last:border-0">
                      <td className="py-2 pr-4 font-medium">{p.label}</td>
                      <td className="py-2 pr-4 text-text-secondary">{p.sign}</td>
                      <td className="py-2 text-text-secondary">{p.house}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Current Dasha</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-orange">{kundli.dasha.lord} Mahadasha</p>
                <p className="text-xs text-text-secondary mt-1">
                  {kundli.dasha.yearsRemaining} of {kundli.dasha.yearsTotal} years remaining (demo estimate)
                </p>
              </div>
              <Badge tone="gold">Active Period</Badge>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">Dosha Check</h2>
            <div className="flex flex-col gap-3">
              {kundli.doshas.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span>{d.name}</span>
                  {d.present ? (
                    <span className="inline-flex items-center gap-1.5 text-error font-medium">
                      <XCircle size={16} /> Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-success font-medium">
                      <CheckCircle2 size={16} /> No
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

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
