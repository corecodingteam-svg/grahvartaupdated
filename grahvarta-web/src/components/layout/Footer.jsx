import { Link } from 'react-router-dom'
import { Sparkles, Facebook, Instagram, Twitter, Youtube } from 'lucide-react'

const columns = [
  {
    heading: 'Astrologers',
    links: [
      { label: 'All Astrologers', to: '/astrologers' },
      { label: 'Vedic Astrology', to: '/astrologer/vedic' },
      { label: 'Tarot Reading', to: '/astrologer/tarot' },
      { label: 'Numerology', to: '/astrologer/numerology' },
      { label: 'Vastu Shastra', to: '/astrologer/vastu' },
    ],
  },
  {
    heading: 'Services',
    links: [
      { label: 'Free Kundli', to: '/kundli' },
      { label: 'Daily Horoscope', to: '/horoscope' },
      { label: 'Kundli Matching', to: '/kundli-matching' },
      { label: 'Panchang', to: '/panchang' },
      { label: 'Subh Muhurat', to: '/muhurat' },
      { label: 'Book a Puja', to: '/puja' },
      { label: 'Astrology Shop', to: '/shop' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Careers', to: '/careers' },
      { label: 'Blog', to: '/blog' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-16">
      <div className="container-page py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl bg-orange flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </span>
            <span className="text-lg font-bold">
              Grah<span className="text-orange">Varta</span>
            </span>
          </Link>
          <p className="text-text-secondary text-sm leading-relaxed">
            Your online astrology marketplace — connect with astrologers, explore kundli,
            horoscope, tarot and more. This is a demo product for illustration purposes.
          </p>
          <div className="flex items-center gap-3 mt-4">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <button
                key={i}
                type="button"
                aria-label="Social link (demo)"
                className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-orange transition-colors"
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.heading}>
            <h3 className="text-sm font-semibold text-text-primary mb-3">{col.heading}</h3>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-text-secondary hover:text-orange transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-muted text-center">
            &copy; {new Date().getFullYear()} GrahVarta. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <Link to="/privacy" className="hover:text-orange transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-orange transition-colors">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
