// Wallet endpoints (backend/src/routes/wallet.js, walletController.js).
// Add-money uses standard Razorpay Checkout.js — the server never trusts a
// client-supplied credit amount; it looks up the amount it itself stored
// against the order id when verifying (backend/src/controllers/walletController.js
// createAddMoneyOrder/verifyAndCredit).
import { api } from './api'
import { track } from './analytics'

// order id → amount, so the purchase event can carry its value
const pendingOrders = new Map()

export async function fetchWallet() {
  const res = await api.get('/api/wallet', { auth: true })
  return res.data
}

export async function fetchTransactions({ page = 1, limit = 20, type } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (type) params.set('type', type)
  const res = await api.get(`/api/wallet/transactions?${params.toString()}`, { auth: true })
  return { list: Array.isArray(res.data) ? res.data : [], total: res.total ?? 0 }
}

export async function createAddMoneyOrder(amount) {
  const res = await api.post('/api/wallet/add-money/order', { amount }, { auth: true })
  if (res.data?.order_id) pendingOrders.set(res.data.order_id, Number(amount))
  track('begin_checkout', { currency: 'INR', value: Number(amount) })
  return res.data
}

export async function verifyAddMoney({ orderId, paymentId, signature }) {
  const res = await api.post(
    '/api/wallet/add-money/verify',
    { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature },
    { auth: true }
  )
  const value = pendingOrders.get(orderId)
  pendingOrders.delete(orderId)
  track('purchase', {
    currency: 'INR',
    value,
    transaction_id: orderId,
    items: [{ item_name: 'wallet_recharge', item_category: 'wallet', price: value, quantity: 1 }],
  })
  return res.data
}

let razorpayScriptPromise = null
export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Could not load the payment gateway. Please try again.'))
    document.body.appendChild(script)
  })
  return razorpayScriptPromise
}
