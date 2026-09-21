// Shared visual meter for compatibility-style percentages (Love Calculator,
// Kundli Matching) so both features feel consistent.
export default function CompatibilityMeter({ percentage = 0, label, className = '' }) {
  const clamped = Math.max(0, Math.min(100, percentage))

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative w-40 h-40 sm:w-48 sm:h-48">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#2A2A2A" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="url(#compat-gradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52}
            strokeDashoffset={2 * Math.PI * 52 * (1 - clamped / 100)}
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="compat-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E8762A" />
              <stop offset="100%" stopColor="#D4A843" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-text-primary">{clamped}%</span>
          {label && <span className="text-xs text-text-secondary mt-1">{label}</span>}
        </div>
      </div>
    </div>
  )
}
