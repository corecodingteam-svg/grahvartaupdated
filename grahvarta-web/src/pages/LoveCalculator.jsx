import { useEffect, useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import CompatibilityMeter from '../components/ui/CompatibilityMeter'
import { setPageMeta } from '../lib/demo'

export default function LoveCalculator() {
  const [name, setName] = useState('')
  const [partner, setPartner] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setPageMeta(
      'Love Calculator | GrahVarta',
      'Calculate a fun compatibility score between you and your partner.'
    )
  }, [])

  async function handleCalculate(e) {
    e.preventDefault()
    if (!name.trim() || !partner.trim()) {
      toast.error('Please enter both names.')
      return
    }

    setLoading(true)
    setError(false)
    setResult(null)

    try {
      const res = await fetch('/api/love-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), partner: partner.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'request failed')
      setResult(data)
    } catch {
      setError(true)
      toast.error('Could not reach the love calculator service — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Just for Fun"
        title="Love Calculator"
        subtitle="Enter two names to see a fun compatibility score."
      />

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
              <Heart size={20} />
            </span>
            <p className="text-sm text-text-secondary">Just for fun — not real astrology.</p>
          </div>
          <form onSubmit={handleCalculate} className="flex flex-col gap-4">
            <div>
              <label htmlFor="love-name" className="block text-sm font-medium mb-1.5">Your Name</label>
              <input
                id="love-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="love-partner" className="block text-sm font-medium mb-1.5">Partner's Name</label>
              <input
                id="love-partner"
                type="text"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder="Enter partner's name"
                className="input-field"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Calculating…' : 'Calculate'}
            </button>
          </form>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center gap-4">
          {result ? (
            <>
              <CompatibilityMeter percentage={result.score} label="Match" />
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs">{result.interpretation}</p>
              {result.strengths?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {result.strengths.map((s) => (
                    <span key={s} className="text-[11px] px-2 py-1 rounded-full bg-surface-light text-text-secondary">{s}</span>
                  ))}
                </div>
              )}
              {result.tip && <p className="text-sm text-gold font-medium leading-relaxed max-w-xs">✦ {result.tip}</p>}
              {error && (
                <p className="text-xs text-text-muted">Live reading unavailable — try again shortly.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">Enter both names and hit calculate to see your result.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
