import { useEffect, useState } from 'react'
import { Hash, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { hashString, setPageMeta } from '../lib/demo'

const lifePathBlurbs = {
  1: 'A natural leader — independent, driven and full of original ideas. You do best when carving your own path.',
  2: 'A peacemaker at heart — diplomatic, sensitive and cooperative, with a gift for bringing people together.',
  3: 'Expressive and creative — communication, art and joy come naturally, and you inspire others with your warmth.',
  4: 'Grounded and hardworking — you build things that last through discipline, patience and careful planning.',
  5: 'Freedom-loving and adaptable — change, travel and new experiences keep you energised and growing.',
  6: 'A natural caretaker — responsible, loving and community-minded, often the anchor for family and friends.',
  7: 'Thoughtful and introspective — drawn to knowledge, spirituality and understanding the deeper "why" of things.',
  8: 'Ambitious and capable — strong instincts for business and material success, with a drive to achieve.',
  9: 'Compassionate and idealistic — a humanitarian streak that wants to leave the world a little better.',
  11: 'A master number of intuition and inspiration — highly perceptive, with the potential to uplift others deeply.',
  22: 'The "master builder" — able to turn big dreams into real, lasting achievements that benefit many.',
  33: 'The "master teacher" — a rare path of selfless guidance, healing and compassion for others.',
}

const nameBlurbs = {
  1: 'Your name carries the energy of individuality and initiative — you tend to stand out and lead by example.',
  2: 'Your name reflects harmony and partnership — you shine when collaborating closely with others.',
  3: 'Your name carries a creative, sociable energy — self-expression comes easily to you.',
  4: 'Your name reflects stability and reliability — people trust you to follow through.',
  5: 'Your name carries a restless, adventurous energy — variety keeps you engaged and inspired.',
  6: 'Your name reflects warmth and responsibility — you naturally look after those around you.',
  7: 'Your name carries a reflective, analytical energy — you seek meaning beneath the surface.',
  8: 'Your name reflects ambition and organisation — you have a natural head for goals and structure.',
  9: 'Your name carries a generous, big-picture energy — you are drawn to causes larger than yourself.',
}

function reduceToLifePath(digitsStr) {
  let num = digitsStr.split('').reduce((sum, d) => sum + Number(d), 0)
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = String(num)
      .split('')
      .reduce((sum, d) => sum + Number(d), 0)
  }
  return num
}

function computeLifePathNumber(dob) {
  // dob is "YYYY-MM-DD" from the date input
  const digits = dob.replace(/-/g, '')
  return reduceToLifePath(digits)
}

function computeNameNumber(name) {
  const h = hashString(name.trim().toLowerCase())
  return (h % 9) + 1
}

export default function Numerology() {
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    setPageMeta(
      'Numerology Calculator | GrahVarta',
      'Discover your Life Path Number and Name Number with our free demo numerology calculator.'
    )
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !dob) {
      toast.error('Please enter your name and date of birth.')
      return
    }
    const lifePath = computeLifePathNumber(dob)
    const nameNumber = computeNameNumber(name)
    setResult({ lifePath, nameNumber })
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
            <p className="text-sm text-text-secondary">This is a demo tool — results are for illustration only.</p>
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
            <button type="submit" className="btn-primary w-full mt-2">
              Calculate My Numbers
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
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">{lifePathBlurbs[result.lifePath]}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-orange-light flex items-center justify-center text-2xl font-bold text-white shrink-0">
                {result.nameNumber}
              </span>
              <div>
                <h3 className="font-semibold">Name / Destiny Number</h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">{nameBlurbs[result.nameNumber]}</p>
              </div>
            </Card>
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
