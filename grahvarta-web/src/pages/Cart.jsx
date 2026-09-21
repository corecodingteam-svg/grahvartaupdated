import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import Card from '../components/ui/Card'
import SectionHeading from '../components/ui/SectionHeading'
import { useCart } from '../context/CartContext'
import { demoOnly, setPageMeta } from '../lib/demo'

const SHIPPING = 0

export default function Cart() {
  const { items, removeItem, updateQty, totalPrice } = useCart()

  useEffect(() => {
    setPageMeta('Your Cart | GrahVarta', 'Review items in your GrahVarta shop cart.')
  }, [])

  if (items.length === 0) {
    return (
      <div className="container-page py-8 sm:py-12">
        <SectionHeading level="h1" eyebrow="AstroMall" title="Your Cart" />
        <div className="card text-center py-16 flex flex-col items-center gap-4">
          <ShoppingBag size={40} className="text-text-muted" />
          <p className="text-text-secondary">Your cart is empty.</p>
          <Link to="/shop" className="btn-primary">Browse Shop</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading level="h1" eyebrow="AstroMall" title="Your Cart" />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => (
            <Card key={item.slug} className="flex items-center gap-4">
              <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover border border-border shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-orange font-bold mt-1">₹{item.price.toLocaleString('en-IN')}</p>
              </div>
              <div className="flex items-center gap-2 bg-surface-light rounded-xl px-2.5 py-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQty(item.slug, item.qty - 1)}
                  className="text-text-secondary hover:text-orange transition-colors"
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  <Minus size={14} />
                </button>
                <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.slug, item.qty + 1)}
                  className="text-text-secondary hover:text-orange transition-colors"
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeItem(item.slug)}
                className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-red-400 transition-colors shrink-0"
                aria-label={`Remove ${item.name} from cart`}
              >
                <Trash2 size={16} />
              </button>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-20 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Order Summary</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Subtotal</span>
              <span className="font-semibold">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Shipping</span>
              <span className="font-semibold text-success">{SHIPPING === 0 ? 'Free' : `₹${SHIPPING}`}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-divider">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold text-orange">₹{(totalPrice + SHIPPING).toLocaleString('en-IN')}</span>
            </div>
            <button
              type="button"
              onClick={() => demoOnly('Demo only — checkout not available.')}
              className="btn-primary w-full"
            >
              Checkout
            </button>
            <p className="text-xs text-text-muted text-center">
              This is a demo site — checkout is not functional.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
