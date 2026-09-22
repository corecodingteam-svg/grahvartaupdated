// Donut chart of how the 9 grahas are distributed across the four elements —
// same hand-rolled SVG approach as CompatibilityMeter, kept dependency-free.
const elementColors = {
  Fire: '#E8762A',
  Earth: '#43A047',
  Air: '#3A6EA5',
  Water: '#2FA6A0',
}

export default function ElementBalanceChart({ balance = {} }) {
  const total = Object.values(balance).reduce((sum, n) => sum + n, 0) || 1
  const radius = 44
  const circumference = 2 * Math.PI * radius

  let offsetAcc = 0
  const segments = Object.entries(balance).map(([element, count]) => {
    const fraction = count / total
    const seg = {
      element,
      count,
      dasharray: `${fraction * circumference} ${circumference}`,
      dashoffset: -offsetAcc * circumference,
    }
    offsetAcc += fraction
    return seg
  })

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 120 120" className="w-24 h-24 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(var(--color-border))" strokeWidth="14" />
        {segments.map((s) =>
          s.count > 0 ? (
            <circle
              key={s.element}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={elementColors[s.element]}
              strokeWidth="14"
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ) : null
        )}
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((s) => (
          <span key={s.element} className="inline-flex items-center gap-2 text-xs text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: elementColors[s.element] }} />
            {s.element} <span className="text-text-muted">· {s.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
