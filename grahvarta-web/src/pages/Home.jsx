import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageCircle, Phone, Sun, ScrollText, Heart, Gem, Briefcase, UserRound,
  TrendingUp, HeartPulse, Sparkles, Flame, Hash, Home as HomeIcon,
  HeartHandshake, Orbit, CalendarDays, Clock,
  ShieldCheck, Signal, Wifi, BatteryFull, ChevronLeft, BadgeCheck, Send,
} from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import AstrologerCard from '../components/astrologer/AstrologerCard'
import TestimonialSlider from '../components/ui/TestimonialSlider'
import { astrologers } from '../data/astrologers'
import { categories } from '../data/categories'
import { services, zodiacSigns, testimonials } from '../data/services'
import { blogArticles } from '../data/blog'
import { demoOnly, setPageMeta } from '../lib/demo'

const categoryIcons = { Heart, Gem, Briefcase, UserRound, TrendingUp, HeartPulse }
const serviceIcons = {
  ScrollText, Sun, Sparkles, Flame, Hash, Home: HomeIcon, HeartHandshake, Orbit, CalendarDays, Clock, Heart,
}

const quickActions = [
  { label: 'Chat with Astrologer', icon: MessageCircle, to: '/astrologers' },
  { label: 'Call Astrologer', icon: Phone, to: '/astrologers' },
  { label: 'Daily Horoscope', icon: Sun, to: '/horoscope' },
  { label: 'Free Kundli', icon: ScrollText, to: '/kundli' },
]

export default function Home() {
  useEffect(() => {
    setPageMeta(
      'GrahVarta — Talk to Astrologers Online | Kundli, Horoscope & More',
      'Connect with verified astrologers for chat and call consultations. Explore free kundli, daily horoscope, tarot, numerology, vastu and more on GrahVarta.'
    )
  }, [])

  const liveAstrologers = useMemo(
    () => astrologers.filter((a) => a.online).slice(0, 8),
    []
  )

  const blogTeasers = useMemo(() => blogArticles.slice(0, 4), [])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-orange/10 via-transparent to-gold/10" aria-hidden="true" />
        <div className="container-page relative py-14 sm:py-20 lg:py-28 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="badge-orange mb-4">
              <Sparkles size={12} /> Trusted online astrology platform
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
              Find clarity with <span className="text-orange">verified astrologers</span>,
              anytime, anywhere
            </h1>
            <p className="text-text-secondary text-base sm:text-lg mb-8 max-w-xl">
              Chat or call expert astrologers for guidance on love, career, marriage and more.
              Explore free kundli, daily horoscope, tarot and personalised remedies — all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/astrologers" className="btn-primary">
                <MessageCircle size={18} /> Talk to an Astrologer
              </Link>
              <Link to="/kundli" className="btn-outline">
                Get Free Kundli
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:flex justify-center">
            <div className="w-72 h-72 rounded-full bg-orange/20 blur-3xl absolute" aria-hidden="true" />
            <div className="relative w-64 h-64 rounded-full border-4 border-orange/30 flex items-center justify-center animate-fade-in">
              <div className="w-48 h-48 rounded-full border-4 border-gold/40 flex items-center justify-center">
                <Sparkles size={72} className="text-orange" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="container-page py-10 sm:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              className="card flex flex-col items-center text-center gap-2 py-6 hover:border-orange/50 transition-colors"
            >
              <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
                <Icon size={20} />
              </span>
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Live astrologers */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading
          eyebrow="Available Now"
          title="Live Astrologers"
          subtitle="Connect instantly with astrologers who are online right now."
          actionLabel="View all"
          actionTo="/astrologers"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {liveAstrologers.map((a) => (
            <AstrologerCard key={a.id} astrologer={a} />
          ))}
        </div>
      </section>

      {/* Browse by category */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading eyebrow="Explore" title="Browse by Category" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat.icon] || Sparkles
            return (
              <Link
                key={cat.id}
                to={`/astrologers?category=${cat.id}`}
                className="card flex flex-col items-center text-center gap-2 py-6 hover:border-orange/50 transition-colors"
              >
                <span className="w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                  <Icon size={20} />
                </span>
                <span className="text-xs sm:text-sm font-medium">{cat.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Services grid */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading eyebrow="What we offer" title="Our Services" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {services.map((service) => {
            const Icon = serviceIcons[service.icon] || Sparkles
            return (
              <Link
                key={service.id}
                to={service.path}
                className="card flex flex-col items-center text-center gap-2 py-6 hover:border-orange/50 transition-colors"
              >
                <span className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center text-orange">
                  <Icon size={20} />
                </span>
                <span className="text-xs sm:text-sm font-medium">{service.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Daily horoscope strip */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading eyebrow="Zodiac" title="Daily Horoscope" subtitle="Tap your sign to see today's outlook." />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {zodiacSigns.map((sign) => (
            <Link
              key={sign.id}
              to={`/horoscope/${sign.id}`}
              className="card flex flex-col items-center text-center gap-1 py-5 hover:border-gold/50 transition-colors"
            >
              <span className="text-2xl text-gold" aria-hidden="true">{sign.symbol}</span>
              <span className="text-xs font-medium">{sign.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-page py-10 sm:py-14">
        <SectionHeading eyebrow="Reviews" title="What our users say" />
        <TestimonialSlider items={testimonials} />
      </section>

      {/* App download */}
      <section className="container-page py-10 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-orange/10 via-transparent to-gold/10" aria-hidden="true" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center p-8 sm:p-12">
            <div>
              <p className="text-orange text-xs sm:text-sm font-semibold uppercase tracking-wide mb-3">
                The GrahVarta App
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
                Astrology made simpler, and available to you <span className="text-orange">24&times;7</span>.
              </h2>
              <p className="text-text-secondary text-sm sm:text-base mb-6 max-w-md">
                Connect with an astrologer anytime, and find the solutions to all your love, marriage, career and
                finance related problems instantly.
              </p>
              <div className="flex flex-col gap-3 mb-7">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-orange shrink-0">
                    <MessageCircle size={16} />
                  </span>
                  <span className="text-sm text-text-secondary">Instant chats, notifications, and alerts</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-orange shrink-0">
                    <ShieldCheck size={16} />
                  </span>
                  <span className="text-sm text-text-secondary">Secure payments, UPI, cards &amp; wallet, all encrypted</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => demoOnly('App download coming soon.')}
                  aria-label="Download on the App Store"
                  className="w-[168px] h-[46px] rounded-xl overflow-hidden bg-black hover:opacity-90 transition-opacity shrink-0"
                  style={{
                    backgroundImage: 'url(/badges/app-store.webp)',
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
                <button
                  type="button"
                  onClick={() => demoOnly('App download coming soon.')}
                  aria-label="Get it on Google Play"
                  className="w-[168px] h-[46px] rounded-xl overflow-hidden bg-black hover:opacity-90 transition-opacity shrink-0"
                  style={{
                    backgroundImage: 'url(/badges/google-play.png)',
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              </div>
            </div>

            <div className="relative hidden lg:flex justify-center">
              <div className="w-72 h-72 rounded-full bg-orange/20 blur-3xl absolute" aria-hidden="true" />
              <div className="relative w-72 h-[480px] rounded-[2.5rem] border-8 border-card bg-white shadow-2xl overflow-hidden text-slate-900">
                <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-10">
                  <div className="w-28 h-5 bg-card rounded-b-2xl" />
                </div>

                <div className="flex items-center justify-between px-5 pt-3 pb-1 text-[11px] font-semibold">
                  <span>9:41</span>
                  <div className="flex items-center gap-1 text-slate-700">
                    <Signal size={12} />
                    <Wifi size={12} />
                    <BatteryFull size={14} />
                  </div>
                </div>

                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100">
                  <ChevronLeft size={18} className="text-slate-500 shrink-0" />
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-orange to-gold flex items-center justify-center text-white text-xs font-bold ring-2 ring-success/50 shrink-0">
                    AK
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold flex items-center gap-1 truncate">
                      Acharya Kavita <BadgeCheck size={13} className="text-success shrink-0" />
                    </p>
                    <p className="text-[11px] text-slate-500">Online &middot; &#8377;25/min</p>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-white shrink-0">
                    <Phone size={13} />
                  </span>
                </div>

                <div className="px-4 py-4 flex flex-col gap-3 bg-[#faf7f2] min-h-[260px]">
                  <span className="mx-auto text-[10px] text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-100">
                    Today &middot; 9:38 AM
                  </span>
                  <div className="ml-auto max-w-[80%] bg-gold/90 text-slate-900 text-xs leading-relaxed rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                    When will I get married? My family keeps asking me.
                  </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 flex items-center gap-2 px-3 py-3 border-t border-slate-100 bg-white">
                  <div className="flex-1 h-9 rounded-full bg-slate-100 px-3.5 flex items-center text-[11px] text-slate-400">
                    Type a message&hellip;
                  </div>
                  <span className="w-9 h-9 rounded-full bg-orange flex items-center justify-center text-white shrink-0">
                    <Send size={14} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog teasers */}
      <section className="container-page py-10 sm:py-16">
        <SectionHeading eyebrow="Learn" title="Astrology Insights" actionLabel="View all" actionTo="/blog" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {blogTeasers.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="card text-left flex flex-col gap-2 hover:border-orange/50 transition-colors"
            >
              <span className="badge-gold w-fit">{post.category}</span>
              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
