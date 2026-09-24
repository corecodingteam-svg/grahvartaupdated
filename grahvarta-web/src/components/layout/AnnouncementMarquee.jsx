import { Link } from 'react-router-dom'

const messages = [
  { text: 'Chat, Call or Video with verified astrologers', to: '/astrologers' },
  { text: 'Get your Kundli in seconds', to: '/kundli' },
  { text: "Today's Horoscope for all 12 signs", to: '/horoscope' },
  { text: 'Match Kundlis before you decide', to: '/kundli-matching' },
  { text: 'Daily Panchang & auspicious Muhurat', to: '/panchang' },
  { text: 'Discover your Tarot & Numerology insights', to: '/tarot' },
]

function Track({ hidden }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {messages.map((m) => (
        <li key={m.to} className="flex items-center">
          <Link
            to={m.to}
            tabIndex={hidden ? -1 : undefined}
            className="px-6 text-xs sm:text-sm font-medium text-white hover:underline whitespace-nowrap"
          >
            {m.text}
          </Link>
          <span className="text-white/60 text-xs" aria-hidden="true">✦</span>
        </li>
      ))}
    </ul>
  )
}

export default function AnnouncementMarquee() {
  return (
    <div
      className="group overflow-hidden bg-gradient-to-r from-orange-dark via-orange to-orange-light py-2"
      role="region"
      aria-label="Highlights"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <Track />
        <Track hidden />
      </div>
    </div>
  )
}
