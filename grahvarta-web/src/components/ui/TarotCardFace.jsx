import {
  Heart, Briefcase, Wallet, Compass, Flame, GitFork, Anchor, Sprout, Crown,
  Sparkle, CloudLightning, Milestone, Wheat, Footprints, KeyRound, Sparkles,
} from 'lucide-react'

const Icons = {
  Heart, Briefcase, Wallet, Compass, Flame, GitFork, Anchor, Sprout, Crown,
  Sparkle, CloudLightning, Milestone, Wheat, Footprints, KeyRound,
}

// Poster-style card art built entirely from SVG/CSS — ornate frame, corner
// numerals, radiant vignette and a title ribbon — rather than real deck scans,
// since this is an original invented deck (see data/tarot.js).
//
// Reversed cards flip only the center emblem, not the whole plate — flipping
// everything makes the numeral and title ribbon render upside down and
// unreadable, which defeats the point of a label.
export default function TarotCardFace({ card, reversed = false, size = 'md' }) {
  const Icon = Icons[card.icon] || Sparkles
  const iconSize = size === 'sm' ? 28 : 44

  return (
    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-lg">
      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.35),transparent_65%)]" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_2px,transparent_2px,transparent_10px)]" />

      {/* outer + inner frame lines */}
      <div className="absolute inset-[5px] rounded-xl border-2 border-white/50" />
      <div className="absolute inset-[9px] rounded-lg border border-white/30" />

      {/* corner ornaments */}
      <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rotate-45 bg-white/70" />
      <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rotate-45 bg-white/70" />
      <span className="absolute bottom-9 left-2.5 w-1.5 h-1.5 rotate-45 bg-white/70" />
      <span className="absolute bottom-9 right-2.5 w-1.5 h-1.5 rotate-45 bg-white/70" />

      {/* roman numeral */}
      <span className="absolute top-3 inset-x-0 text-center text-[10px] font-serif tracking-[0.3em] text-white/85">
        {card.numeral}
      </span>

      <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 ${reversed ? 'rotate-180' : ''}`}>
        <span className="w-8 h-px bg-white/50" />
        <span className="w-16 h-16 rounded-full border border-white/50 flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
          <Icon size={iconSize} className="text-white drop-shadow-sm" />
        </span>
        <span className="w-8 h-px bg-white/50" />
      </div>

      {reversed && (
        <span className="absolute top-8 right-2.5 text-[9px] font-semibold uppercase tracking-wide text-white/70 bg-black/25 rounded px-1.5 py-0.5">
          Reversed
        </span>
      )}

      {/* title ribbon */}
      <div className="absolute bottom-0 inset-x-0 bg-black/35 border-t border-white/25 py-2 text-center">
        <span className="text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] px-1">
          {card.name}
        </span>
      </div>
    </div>
  )
}
