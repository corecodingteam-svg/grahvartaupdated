// Segmented horizontal timeline of upcoming Vimshottari Mahadasha periods,
// starting from "now" (age 0 on this chart = today) through the rest of the
// 9-lord cycle. The current period is highlighted.
const lordColors = {
  Sun: '#E8762A',
  Moon: '#D4A843',
  Mars: '#E53935',
  Rahu: '#6B4E9E',
  Jupiter: '#43A047',
  Saturn: '#3A6EA5',
  Mercury: '#2FA6A0',
  Ketu: '#8A8A8A',
  Venus: '#D46AA0',
}

export default function DashaTimeline({ segments = [], totalYears = 0 }) {
  if (!segments.length || !totalYears) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full h-8 rounded-xl overflow-hidden border border-border">
        {segments.map((s) => (
          <div
            key={`${s.lord}-${s.startAge}`}
            className={`h-full flex items-center justify-center text-[10px] font-semibold text-white/90 ${
              s.current ? 'ring-2 ring-inset ring-white/70' : ''
            }`}
            style={{ width: `${((s.endAge - s.startAge) / totalYears) * 100}%`, background: lordColors[s.lord] || '#666' }}
            title={`${s.lord} — ${s.startAge.toFixed(1)}–${s.endAge.toFixed(1)} yrs from now`}
          >
            {(s.endAge - s.startAge) / totalYears > 0.08 ? s.lord : ''}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <span key={`legend-${s.lord}-${s.startAge}`} className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: lordColors[s.lord] || '#666' }} />
            {s.lord} {s.current && <span className="text-orange font-semibold">(current)</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
