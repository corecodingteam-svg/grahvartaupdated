import { useEffect, useState } from 'react'
import { Hash, Sparkles, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { setPageMeta } from '../lib/demo'

export default function Numerology() {
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setPageMeta(
      'Numerology Calculator | GrahVarta',
      'Discover your Life Path Number and Destiny Number with our free numerology calculator.'
    )
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !dob) {
      toast.error('Please enter your name and date of birth.')
      return
    }

    setLoading(true)
    setError(false)
    setResult(null)

    try {
      const res = await fetch('/web-api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), dob }),
      })
      const data = await res.json()
      if (!res.ok) {
        // The server computes lifePath/destiny with real math before calling
        // Gemini, so even a failed reading still carries the real numbers.
        if (data.lifePath) setResult(data)
        throw new Error(data.error || 'request failed')
      }
      setResult(data)
    } catch {
      setError(true)
      toast.error('Live reading is temporarily unavailable — showing your numbers only.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Free Tool"
        title="Numerology Calculator"
        subtitle="Enter your name and date of birth to discover your Life Path and Name numbers."
      />

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
              <Hash size={20} />
            </span>
            <p className="text-sm text-text-secondary">
              Life Path and Destiny numbers are calculated with the real Pythagorean method, with a personalized interpretation.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="num-name" className="block text-sm font-medium mb-1.5">Full Name</label>
              <input
                id="num-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="num-dob" className="block text-sm font-medium mb-1.5">Date of Birth</label>
              <input
                id="num-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Calculating…' : 'Calculate My Numbers'}
            </button>
          </form>
        </Card>

        {result ? (
          <div className="flex flex-col gap-4">
            <Card className="flex items-center gap-4">
              <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange to-gold flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {result.lifePath}
              </span>
              <div>
                <h3 className="font-semibold">Life Path Number</h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  {result.lifePathMeaning || 'Your personalized reading is on its way.'}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-orange-light flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {result.destiny}
              </span>
              <div>
                <h3 className="font-semibold">Destiny Number</h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  {result.destinyMeaning || 'Your personalized reading is on its way.'}
                </p>
              </div>
            </Card>
            {(result.luckyColor || result.luckyDay || result.compatibleNumbers?.length > 0) && (
              <Card>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Lucky Details</h3>
                <dl className="flex flex-col gap-2 text-sm">
                  {result.luckyColor && (
                    <div className="flex justify-between"><dt className="text-text-secondary">Lucky Color</dt><dd className="font-semibold text-gold">{result.luckyColor}</dd></div>
                  )}
                  {result.luckyDay && (
                    <div className="flex justify-between"><dt className="text-text-secondary">Lucky Day</dt><dd className="font-semibold text-gold">{result.luckyDay}</dd></div>
                  )}
                  {result.compatibleNumbers?.length > 0 && (
                    <div className="flex justify-between"><dt className="text-text-secondary">Compatible Numbers</dt><dd className="font-semibold text-gold">{result.compatibleNumbers.join(', ')}</dd></div>
                  )}
                </dl>
                {result.advice && <p className="text-sm text-text-secondary mt-3 pt-3 border-t border-divider">{result.advice}</p>}
              </Card>
            )}
            {error && (
              <p className="text-xs text-text-muted">
                Showing your calculated numbers — live interpretation is temporarily unavailable.
              </p>
            )}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center text-center gap-3">
            <Sparkles className="text-text-muted" size={24} />
            <p className="text-sm text-text-muted">Fill in the form and calculate to see your numbers.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
