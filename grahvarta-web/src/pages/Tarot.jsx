import { useEffect, useMemo, useState } from 'react'
import {
  RotateCcw, Sparkles, Heart, Briefcase, Wallet,
  Compass, Flame, GitFork, Anchor, Sprout, Crown,
  Sparkle, CloudLightning, Milestone, Wheat, Footprints, KeyRound,
} from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import { tarotCards } from '../data/tarot'
import { hashString, setPageMeta } from '../lib/demo'

// Explicit map (rather than `import * as Icons`) keeps this page's bundle
// limited to only the icons it actually uses.
const Icons = {
  Heart, Briefcase, Wallet,
  Compass, Flame, GitFork, Anchor, Sprout, Crown,
  Sparkle, CloudLightning, Milestone, Wheat, Footprints, KeyRound,
}

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
  const [spreadSeed, setSpreadSeed] = useState(0)
  const [picked, setPicked] = useState([])

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
  }

  function handlePickSlot(slot) {
    if (picked.includes(slot) || picked.length >= 3) return
    setPicked((p) => [...p, slot])
  }

  function handleReset() {
    setReadingType(null)
    setPicked([])
    setSpreadSeed((s) => s + 1)
  }

  function handleNewSpread() {
    setPicked([])
    setSpreadSeed((s) => s + 1)
  }

  const revealed = picked.length === 3

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
                  className={`relative aspect-[2/3] rounded-xl border-2 flex items-center justify-center transition-all ${
                    isPicked
                      ? 'border-orange bg-gradient-to-br from-orange/30 to-gold/30 -translate-y-1 shadow-lg shadow-orange/20'
                      : 'border-border bg-surface hover:border-orange/60 hover:-translate-y-0.5'
                  } ${picked.length >= 3 && !isPicked ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Sparkles size={20} className={isPicked ? 'text-orange' : 'text-text-muted'} />
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
              const Icon = Icons[card.icon] || Sparkles
              const meaning = reversed ? card.reversed : card.upright
              return (
                <Card key={slot} className="flex flex-col gap-4 animate-fade-in">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange">{readingType.positions[i]}</p>
                  <div
                    className={`aspect-[2/3] rounded-xl bg-gradient-to-br ${card.gradient} flex flex-col items-center justify-center gap-3 ${reversed ? 'rotate-180' : ''}`}
                  >
                    <Icon size={36} className="text-white/90" />
                    <span className={`text-white font-semibold text-sm px-2 text-center ${reversed ? 'rotate-180' : ''}`}>{card.name}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {card.name} {reversed && <span className="text-text-muted font-normal">(Reversed)</span>}
                    </p>
                    <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">{meaning}</p>
                  </div>
                </Card>
              )
            })}
          </div>

          <button type="button" onClick={handleReset} className="btn-primary w-fit self-center mt-2">
            Start a New Reading
          </button>
        </div>
      )}

      <p className="text-xs text-text-muted mt-8">
        This is a fun demo tool — cards and interpretations are for entertainment purposes only.
      </p>
    </div>
  )
}
