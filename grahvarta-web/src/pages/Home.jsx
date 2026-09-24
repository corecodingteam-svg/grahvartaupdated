import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageCircle, Phone, Video, Sun, ScrollText, Heart, Gem, Briefcase, UserRound,
  TrendingUp, HeartPulse, Sparkles, Flame, Hash, Home as HomeIcon,
  HeartHandshake, Orbit, CalendarDays, Clock, ArrowRight, Eye, BadgeCheck, Wallet, Lock,
  ShieldCheck, Signal, Wifi, BatteryFull, ChevronLeft, Send,
} from 'lucide-react'
import { AstrologerCardSkeleton } from '../components/ui/Skeleton'
import Reveal from '../components/ui/Reveal'
import SectionHeading from '../components/ui/SectionHeading'
import AstrologerCard from '../components/astrologer/AstrologerCard'
import TestimonialSlider from '../components/ui/TestimonialSlider'
import HeroWheel from '../components/home/HeroWheel'
import { fetchAstrologers } from '../lib/astrologers'
import { normalizeAstrologer } from '../lib/astrologerDisplay'
import { categories } from '../data/categories'
import { services, zodiacSigns, testimonials } from '../data/services'
import { blogArticles } from '../data/blog'
import { demoOnly, setPageMeta } from '../lib/demo'

const categoryIcons = { Heart, Gem, Briefcase, UserRound, TrendingUp, HeartPulse }
const serviceIcons = {
  ScrollText, Sun, Sparkles, Flame, Hash, Home: HomeIcon, HeartHandshake, Orbit, CalendarDays, Clock, Heart,
}

const quickActions = [
  { label: 'Chat', hint: 'with an astrologer', icon: MessageCircle, to: '/astrologers' },
  { label: 'Call', hint: 'talk it through', icon: Phone, to: '/astrologers' },
  { label: 'Video', hint: 'face to face', icon: Video, to: '/astrologers' },
  { label: 'Horoscope', hint: 'daily outlook', icon: Sun, to: '/horoscope' },
  { label: 'Kundli', hint: 'free in seconds', icon: ScrollText, to: '/kundli' },
  { label: 'Panchang', hint: "today's timings", icon: CalendarDays, to: '/panchang' },
]

const trustChips = [
  { icon: BadgeCheck, text: 'Verified astrologers' },
  { icon: Eye, text: 'Rates shown upfront' },
  { icon: Lock, text: 'Private & secure' },
]

const steps = [
  { icon: UserRound, title: 'Create your account', text: 'Sign up with your email and add your birth details for personalised insights.' },
  { icon: Sparkles, title: 'Choose an astrologer', text: 'Compare specialities, languages, ratings and per-minute rates.' },
  { icon: MessageCircle, title: 'Start your consultation', text: 'Chat, call or video. Pay per minute from your wallet, end anytime.' },
]

const whyUs = [
  { icon: Eye, title: 'Transparent pricing', text: 'The per-minute rate is on every profile before you begin. No surprises.' },
  { icon: BadgeCheck, title: 'Verified astrologers', text: 'A Verified badge marks astrologers reviewed on the platform.' },
  { icon: Wallet, title: 'Pay only for what you use', text: 'Add money once and see every charge in your history.' },
  { icon: ShieldCheck, title: 'Your details stay private', text: 'Birth details and chats are shared only with the astrologer you consult.' },
]

const featuredServiceIds = ['kundli', 'horoscope', 'matching']
const featuredCopy = {
  kundli: 'Your birth chart, planetary positions and dashas in seconds.',
  horoscope: 'A daily, weekly, monthly and yearly outlook for every sign.',
  matching: 'Check compatibility before an important decision.',
}
const categoryTints = [
  'from-orange/20 to-orange/5', 'from-gold/25 to-gold/5', 'from-orange/15 to-gold/10',
  'from-gold/20 to-orange/10', 'from-orange/25 to-orange/5', 'from-gold/20 to-gold/5',
]

export default function Home() {
  useEffect(() => {
    setPageMeta(
      'GrahVarta — Talk to Astrologers Online | Kundli, Horoscope & More',
      'Connect with verified astrologers for chat and call consultations. Explore free kundli, daily horoscope, tarot, numerology, vastu and more on GrahVarta.'
    )
  }, [])

  const [liveAstrologers, setLiveAstrologers] = useState(null)
  const [astrologersError, setAstrologersError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAstrologers({ limit: 8, sort: 'popular', onlineOnly: true })
      .then(({ list }) => {
        if (!cancelled) setLiveAstrologers(list.map(normalizeAstrologer))
      })
      .catch(() => {
        if (!cancelled) setAstrologersError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const blogTeasers = useMemo(() => blogArticles.slice(0, 4), [])
  const featuredServices = featuredServiceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean)
  const otherServices = services.filter((s) => !featuredServiceIds.includes(s.id))

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange/10 via-transparent to-gold/10" aria-hidden="true" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-orange/15 blur-3xl" aria-hidden="true" />
        <div className="container-page relative pt-12 pb-28 sm:pt-16 sm:pb-32 lg:pt-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <p className="badge-orange mb-5">
              <Sparkles size={12} /> Online astrology, made personal
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] mb-5">
              Find clarity with{' '}
              <span className="bg-gradient-to-r from-orange-dark via-orange to-gold bg-clip-text text-transparent">
                verified astrologers
              </span>
            </h1>
            <p className="text-text-secondary text-base sm:text-lg mb-8 max-w-xl">
              Chat, call or video with expert astrologers on love, career, marriage and more. Get your free
              kundli and daily horoscope, all in one place.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/astrologers" className="btn-primary">
                <MessageCircle size={18} /> Talk to an Astrologer
              </Link>
              <Link to="/kundli" className="btn-outline">
                Get Free Kundli <ArrowRight size={16} />
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {trustChips.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Icon size={16} className="text-orange" /> {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden lg:block">
            <HeroWheel astrologer={liveAstrologers?.[0]} />
          </div>
        </div>
      </section>

      {/* Quick actions — overlaps the hero */}
      <section className="container-page relative z-10 -mt-16 sm:-mt-20">
        <div className="card card-static !p-3 sm:!p-4 shadow-xl">
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {quickActions.map(({ label, hint, icon: Icon, to }) => (
              <Link
                key={label}
                to={to}
                className="group flex flex-col items-center text-center gap-1.5 rounded-xl px-2 py-4 hover:bg-surface-light transition-colors"
              >
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange to-orange-light text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Icon size={22} />
                </span>
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-text-muted hidden sm:block">{hint}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live astrologers */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading
          eyebrow="Available Now"
          title="Live Astrologers"
          subtitle="Connect instantly with astrologers who are online right now."
          actionLabel="View all"
          actionTo="/astrologers"
        />
        {liveAstrologers === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {Array.from({ length: 4 }).map((_, i) => (
              <AstrologerCardSkeleton key={i} />
            ))}
          </div>
        ) : astrologersError ? (
          <p className="text-sm text-text-muted">Could not load live astrologers right now.</p>
        ) : liveAstrologers.length === 0 ? (
          <p className="text-sm text-text-muted">No astrologers are online right now — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {liveAstrologers.map((a) => (
              <AstrologerCard key={a.id} astrologer={a} />
            ))}
          </div>
        )}
      </Reveal>

      {/* How it works */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Simple" title="How it works" subtitle="From sign-up to your first consultation in three steps." />
        <ol className="relative grid md:grid-cols-3 gap-5 stagger-children">
          <div className="hidden md:block absolute top-9 left-[16%] right-[16%] border-t-2 border-dashed border-orange/30" aria-hidden="true" />
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="card relative text-center">
              <span className="relative mx-auto -mt-1 mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-gold text-white flex items-center justify-center shadow-md">
                <Icon size={24} />
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-card border border-orange text-orange text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </span>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-text-secondary">{text}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* Browse by category */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Explore" title="What's on your mind?" subtitle="Pick a topic to find astrologers who specialise in it." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {categories.map((cat, i) => {
            const Icon = categoryIcons[cat.icon] || Sparkles
            return (
              <Link
                key={cat.id}
                to={`/astrologers?q=${encodeURIComponent(cat.label)}`}
                className={`card group flex items-center gap-4 bg-gradient-to-br ${categoryTints[i % categoryTints.length]}`}
              >
                <span className="w-12 h-12 rounded-2xl bg-card border border-border text-orange flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-sm">{cat.label}</span>
                  <span className="block text-xs text-text-secondary line-clamp-2">{cat.description}</span>
                </span>
                <ArrowRight size={16} className="text-orange shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </Link>
            )
          })}
        </div>
      </Reveal>

      {/* Services */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="What we offer" title="Tools & Services" />
        <div className="grid md:grid-cols-3 gap-4 mb-4 stagger-children">
          {featuredServices.map((service) => {
            const Icon = serviceIcons[service.icon] || Sparkles
            return (
              <Link
                key={service.id}
                to={service.path}
                className="card group relative overflow-hidden bg-gradient-to-br from-orange/15 via-card to-gold/10 !p-6"
              >
                <Icon size={110} className="absolute -right-5 -bottom-6 text-orange/10 group-hover:text-orange/20 group-hover:scale-110 transition-all duration-500" aria-hidden="true" />
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange to-orange-light text-white flex items-center justify-center shadow-md mb-4">
                  <Icon size={22} />
                </span>
                <h3 className="font-semibold text-lg mb-1">{service.label}</h3>
                <p className="text-sm text-text-secondary max-w-[16rem] mb-4">{featuredCopy[service.id]}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-orange">
                  Explore <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            )
          })}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
          {otherServices.map((service) => {
            const Icon = serviceIcons[service.icon] || Sparkles
            return (
              <Link key={service.id} to={service.path} className="card group flex items-center gap-3 !p-4">
                <span className="w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center shrink-0 group-hover:bg-orange group-hover:text-white transition-colors">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium">{service.label}</span>
              </Link>
            )
          })}
        </div>
      </Reveal>

      {/* Daily horoscope */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Zodiac" title="Daily Horoscope" subtitle="Tap your sign to see today's outlook." actionLabel="All signs" actionTo="/horoscope" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 stagger-children">
          {zodiacSigns.map((sign) => (
            <Link key={sign.id} to={`/horoscope/${sign.id}`} className="card group flex flex-col items-center text-center gap-2 !py-5">
              <span className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-orange/15 border border-gold/30 flex items-center justify-center text-3xl text-gold group-hover:scale-110 group-hover:rotate-6 transition-transform" aria-hidden="true">
                {sign.symbol}
              </span>
              <span className="text-sm font-medium">{sign.label}</span>
            </Link>
          ))}
        </div>
      </Reveal>

      {/* Why GrahVarta */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Why GrahVarta" title="Built to be trusted" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {whyUs.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <span className="w-11 h-11 rounded-xl bg-gold/15 text-gold flex items-center justify-center mb-3">
                <Icon size={22} />
              </span>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Testimonials */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Reviews" title="What our users say" />
        <TestimonialSlider items={testimonials} />
      </Reveal>

      {/* App download */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
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
      </Reveal>

      {/* Blog teasers */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <SectionHeading eyebrow="Learn" title="Astrology Insights" actionLabel="View all" actionTo="/blog" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
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
      </Reveal>
      {/* Closing call to action */}
      <Reveal as="section" className="container-page py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-dark via-orange to-orange-light px-6 py-12 sm:px-12 sm:py-14 text-center text-white shadow-xl">
          <Sparkles size={160} className="absolute -left-6 -top-8 text-white/10" aria-hidden="true" />
          <Sparkles size={120} className="absolute -right-4 -bottom-6 text-white/10" aria-hidden="true" />
          <h2 className="relative text-2xl sm:text-4xl font-extrabold mb-3">Ready to find your answers?</h2>
          <p className="relative text-white/90 max-w-xl mx-auto mb-7 text-sm sm:text-base">
            Talk to a verified astrologer today, or start with your free kundli.
          </p>
          <div className="relative flex flex-wrap justify-center gap-3">
            <Link to="/astrologers" className="inline-flex items-center gap-2 bg-white text-orange-dark font-semibold py-3 px-6 rounded-xl hover:bg-white/90 transition-colors">
              <MessageCircle size={18} /> Talk to an Astrologer
            </Link>
            <Link to="/kundli" className="inline-flex items-center gap-2 border border-white/70 text-white font-semibold py-3 px-6 rounded-xl hover:bg-white/10 transition-colors">
              Get Free Kundli
            </Link>
          </div>
        </div>
      </Reveal>
    </div>
  )
}
