import { useEffect } from 'react'

// The shop moved to its own site (shops.grahvarta.com). In-app links to
// /shop still exist (header, footer, cart), so this route forwards the
// browser there; nginx also 301s direct visits to grahvarta.com/shop.
export const SHOP_URL = 'https://shops.grahvarta.com/'

export default function ExternalRedirect({ to = SHOP_URL }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <div className="container-page py-24 text-center text-text-secondary">
      Opening the GrahVarta Shop… <a href={to} className="text-orange underline">Continue</a>
    </div>
  )
}
