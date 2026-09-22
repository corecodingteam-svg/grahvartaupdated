import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Sparkles, Heart, Briefcase, Wallet } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import TarotCardFace from '../components/ui/TarotCardFace'
import TarotCardBack from '../components/ui/TarotCardBack'
import { tarotCards } from '../data/tarot'
import { hashString, setPageMeta } from '../lib/demo'

const Icons = { Heart, Briefcase, Wallet }

const readingTypes = [
  {
    id: 'love',
    label: 'Love',
    icon: 'Heart',
    positions: ['Your Heart', 'Your Connection', 'Where It Is Heading'],
  },
  {
    id: 'career',
    label: 'Career',
    icon: 'Briefcase',
    positions: ['Current Path', 'Hidden Challenge', 'Likely Outcome'],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'Wallet',
    positions: ['Present Resources', 'Opportunity', 'Long-Term Result'],
  },
]

// 9 face-down spread slots to choose 3 cards from, mapped deterministically
// to entries in the tarot deck so the same slot always maps to the same card.
const SPREAD_SIZE = 9

export default function Tarot() {
  const [readingType, setReadingType] = useState(null)
  const [question, setQuestion] = useState('')
  const [spreadSeed, setSpreadSeed] = useState(0)
  const [picked, setPicked] = useState([])
  const [aiReading, setAiReading] = useState(null)
  const [loadingReading, setLoadingReading] = useState(false)
  const [readingError, setReadingError] = useState(false)

  useEffect(() => {
    setPageMeta(
      'Tarot Reading | GrahVarta',
      'Choose a Love, Career or Finance spread and draw three demo tarot cards for a fun, illustrative reading.'
    )
  }, [])

  const spreadSlots = useMemo(() => {
    return Array.from({ length: SPREAD_SIZE }, (_, i) => {
      const h = hashString(`tarot-slot-${spreadSeed}-${i}`)
      const card = tarotCards[h % tarotCards.length]
      const reversed = hashString(`tarot-orientation-${spreadSeed}-${i}`) % 10 < 3
      return { slot: i, card, reversed }
    })
  }, [spreadSeed])

  function handleSelectType(type) {
    setReadingType(type)
    setPicked([])
    setAiReading(null)
  }

  function handlePickSlot(slot) {
    if (picked.includes(slot) || picked.length >= 3) return
    setPicked((p) => [...p, slot])
  }

  function handleReset() {
    setReadingType(null)
    setQuestion('')
    setPicked([])
    setAiReading(null)
    setSpreadSeed((s) => s + 1)
  }

  function handleNewSpread() {
    setPicked([])
    setAiReading(null)
    setSpreadSeed((s) => s + 1)
  }

  const revealed = picked.length === 3

  const revealedCards = picked.map((slot, i) => {
    const entry = spreadSlots.find((s) => s.slot === slot)
    return {
      position: readingType?.positions[i],
      name: entry.card.name,
      orientation: entry.reversed ? 'reversed' : 'upright',
    }
  })

  useEffect(() => {
    if (!revealed || !readingType) return
    let cancelled = false
    setLoadingReading(true)
    setReadingError(false)

    fetch('/api/tarot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ readingType: readingType.id, question: question.trim(), cards: revealedCards }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('request failed'))))
      .then((data) => {
        if (!cancelled) setAiReading(data)
      })
      .catch(() => {
        if (!cancelled) setReadingError(true)
      })
      .finally(() => {
        if (!cancelled) setLoadingReading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, picked.join(','), spreadSeed])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Just for Fun"
        title="Tarot Reading"
        subtitle="Pick a spread, choose three cards, and get a fun demo interpretation."
      />

      {!readingType && (
        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl">
          {readingTypes.map((type) => {
            const Icon = Icons[type.icon] || Sparkles
            return (
              <button key={type.id} type="button" onClick={() => handleSelectType(type)} className="text-left">
                <Card className="flex flex-col items-center text-center gap-3 h-full hover:border-orange transition-colors cursor-pointer">
                  <span className="w-12 h-12 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{type.label}</h3>
                    <p className="text-xs text-text-secondary mt-1">3-card {type.label.toLowerCase()} spread</p>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      )}

      {readingType && !revealed && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-text-secondary">
              <span className="text-orange font-semibold">{readingType.label} Spread</span> — pick {3 - picked.length} more card{3 - picked.length === 1 ? '' : 's'} from below.
            </p>
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-orange">
              <RotateCcw size={14} /> Change Reading Type
            </button>
          </div>

          <div className="max-w-md">
            <label htmlFor="tarot-question" className="block text-xs font-medium text-text-secondary mb-1.5">
              What&apos;s on your mind? <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              id="tarot-question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`e.g. What should I focus on for my ${readingType.label.toLowerCase()}?`}
              className="input-field"
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-3 xs:grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 max-w-3xl">
            {spreadSlots.map(({ slot }) => {
              const order = picked.indexOf(slot)
              const isPicked = order !== -1
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handlePickSlot(slot)}
                  disabled={isPicked || picked.length >= 3}
                  className={`relative aspect-[2/3] rounded-xl transition-all ${
                    isPicked ? '-translate-y-1 shadow-lg shadow-orange/20 ring-2 ring-orange' : 'hover:-translate-y-0.5'
                  } ${picked.length >= 3 && !isPicked ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <TarotCardBack active={isPicked} />
                  {isPicked && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orange text-white text-[11px] font-bold flex items-center justify-center">
                      {order + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {readingType && revealed && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-text-secondary">
              Your <span className="text-orange font-semibold">{readingType.label}</span> reading
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={handleNewSpread} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-orange">
                <RotateCcw size={14} /> New Reading
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            {picked.map((slot, i) => {
              const entry = spreadSlots.find((s) => s.slot === slot)
              const { card, reversed } = entry
              const aiCard = aiReading?.cards?.find((c) => c.position === readingType.positions[i])
              const meaning = aiCard?.interpretation || (reversed ? card.reversed : card.upright)
              return (
                <Card key={slot} className="flex flex-col gap-4 animate-fade-in">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange">{readingType.positions[i]}</p>
                  <TarotCardFace card={card} reversed={reversed} />
                  <div>
                    <p className="font-semibold text-sm">
                      {card.name} {reversed && <span className="text-text-muted font-normal">(Reversed)</span>}
                    </p>
                    {loadingReading && !aiReading ? (
                      <p className="text-sm text-text-muted mt-1.5 leading-relaxed animate-pulse">Interpreting…</p>
                    ) : (
                      <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{meaning}</p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {(aiReading?.summary || loadingReading) && (
            <Card className="flex flex-col gap-3 animate-fade-in">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange flex items-center gap-1.5">
                <Sparkles size={14} /> Overall Reading
              </p>
              {loadingReading && !aiReading ? (
                <p className="text-sm text-text-muted leading-relaxed animate-pulse">Weaving your cards into a reading…</p>
              ) : (
                <>
                  <p className="text-sm text-text-secondary leading-relaxed">{aiReading.summary}</p>
                  {aiReading.advice && (
                    <p className="text-sm text-gold font-medium leading-relaxed">✦ {aiReading.advice}</p>
                  )}
                </>
              )}
            </Card>
          )}

          {readingError && (
            <p className="text-xs text-text-muted">
              Showing offline card meanings — live reading is temporarily unavailable.
            </p>
          )}

          <button type="button" onClick={handleReset} className="btn-primary w-fit self-center mt-2">
            Start a New Reading
          </button>
        </div>
      )}
    </div>
  )
}
