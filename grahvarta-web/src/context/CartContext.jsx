import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Lightweight cart context for the AstroMall demo. Persists to localStorage
// so the cart survives navigation/refresh; all storage access is wrapped in
// try/catch so the app still works if storage is unavailable (private mode,
// disabled storage, etc).

const CartContext = createContext(null)
const STORAGE_KEY = 'grahvarta-cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore — storage may be unavailable (private browsing, quota, etc).
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart)

  useEffect(() => {
    saveCart(items)
  }, [items])

  function addItem(product, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === product.slug)
      if (existing) {
        return prev.map((i) =>
          i.slug === product.slug ? { ...i, qty: i.qty + qty } : i
        )
      }
      return [
        ...prev,
        {
          slug: product.slug,
          name: product.name,
          image: product.image,
          price: product.price,
          qty,
        },
      ]
    })
  }

  function removeItem(slug) {
    setItems((prev) => prev.filter((i) => i.slug !== slug))
  }

  function updateQty(slug, qty) {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((i) => i.slug !== slug)
      return prev.map((i) => (i.slug === slug ? { ...i, qty } : i))
    })
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items])
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.qty * i.price, 0), [items])

  const value = { items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
