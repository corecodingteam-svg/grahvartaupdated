import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { getProductBySlug } from '../data/products'
import { useCart } from '../context/CartContext'
import { setPageMeta } from '../lib/demo'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const product = getProductBySlug(slug)
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (product) {
      setPageMeta({
        title: `${product.name} | GrahVarta Shop`,
        description: product.description,
        image: product.image,
      })
    }
  }, [product])

  if (!product) {
    return <Navigate to="/shop" replace />
  }

  const { name, image, category, price, description, inStock } = product

  function handleAddToCart() {
    addItem(product, qty)
    toast.success(`${name} added to cart`)
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-orange mb-6">
        <ArrowLeft size={16} /> Back to shop
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        <img src={image} alt={name} className="w-full h-72 sm:h-96 object-cover rounded-2xl border border-border" />

        <Card className="flex flex-col gap-4">
          <Badge tone="orange" className="w-fit">{category}</Badge>
          <h1 className="text-xl sm:text-2xl font-bold">{name}</h1>
          <span className="text-2xl font-bold text-orange">₹{price.toLocaleString('en-IN')}</span>
          {!inStock && <span className="text-sm text-text-muted">Currently out of stock</span>}
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-text-secondary">Quantity</span>
            <div className="flex items-center gap-3 bg-surface-light rounded-xl px-3 py-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="text-text-secondary hover:text-orange transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                className="text-text-secondary hover:text-orange transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={18} /> Add to Cart
            </button>
            <button type="button" onClick={() => navigate('/cart')} className="btn-outline flex-1">
              Go to Cart
            </button>
          </div>
          <p className="text-xs text-text-muted text-center">
            This is a demo site — checkout is not functional.
          </p>
        </Card>
      </div>
    </div>
  )
}
