import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import ZodiacLoader from './components/ui/ZodiacLoader'

const Home = lazy(() => import('./pages/Home'))
const Astrologers = lazy(() => import('./pages/Astrologers'))
const AstrologerCategory = lazy(() => import('./pages/AstrologerCategory'))
const AstrologerProfile = lazy(() => import('./pages/AstrologerProfile'))
const Chat = lazy(() => import('./pages/Chat'))
const Call = lazy(() => import('./pages/Call'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))
const Kundli = lazy(() => import('./pages/Kundli'))
const KundliResult = lazy(() => import('./pages/KundliResult'))
const KundliMatching = lazy(() => import('./pages/KundliMatching'))
const KundliMatchingResult = lazy(() => import('./pages/KundliMatchingResult'))
const Horoscope = lazy(() => import('./pages/Horoscope'))
const HoroscopeDetail = lazy(() => import('./pages/HoroscopeDetail'))
const Panchang = lazy(() => import('./pages/Panchang'))
const Muhurat = lazy(() => import('./pages/Muhurat'))
const MuhuratDetail = lazy(() => import('./pages/MuhuratDetail'))
const PlanetTransit = lazy(() => import('./pages/PlanetTransit'))
const LoveCalculator = lazy(() => import('./pages/LoveCalculator'))
const Tarot = lazy(() => import('./pages/Tarot'))
const Numerology = lazy(() => import('./pages/Numerology'))
const Vastu = lazy(() => import('./pages/Vastu'))
const Puja = lazy(() => import('./pages/Puja'))
const PujaDetail = lazy(() => import('./pages/PujaDetail'))
const Shop = lazy(() => import('./pages/Shop'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogArticle = lazy(() => import('./pages/BlogArticle'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const StoryPrivacyPolicy = lazy(() => import('./pages/StoryPrivacyPolicy'))
const Account = lazy(() => import('./pages/Account'))
const LiveView = lazy(() => import('./pages/LiveView'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading page">
      <span className="w-10 h-10 rounded-full border-4 border-surface-light border-t-orange animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

const BOOT_SPLASH_MS = 500

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), BOOT_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <ZodiacLoader label="Loading GrahVarta" />
        </div>
      )}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgb(var(--color-card))',
            color: 'rgb(var(--color-text-primary))',
            border: '1px solid rgb(var(--color-border))',
          },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/storyprivacypolicy" element={<StoryPrivacyPolicy />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/astrologers" element={<Astrologers />} />
            <Route path="/astrologer/profile/:id" element={<AstrologerProfile />} />
            <Route path="/astrologer/:category" element={<AstrologerCategory />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/call/:id" element={<Call />} />
            <Route path="/kundli" element={<Kundli />} />
            <Route path="/kundli/result" element={<KundliResult />} />
            <Route path="/kundli-matching" element={<KundliMatching />} />
            <Route path="/kundli-matching/result" element={<KundliMatchingResult />} />
            <Route path="/horoscope" element={<Horoscope />} />
            <Route path="/horoscope/:sign" element={<HoroscopeDetail />} />
            <Route path="/panchang" element={<Panchang />} />
            <Route path="/muhurat" element={<Muhurat />} />
            <Route path="/muhurat/:slug" element={<MuhuratDetail />} />
            <Route path="/planet-transit" element={<PlanetTransit />} />
            <Route path="/love-calculator" element={<LoveCalculator />} />
            <Route path="/tarot" element={<Tarot />} />
            <Route path="/numerology" element={<Numerology />} />
            <Route path="/vastu" element={<Vastu />} />
            <Route path="/puja" element={<Puja />} />
            <Route path="/puja/:slug" element={<PujaDetail />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/account" element={<Account />} />
            <Route path="/live/:sessionId" element={<LiveView />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="*" element={<ComingSoon feature="This page" />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
