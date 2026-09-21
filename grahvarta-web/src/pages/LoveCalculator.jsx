import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import CompatibilityMeter from '../components/ui/CompatibilityMeter'
import { hashString, setPageMeta } from '../lib/demo'

function getInterpretation(score) {
  if (score >= 71) {
    return 'A wonderful match! There is strong natural chemistry here, with great potential for a lasting, joyful connection.'
  }
  if (score >= 41) {
    return 'A promising connection. With good communication and effort from both sides, this bond can grow steadily stronger.'
  }
  return 'Every connection has room to grow. Differences here can turn into strengths with patience and understanding.'
}

export default function LoveCalculator() {
  const [name, setName] = useState('')
  const [partner, setPartner] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    setPageMeta(
      'Love Calculator | GrahVarta',
      'Calculate a fun compatibility score between you and your partner based on your names.'
    )
  }, [])

  function handleCalculate(e) {
    e.preventDefault()
    if (!name.trim() || !partner.trim()) {
      toast.error('Please enter both names.')
      return
    }
    const seed = `${name.trim().toLowerCase()}::${partner.trim().toLowerCase()}`
    const score = hashString(seed) % 101
    setResult({ score, interpretation: getInterpretation(score) })
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Just for Fun"
        title="Love Calculator"
        subtitle="Enter two names to see a fun, demo compatibility score."
      />

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
              <Heart size={20} />
            </span>
            <p className="text-sm text-text-secondary">This is a fun demo tool — results are for entertainment only.</p>
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
            <button type="submit" className="btn-primary w-full mt-2">
              Calculate
            </button>
          </form>
        </Card>

        <Card className="flex flex-col items-center justify-center text-center gap-4">
          {result ? (
            <>
              <CompatibilityMeter percentage={result.score} label="Match" />
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs">{result.interpretation}</p>
            </>
          ) : (
            <p className="text-sm text-text-muted">Enter both names and hit calculate to see your result.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
