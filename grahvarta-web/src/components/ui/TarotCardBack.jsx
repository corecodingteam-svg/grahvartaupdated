import { Sparkles } from 'lucide-react'

// Decorative face-down card back — a repeating diamond lattice with a
// central medallion, evoking a classic tarot deck back without copying one.
export default function TarotCardBack({ active = false }) {
  return (
    <div
      className={`relative w-full h-full rounded-xl overflow-hidden transition-colors ${
        active ? 'bg-gradient-to-br from-orange to-gold' : 'bg-surface'
      }`}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 10px), ' +
            'repeating-linear-gradient(-45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 10px)',
        }}
      />
      <div className={`absolute inset-[6px] rounded-lg border ${active ? 'border-white/50' : 'border-border'}`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`w-9 h-9 rounded-full border flex items-center justify-center ${
            active ? 'border-white/60 bg-white/10' : 'border-border bg-card'
          }`}
        >
          <Sparkles size={16} className={active ? 'text-white' : 'text-text-muted'} />
        </span>
      </div>
    </div>
  )
}
