import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, Sparkles, ShoppingCart } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Astrologers', to: '/astrologers' },
  { label: 'Kundli', to: '/kundli' },
  { label: 'Horoscope', to: '/horoscope' },
  { label: 'Kundli Matching', to: '/kundli-matching' },
  { label: 'Tarot', to: '/tarot' },
  { label: 'Numerology', to: '/numerology' },
  { label: 'Vastu', to: '/vastu' },
  { label: 'Panchang', to: '/panchang' },
  { label: 'Muhurat', to: '/muhurat' },
  { label: 'Puja', to: '/puja' },
  { label: 'Shop', to: '/shop' },
]

export default function Header() {
  const [open, setOpen] = useState(false)
  const { totalItems } = useCart()

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="container-page flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="GrahVarta home">
          <span className="w-9 h-9 rounded-xl bg-orange flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            Grah<span className="text-orange">Varta</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto" aria-label="Primary">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-orange bg-orange/10' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Link
            to="/cart"
            className="relative p-2 rounded-xl hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
            aria-label={`Cart${totalItems > 0 ? ` (${totalItems} items)` : ''}`}
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-white text-[10px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
          <Link to="/astrologers" className="btn-primary !py-2 !px-4 text-sm">
            Talk to Astrologer
          </Link>
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <Link
            to="/cart"
            className="relative p-2 rounded-xl hover:bg-surface-light text-text-secondary"
            aria-label={`Cart${totalItems > 0 ? ` (${totalItems} items)` : ''}`}
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange text-white text-[10px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-surface-light"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-2 py-3 rounded-xl text-sm font-medium border-b border-divider last:border-b-0 ${
                    isActive ? 'text-orange' : 'text-text-secondary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/astrologers"
              onClick={() => setOpen(false)}
              className="btn-primary mt-4 w-full text-sm"
            >
              Talk to Astrologer
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
