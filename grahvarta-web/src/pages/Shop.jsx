import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionHeading from '../components/ui/SectionHeading'
import { products, productCategories } from '../data/products'
import { useCart } from '../context/CartContext'
import { setPageMeta } from '../lib/demo'

export default function Shop() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const { addItem } = useCart()

  useEffect(() => {
    setPageMeta(
      'Astrology Shop | GrahVarta',
      'Shop gemstones, rudraksha, yantras, books and puja items — the AstroMall for all your spiritual needs.'
    )
  }, [])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false
      if (category && p.category !== category) return false
      return true
    })
  }, [query, category])

  function handleAddToCart(product) {
    addItem(product, 1)
    toast.success(`${product.name} added to cart`)
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="AstroMall"
        title="Astrology Shop"
        subtitle="Gemstones, rudraksha, yantras, books and puja items — curated for your spiritual journey."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, e.g. Rudraksha"
            className="input-field pl-9"
            aria-label="Search products"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field sm:w-56"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {productCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-text-secondary">No products match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {filtered.map((product) => (
            <Card key={product.slug} className="flex flex-col gap-3 overflow-hidden hover:border-orange/50 transition-colors">
              <Link to={`/shop/${product.slug}`}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-40 object-cover rounded-xl -mt-5 -mx-5 mb-1"
                  style={{ width: 'calc(100% + 2.5rem)' }}
                  loading="lazy"
                />
              </Link>
              <Badge tone="orange" className="w-fit">{product.category}</Badge>
              <Link to={`/shop/${product.slug}`} className="font-semibold text-sm leading-snug hover:text-orange transition-colors line-clamp-2">
                {product.name}
              </Link>
              {!product.inStock && (
                <span className="text-xs text-text-muted">Out of stock</span>
              )}
              <div className="flex items-center justify-between pt-2 mt-auto border-t border-divider">
                <span className="text-base font-bold text-orange">₹{product.price.toLocaleString('en-IN')}</span>
                <button
                  type="button"
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.inStock}
                  className="w-9 h-9 rounded-xl bg-surface-light flex items-center justify-center text-text-secondary hover:text-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingCart size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
