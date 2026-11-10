import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react'

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
    twoColumn: true,
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
      { label: 'Blog', to: '/blog' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="container-page py-8 grid grid-cols-2 lg:grid-cols-[1.3fr_1fr_1.5fr_1fr] gap-x-8 gap-y-6">
        <div className="col-span-2 lg:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-2">
            <img src="/brand/logo-96.png" srcSet="/brand/logo-96.png 1x, /brand/logo-192.png 2x" alt="" width="40" height="40" className="w-10 h-10 shrink-0" />
            <span translate="no" className="text-lg font-bold">
              Grah<span className="text-orange">Varta</span>
            </span>
          </Link>
          <p className="text-text-secondary text-sm leading-relaxed">
            Your online astrology marketplace — connect with astrologers, explore kundli,
            horoscope, tarot and more. This is a demo product for illustration purposes.
          </p>
          <div className="flex items-center gap-2 mt-3">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <button
                key={i}
                type="button"
                aria-label="Social link (demo)"
                className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center text-text-secondary hover:text-orange transition-colors"
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.heading} className={col.twoColumn ? 'col-span-2 order-last lg:col-span-1 lg:order-none' : undefined}>
            <h3 className="text-sm font-semibold text-text-primary mb-2">{col.heading}</h3>
            <ul className={col.twoColumn ? 'grid grid-cols-2 gap-x-6 gap-y-1.5' : 'flex flex-col gap-1.5'}>
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
        <div className="container-page py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-muted text-center">
            &copy; {new Date().getFullYear()} GrahVarta. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <Link to="/privacy" className="hover:text-orange transition-colors">Privacy Policy</Link>
            <Link to="/delete-account" className="hover:text-orange transition-colors">Delete Account</Link>
            <Link to="/terms" className="hover:text-orange transition-colors">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
