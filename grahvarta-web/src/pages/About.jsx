import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Phone, Video, ScrollText, Sun, CalendarDays, Radio, ShieldCheck, Wallet, Eye } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Reveal from '../components/ui/Reveal'
import { setPageMeta } from '../lib/demo'

const offerings = [
  { icon: MessageCircle, title: 'Chat with astrologers', text: 'Ask your questions in a private one-to-one chat with an astrologer who is online now.' },
  { icon: Phone, title: 'Voice calls', text: 'Prefer to talk? Connect with an astrologer over a live voice call.' },
  { icon: Video, title: 'Video consultations', text: 'Face-to-face guidance from wherever you are.' },
  { icon: ScrollText, title: 'Kundli & birth chart', text: 'Generate your kundli, match kundlis, and view your birth chart.' },
  { icon: Sun, title: 'Horoscopes', text: 'Daily, weekly, monthly and yearly horoscopes for every sign, plus a personalised one.' },
  { icon: CalendarDays, title: 'Panchang & Muhurat', text: 'Daily panchang and auspicious timings for the moments that matter.' },
  { icon: Radio, title: 'Live & community', text: 'Join live sessions with astrologers and share in the community feed.' },
]

const steps = [
  { title: 'Create your account', text: 'Sign up with your email in a minute and add your birth details for personalised insights.' },
  { title: 'Choose an astrologer', text: 'Browse profiles, specialities, languages, ratings and per-minute rates, then pick who feels right.' },
  { title: 'Start a consultation', text: 'Chat, call or video. You are billed per minute from your wallet, and can end whenever you like.' },
]

const values = [
  { icon: Eye, title: 'Transparent pricing', text: 'The per-minute rate is shown on every profile before you begin — no surprises.' },
  { icon: ShieldCheck, title: 'Verified astrologers', text: 'A Verified badge marks astrologers who have been reviewed on the platform.' },
  { icon: Wallet, title: 'Simple wallet', text: 'Add money once, pay only for the minutes you use, and see every charge in your history.' },
]

export default function About() {
  useEffect(() => {
    setPageMeta('About Us | GrahVarta', 'GrahVarta connects you with astrologers for chat, call and video guidance, with kundli, horoscope and panchang tools in one place.')
  }, [])

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="About Us"
        title="Guidance from the stars, one conversation away"
        subtitle="GrahVarta brings astrologers and the people who seek their guidance together in one simple, trustworthy place."
      />

      <Reveal className="card card-static max-w-3xl mb-12">
        <p className="text-sm text-text-secondary leading-relaxed">
          Astrology has guided decisions about love, career, family and timing for generations. We built GrahVarta so
          that thoughtful, personal guidance is easy to reach — whether you want a quick horoscope, a detailed kundli, or
          a real conversation with an astrologer who understands your questions. Everything works the same on the web
          and in our mobile app, with one account and one wallet.
        </p>
      </Reveal>

      <Reveal as="section" className="mb-12">
        <h2 className="text-xl font-bold mb-5">What you can do on GrahVarta</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {offerings.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <span className="w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center mb-3">
                <Icon size={20} />
              </span>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="mb-12">
        <h2 className="text-xl font-bold mb-5">How it works</h2>
        <ol className="grid md:grid-cols-3 gap-4 stagger-children">
          {steps.map((s, i) => (
            <li key={s.title} className="card">
              <span className="w-8 h-8 rounded-full bg-orange text-white text-sm font-bold flex items-center justify-center mb-3">{i + 1}</span>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-text-secondary">{s.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal as="section" className="mb-12">
        <h2 className="text-xl font-bold mb-5">What we stand for</h2>
        <div className="grid md:grid-cols-3 gap-4 stagger-children">
          {values.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon size={22} className="text-gold mb-3" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-text-secondary">{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal className="card card-static max-w-3xl">
        <h2 className="text-lg font-bold mb-2">A note on astrology</h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-5">
          Astrology is a traditional belief system offered here for guidance and insight. It is not a substitute for
          professional medical, legal or financial advice.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/astrologers" className="btn-primary">Talk to an Astrologer</Link>
          <Link to="/contact" className="btn-outline">Contact Us</Link>
        </div>
      </Reveal>
    </div>
  )
}
