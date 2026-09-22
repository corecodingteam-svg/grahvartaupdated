// Original animated zodiac-wheel loader — a slowly spinning ring of the 12
// zodiac glyphs around a pulsing radial "sun", built entirely in SVG/CSS.
// Not a copy of any stock asset; matches the site's own orange/gold palette.
const zodiacSymbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']

export default function ZodiacLoader({ size = 140, label = 'Loading' }) {
  const center = size / 2
  const outerRadius = size * 0.46
  const innerRadius = size * 0.34
  const symbolRadius = size * 0.4

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="status" aria-label={label}>
      {/* ambient glow behind the wheel */}
      <div className="absolute inset-0 rounded-full bg-orange/25 blur-2xl animate-pulse" aria-hidden="true" />

      {/* rotating ring: circles, spokes and zodiac glyphs */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 animate-[spin_16s_linear_infinite]"
        aria-hidden="true"
      >
        <circle cx={center} cy={center} r={outerRadius} fill="none" className="stroke-gold/40" strokeWidth="1" />
        <circle cx={center} cy={center} r={innerRadius} fill="none" className="stroke-gold/40" strokeWidth="1" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = ((i * 30 - 90) * Math.PI) / 180
          const x1 = center + Math.cos(angle) * innerRadius
          const y1 = center + Math.sin(angle) * innerRadius
          const x2 = center + Math.cos(angle) * outerRadius
          const y2 = center + Math.sin(angle) * outerRadius
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-gold/30" strokeWidth="1" />
        })}
        {zodiacSymbols.map((sym, i) => {
          const angle = ((i * 30 - 90) * Math.PI) / 180
          const x = center + Math.cos(angle) * symbolRadius
          const y = center + Math.sin(angle) * symbolRadius
          return (
            <text
              key={sym}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-gold font-semibold"
              style={{ fontSize: size * 0.09 }}
            >
              {sym}
            </text>
          )
        })}
      </svg>

      {/* radiant sun rays, counter-rotating slower for a shimmer effect */}
      <div
        className="absolute inset-0 animate-[spin_10s_linear_infinite_reverse] opacity-60"
        style={{
          background:
            'repeating-conic-gradient(from 0deg, rgba(212,168,67,0.35) 0deg 4deg, transparent 4deg 30deg)',
          borderRadius: '9999px',
          maskImage: 'radial-gradient(circle, black 30%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 62%)',
        }}
        aria-hidden="true"
      />

      {/* pulsing sun core */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-full bg-gradient-to-br from-gold via-orange to-orange-dark shadow-lg animate-pulse"
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      </div>

      <span className="sr-only">{label}…</span>
    </div>
  )
}
