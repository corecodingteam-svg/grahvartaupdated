import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { setPageMeta } from '../lib/demo'

export default function ComingSoon({ feature = 'This feature' }) {
  useEffect(() => {
    setPageMeta(`${feature} — Coming Soon | GrahVarta`, `${feature} is coming soon to GrahVarta.`)
  }, [feature])

  return (
    <div className="container-page py-20 sm:py-28 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange/10 flex items-center justify-center mb-5">
        <Sparkles size={28} className="text-orange" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{feature} is coming soon</h1>
      <p className="text-text-secondary max-w-md mb-8">
        We&apos;re working on bringing {feature.toLowerCase()} to GrahVarta. In the meantime, explore our
        astrologers and talk to an expert.
      </p>
      <Link to="/astrologers" className="btn-primary">
        Browse Astrologers
      </Link>
    </div>
  )
}
