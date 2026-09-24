// A real photo when the astrologer has one, otherwise an initials badge —
// never a fake stock placeholder photo standing in for a real person.
export default function Avatar({ src, name, size = 64, rounded = 'rounded-xl', className = '', online }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`w-full h-full object-cover border border-border ${rounded}`}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-orange to-gold text-white font-bold ${rounded}`}
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute -bottom-1 -right-1 rounded-full border-2 border-card ${online ? 'bg-success' : 'bg-text-muted'}`}
          style={{ width: Math.max(10, size * 0.22), height: Math.max(10, size * 0.22) }}
          aria-label={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  )
}
