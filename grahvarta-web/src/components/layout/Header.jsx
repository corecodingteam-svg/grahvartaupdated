import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, X, Sparkles, ShoppingCart, Sun, Moon, ChevronDown,
  ScrollText, HeartHandshake, Hash, Home as HomeIcon, CalendarDays, Clock, UserRound, LogOut,
} from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useOpenLogin } from '../../context/RequireAuthContext'
import LanguageSwitcher from './LanguageSwitcher'

const primaryLinks = [
  { label: 'Home', to: '/' },
  { label: 'Astrologers', to: '/astrologers' },
]

const toolLinks = [
  { label: 'Kundli', to: '/kundli', icon: ScrollText },
  { label: 'Kundli Matching', to: '/kundli-matching', icon: HeartHandshake },
  { label: 'Horoscope', to: '/horoscope', icon: Sun },
  { label: 'Tarot', to: '/tarot', icon: Sparkles },
  { label: 'Numerology', to: '/numerology', icon: Hash },
  { label: 'Vastu', to: '/vastu', icon: HomeIcon },
  { label: 'Panchang', to: '/panchang', icon: CalendarDays },
  { label: 'Muhurat', to: '/muhurat', icon: Clock },
]

const trailingLinks = [
  { label: 'Puja', to: '/puja' },
  { label: 'Shop', to: '/shop' },
]

const navLinkClass = ({ isActive }) =>
  `px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
    isActive ? 'text-orange bg-orange/10' : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
  }`

function ToolsDropdown() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const location = useLocation()
  const isToolsActive = toolLinks.some((l) => location.pathname.startsWith(l.to))

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
          isToolsActive || open
            ? 'text-orange bg-orange/10'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
        }`}
      >
        Tools
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-2 w-[420px] p-3 rounded-2xl border border-border bg-card shadow-xl grid grid-cols-2 gap-1 animate-fade-in"
        >
          {toolLinks.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center text-orange shrink-0">
                <Icon size={15} />
              </span>
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountMenu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full bg-orange/10 flex items-center justify-center text-orange font-semibold text-sm shrink-0"
        aria-label={`Account menu for ${user.name}`}
      >
        {user.name?.[0]?.toUpperCase() || <UserRound size={16} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 p-1.5 rounded-2xl border border-border bg-card shadow-xl animate-fade-in"
        >
          <p className="px-3 py-2 text-sm font-medium truncate border-b border-divider mb-1">{user.name}</p>
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
          >
            <UserRound size={15} /> My Account
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-error hover:bg-error/10 transition-colors"
          >
            <LogOut size={15} /> Log Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const { totalItems } = useCart()
  const { isLight, toggleTheme } = useTheme()
  const { isAuthenticated, user, logout } = useAuth()
  const openLogin = useOpenLogin()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
      <div className="container-page flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="GrahVarta home">
          <span className="w-9 h-9 rounded-xl bg-orange flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </span>
          <span translate="no" className="text-lg font-bold tracking-tight">
            Grah<span className="text-orange">Varta</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {primaryLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
          <ToolsDropdown />
          {trailingLinks.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
            aria-label={isLight ? 'Switch to dark theme' : 'Switch to day theme'}
          >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Link
            to="/cart"
            className="relative p-2 rounded-xl hover:bg-surface-light text-text-secondary hover:text-text-primary transition-colors"
            aria-label={totalItems > 0 ? `Cart (${totalItems} items)` : 'Cart'}
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
          {isAuthenticated && user ? (
            <AccountMenu />
          ) : (
            <button
              type="button"
              onClick={() => openLogin()}
              className="px-3 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-light transition-colors"
            >
              Log In
            </button>
          )}
        </div>

        <div className="lg:hidden flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-surface-light text-text-secondary"
            aria-label={isLight ? 'Switch to dark theme' : 'Switch to day theme'}
          >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <Link
            to="/cart"
            className="relative p-2 rounded-xl hover:bg-surface-light text-text-secondary"
            aria-label={totalItems > 0 ? `Cart (${totalItems} items)` : 'Cart'}
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
        <div className="lg:hidden border-t border-border bg-background max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `px-2 py-3 rounded-xl text-sm font-medium border-b border-divider ${
                    isActive ? 'text-orange' : 'text-text-secondary'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <p className="px-2 pt-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">
              Astrology Tools
            </p>
            {toolLinks.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2 py-3 rounded-xl text-sm font-medium border-b border-divider ${
                    isActive ? 'text-orange' : 'text-text-secondary'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" /> {label}
              </NavLink>
            ))}

            {trailingLinks.map((link) => (
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

            <div className="mt-3 border-t border-divider pt-2">
              <LanguageSwitcher inline />
            </div>

            <Link
              to="/astrologers"
              onClick={() => setOpen(false)}
              className="btn-primary mt-4 w-full text-sm"
            >
              Talk to Astrologer
            </Link>

            {isAuthenticated && user ? (
              <>
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-2 btn-outline mt-3 w-full text-sm"
                >
                  <UserRound size={16} /> My Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    setOpen(false)
                    navigate('/')
                  }}
                  className="inline-flex items-center justify-center gap-2 mt-3 w-full text-sm text-error py-2"
                >
                  <LogOut size={16} /> Log Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  openLogin()
                }}
                className="btn-outline mt-3 w-full text-sm"
              >
                Log In
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
