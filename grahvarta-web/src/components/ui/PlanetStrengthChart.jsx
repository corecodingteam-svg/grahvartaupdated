// Horizontal bar chart of each graha's strength (0-100), hand-rolled to match
// CompatibilityMeter's style rather than pulling in a charting dependency.
export default function PlanetStrengthChart({ planets = [] }) {
  return (
    <div className="flex flex-col gap-3">
      {planets.map((p) => (
        <div key={p.key} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs font-medium text-text-secondary">{p.label}</span>
          <div className="flex-1 h-2.5 rounded-full bg-surface-light overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange to-gold transition-all duration-700 ease-out"
              style={{ width: `${p.strength}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-xs font-semibold text-text-primary text-right">{p.strength}</span>
          <span
            className={`w-4 shrink-0 text-[10px] font-bold text-error ${p.retrograde ? '' : 'invisible'}`}
            title="Retrograde"
          >
            R
          </span>
        </div>
      ))}
    </div>
  )
}
