import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'

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
const StoryPrivacyPolicy = lazy(() => import('./pages/StoryPrivacyPolicy'))

// Future-phase features get a nav link now, but route to ComingSoon so the
// site never 404s while pages roll out incrementally.
const comingSoonRoutes = [
  { path: '/about', feature: 'About Us' },
  { path: '/contact', feature: 'Contact Us' },
  { path: '/careers', feature: 'Careers' },
  { path: '/privacy', feature: 'Privacy Policy' },
  { path: '/terms', feature: 'Terms of Use' },
]

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading page">
      <span className="w-10 h-10 rounded-full border-4 border-surface-light border-t-orange animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1E1E1E', color: '#FFFFFF', border: '1px solid #2A2A2A' },
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
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            {comingSoonRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={<ComingSoon feature={r.feature} />} />
            ))}
            <Route path="*" element={<ComingSoon feature="This page" />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}
