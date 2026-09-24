import { useEffect, useState } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  UserRound, LogOut, Mail, CalendarDays, Wallet as WalletIcon, MessageCircle,
  History, Plus, Loader2, PhoneCall, ChevronRight, Sun, Sparkles, Lock,
  Users, Bell, Star, Trash2, Pencil, X, Video, Radio, Eye, Heart, MessageSquare,
  BadgeCheck, Send,
} from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Card from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import { useAuth } from '../context/AuthContext'
import { fetchWallet, fetchTransactions, createAddMoneyOrder, verifyAddMoney, loadRazorpayScript } from '../lib/wallet'
import { fetchChatThreads, fetchConsultationHistory } from '../lib/history'
import { fetchMyHoroscope, fetchMyBirthChart } from '../lib/birthChart'
import {
  fetchReports, fetchCredits, fetchUnlockedReports, fetchReportDetail, unlockReport,
  fetchReportPlans, purchaseReportPlan, parseReportContent,
} from '../lib/reports'
import {
  fetchFamilyMembers, createFamilyMember, updateFamilyMember, deleteFamilyMember,
} from '../lib/familyMembers'
import { fetchNotifications, markAllNotificationsRead } from '../lib/notifications'
import {
  fetchLiveSessions, fetchCommunityPosts, createCommunityPost, toggleCommunityPostLike,
  fetchPostComments, addPostComment, communityCategories, communitySortOptions,
} from '../lib/live'
import { submitAstrologerReview } from '../lib/astrologers'
import { ApiError } from '../lib/api'
import { setPageMeta } from '../lib/demo'

const tabs = [
  { id: 'profile', label: 'Profile', icon: UserRound, description: 'Your personal details and birth information.' },
  { id: 'wallet', label: 'Wallet', icon: WalletIcon, description: 'Check your balance, add money and view transactions.' },
  { id: 'horoscope', label: 'My Horoscope', icon: Sun, description: 'Your personalised horoscope, based on your birth details.' },
  { id: 'birthchart', label: 'Birth Chart', icon: Sparkles, description: 'Planet positions, houses and aspects from your birth details.' },
  { id: 'reports', label: 'Reports', icon: Lock, description: 'Detailed astrology reports, unlocked with credits.' },
  { id: 'live', label: 'Live & Community', icon: Radio, description: 'Join live sessions and connect with the community.' },
  { id: 'family', label: 'Family Members', icon: Users, description: 'Save family details to use across horoscopes and reports.' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Your latest updates and alerts.' },
  { id: 'chats', label: 'Chat History', icon: MessageCircle, description: 'Your past conversations with astrologers.' },
  { id: 'consultations', label: 'Consultations', icon: History, description: 'Your past chats and calls, and reviews you can leave.' },
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDuration(seconds) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

// ── Profile ──────────────────────────────────────────────────────────────
function ProfileTab({ user }) {
  return (
    <Card className="flex items-center gap-4">
      <Avatar src={user.avatar_url} name={user.name} size={64} rounded="rounded-2xl" />
      <div className="min-w-0">
        <h2 className="font-semibold text-lg truncate">{user.name}</h2>
        <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1">
          <Mail size={14} /> {user.email}
        </p>
        {user.sun_sign && (
          <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1">
            <CalendarDays size={14} /> Sun Sign: {user.sun_sign}
          </p>
        )}
      </div>
    </Card>
  )
}

// ── Wallet ───────────────────────────────────────────────────────────────
function WalletTab() {
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [amount, setAmount] = useState('200')
  const [processing, setProcessing] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    Promise.all([fetchWallet(), fetchTransactions({ limit: 10 })])
      .then(([w, tx]) => {
        setWallet(w)
        setTransactions(tx.list)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleAddMoney(e) {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value < 50) {
      toast.error('Minimum add-money amount is ₹50.')
      return
    }

    setProcessing(true)
    try {
      await loadRazorpayScript()
      const order = await createAddMoneyOrder(value)

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.order_id,
        name: 'GrahVarta Wallet',
        description: 'Add money to wallet',
        handler: async (response) => {
          try {
            await verifyAddMoney({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
            toast.success('Wallet recharged successfully.')
            load()
          } catch {
            toast.error('Payment verification failed. If money was deducted, it will be refunded.')
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      })
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.')
        setProcessing(false)
      })
      rzp.open()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start the payment. Please try again.')
      setProcessing(false)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <Card className="h-40 animate-pulse" />
  if (error) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-text-secondary">Could not load your wallet right now.</p>
        <button type="button" onClick={load} className="btn-outline mt-4">Retry</button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wide">Wallet Balance</p>
          <p className="text-3xl font-bold text-orange mt-1">₹{Number(wallet?.balance || 0).toFixed(2)}</p>
        </div>
        <form onSubmit={handleAddMoney} className="flex items-center gap-2">
          <input
            type="number"
            min={50}
            step={50}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field w-28 !py-2"
            aria-label="Amount to add"
          />
          <button type="submit" className="btn-primary !py-2 !px-4 text-sm inline-flex items-center gap-1.5" disabled={processing}>
            {processing ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add Money
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-text-muted">No transactions yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-divider">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium capitalize">{tx.type}</p>
                  <p className="text-xs text-text-muted">{formatDate(tx.created_at)}</p>
                </div>
                <span className={`font-semibold ${tx.type === 'debit' ? 'text-error' : 'text-success'}`}>
                  {tx.type === 'debit' ? '-' : '+'}₹{Number(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ── My Horoscope ─────────────────────────────────────────────────────────
const horoscopePeriods = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

function MyHoroscopeTab() {
  const [period, setPeriod] = useState('daily')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetchMyHoroscope(period)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {horoscopePeriods.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p.id ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary hover:text-text-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="h-40 animate-pulse" />
      ) : error ? (
        <Card className="text-center py-10">
          <p className="text-sm text-text-secondary">
            Could not load your horoscope — make sure your date of birth is set on your profile.
          </p>
        </Card>
      ) : (
        <Card>
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">
            {data?.zodiac_sign || 'Your'} · {horoscopePeriods.find((p) => p.id === period)?.label}
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{data?.content}</p>
          {(data?.love_score || data?.friendship_score || data?.work_score) && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                ['Love', data?.love_score],
                ['Friendship', data?.friendship_score],
                ['Work', data?.work_score],
              ].map(([label, score]) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-bold text-orange">{score ?? '—'}</p>
                  <p className="text-[11px] text-text-muted">{label}</p>
                </div>
              ))}
            </div>
          )}
          {(data?.lucky_number || data?.lucky_color) && (
            <div className="flex gap-6 mt-4 pt-4 border-t border-divider text-sm">
              {data?.lucky_number && <span className="text-text-secondary">Lucky Number: <strong className="text-gold">{data.lucky_number}</strong></span>}
              {data?.lucky_color && <span className="text-text-secondary">Lucky Color: <strong className="text-gold">{data.lucky_color}</strong></span>}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// ── Birth Chart ──────────────────────────────────────────────────────────
function parseMaybeJson(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function BirthChartTab() {
  const [chart, setChart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchMyBirthChart()
      .then(setChart)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Card className="h-40 animate-pulse" />
  if (error || !chart) {
    return (
      <Card className="text-center py-10">
        <p className="text-sm text-text-secondary">
          Could not load your birth chart — make sure your date of birth is set on your profile.
        </p>
      </Card>
    )
  }

  const planets = parseMaybeJson(chart.planet_positions) || {}
  const houses = parseMaybeJson(chart.house_positions) || {}
  const aspects = parseMaybeJson(chart.aspects) || []

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Planet Positions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="py-2 pr-4 font-medium">Planet</th>
                <th className="py-2 pr-4 font-medium">Sign</th>
                <th className="py-2 font-medium">Degree</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(planets).map(([planet, pos]) => (
                <tr key={planet} className="border-b border-divider last:border-0">
                  <td className="py-2 pr-4 font-medium">{planet} {pos.retrograde && <span className="text-error text-xs">(R)</span>}</td>
                  <td className="py-2 pr-4 text-text-secondary">{pos.sign}</td>
                  <td className="py-2 text-text-secondary">{pos.degree}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {Object.keys(houses).length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Houses</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Object.entries(houses).map(([house, sign]) => (
              <div key={house} className="bg-surface-light rounded-xl p-2.5 text-center">
                <p className="text-[11px] text-text-muted">{house.replace('House', 'House ')}</p>
                <p className="text-sm font-semibold text-gold">{sign}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {aspects.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Aspects</h3>
          <div className="flex flex-col gap-1.5">
            {aspects.map((a, i) => (
              <p key={i} className="text-sm text-text-secondary">
                {a.planet1} <span className="text-orange">{a.aspect}</span> {a.planet2}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Reports ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const [reports, setReports] = useState(null)
  const [unlocked, setUnlocked] = useState([])
  const [credits, setCredits] = useState(null)
  const [plans, setPlans] = useState([])
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null)

  function load() {
    setError(false)
    Promise.all([fetchReports(), fetchUnlockedReports(), fetchCredits(), fetchReportPlans()])
      .then(([r, u, c, p]) => {
        setReports(r)
        setUnlocked(u)
        setCredits(c)
        setPlans(p)
      })
      .catch(() => setError(true))
  }

  useEffect(load, [])

  async function handleUnlock(report) {
    setBusyId(report.id)
    try {
      const result = await unlockReport(report.id)
      toast.success('Report unlocked!')
      load()
      if (result?.ai_content) setDetail({ report_name: report.name, ai_content: result.ai_content })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not unlock this report.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleView(unlock) {
    setBusyId(unlock.id)
    try {
      const full = await fetchReportDetail(unlock.id)
      setDetail(full)
    } catch {
      toast.error('Could not load this report.')
    } finally {
      setBusyId(null)
    }
  }

  async function handlePurchasePlan(planName) {
    setBusyId(planName)
    try {
      await purchaseReportPlan(planName)
      toast.success('Plan purchased! You now have more report credits.')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not complete the purchase.')
    } finally {
      setBusyId(null)
    }
  }

  if (error) {
    return <Card className="text-center py-10"><p className="text-sm text-text-secondary">Could not load reports right now.</p></Card>
  }
  if (reports === null) return <Card className="h-40 animate-pulse" />

  const unlockedByReportId = new Map(unlocked.map((u) => [u.report_id, u]))

  return (
    <div className="flex flex-col gap-4">
      {credits && (
        <Card className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Free Report</p>
            <p className="text-sm font-semibold">{credits.free_available ? 'Available' : 'Used'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Plan Credits</p>
            <p className="text-sm font-semibold text-orange">{credits.plan_credits}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Wallet Balance</p>
            <p className="text-sm font-semibold">₹{Number(credits.wallet_balance || 0).toFixed(2)}</p>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map((report) => {
          const unlock = unlockedByReportId.get(report.id)
          return (
            <Card key={report.id} className="flex flex-col gap-2">
              <p className="font-semibold text-sm">{report.name}</p>
              {report.category && <p className="text-xs text-text-muted">{report.category}</p>}
              {unlock ? (
                <button
                  type="button"
                  onClick={() => handleView(unlock)}
                  className="btn-outline !py-2 text-sm mt-auto"
                  disabled={busyId === unlock.id}
                >
                  {busyId === unlock.id ? <Loader2 size={14} className="animate-spin" /> : 'View Report'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUnlock(report)}
                  className="btn-primary !py-2 text-sm mt-auto"
                  disabled={busyId === report.id || !credits?.can_unlock}
                >
                  {busyId === report.id ? <Loader2 size={14} className="animate-spin" /> : credits?.free_available ? 'Unlock Free' : 'Unlock (1 credit)'}
                </button>
              )}
            </Card>
          )
        })}
      </div>

      {plans.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Buy More Credits</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {plans.map((plan) => (
              <div key={plan.name} className="border border-border rounded-xl p-3 text-center flex flex-col gap-2">
                <p className="font-semibold text-sm">{plan.label}</p>
                <p className="text-xs text-text-muted line-through">₹{plan.actualPrice}</p>
                <p className="text-lg font-bold text-orange">₹{plan.price}</p>
                <button
                  type="button"
                  onClick={() => handlePurchasePlan(plan.name)}
                  className="btn-outline !py-1.5 text-xs"
                  disabled={busyId === plan.name}
                >
                  {busyId === plan.name ? <Loader2 size={13} className="animate-spin" /> : 'Buy'}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="card max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{detail.report_name}</h3>
              <button type="button" onClick={() => setDetail(null)} className="w-8 h-8 rounded-lg hover:bg-surface-light flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {parseReportContent(detail.ai_content).map((section, i) => (
                <div key={i}>
                  {section.heading && <h4 className="font-semibold text-sm text-orange mb-1.5">{section.heading}</h4>}
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{section.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Live & Community (mirrors flutter_app's live_screen.dart) ───────────
function formatSchedule(iso) {
  if (!iso) return 'TBD'
  const dt = new Date(iso)
  const diffMs = dt - new Date()
  const diffH = diffMs / 3600000
  if (diffH < 1) return `In ${Math.max(1, Math.round(diffMs / 60000))}m`
  if (diffH < 24) return `In ${Math.round(diffH)}h`
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function timeAgo(iso) {
  if (!iso) return ''
  const diffMin = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`
  return `${Math.floor(diffMin / 1440)}d ago`
}

function LiveSessionsSection() {
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchLiveSessions()
      .then((all) => setSessions(all.filter((s) => s.status !== 'ended')))
      .catch(() => setError(true))
  }, [])

  if (error) return <Card className="text-center py-10"><p className="text-sm text-text-secondary">Could not load live sessions.</p></Card>
  if (sessions === null) return <Card className="h-40 animate-pulse" />

  const live = sessions.filter((s) => s.status === 'live')
  const upcoming = sessions.filter((s) => s.status !== 'live')

  function join(session) {
    navigate(`/live/${session.id}`, { state: { session } })
  }

  if (sessions.length === 0) {
    return (
      <Card className="text-center py-12">
        <Radio size={32} className="text-text-muted mx-auto mb-3" />
        <p className="text-sm font-semibold">No live sessions right now</p>
        <p className="text-xs text-text-muted mt-1">Check back soon for upcoming sessions.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {live.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">🔴 Live Now</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {live.map((s) => (
              <Card key={s.id} className="!p-0 overflow-hidden flex flex-col">
                <div className="relative h-32 bg-gradient-to-br from-orange/30 to-black flex items-end p-3">
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-error text-white text-[10px] font-bold px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                  </span>
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 bg-black/50 text-white/80 text-[10px] px-2 py-1 rounded-full">
                    <Eye size={11} /> {s.viewer_count || 0}
                  </span>
                  <div className="flex items-center gap-2">
                    <Avatar src={s.avatar_url} name={s.astrologer_name} size={32} />
                    <p className="text-white text-sm font-semibold truncate">{s.astrologer_name}</p>
                  </div>
                </div>
                <div className="p-3.5 flex flex-col gap-2">
                  <p className="text-sm font-semibold truncate">{s.title}</p>
                  {s.description && <p className="text-xs text-text-muted line-clamp-1">{s.description}</p>}
                  <button type="button" onClick={() => join(s)} className="btn-primary !py-2 text-sm mt-1">
                    Join Live
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">📅 Upcoming</h3>
          <div className="flex flex-col gap-2">
            {upcoming.map((s) => (
              <Card key={s.id} className="flex items-center gap-3">
                <Avatar src={s.avatar_url} name={s.astrologer_name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{s.title}</p>
                  <p className="text-xs text-text-muted truncate">{s.astrologer_name}</p>
                </div>
                <span className="text-xs text-text-muted shrink-0">{formatSchedule(s.scheduled_at)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CommentsSheet({ post, onClose }) {
  const [comments, setComments] = useState(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function load() {
    fetchPostComments(post.id).then(setComments).catch(() => setComments([]))
  }

  useEffect(load, [post.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await addPostComment(post.id, text.trim())
      setText('')
      load()
    } catch {
      toast.error('Could not post your comment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="card w-full sm:max-w-md rounded-b-none sm:rounded-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <h3 className="font-semibold text-sm">Comments</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-surface-light flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-3">
          {comments === null ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-text-muted">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar name={c.user_name} size={30} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{c.user_name} <span className="text-text-muted font-normal ml-1">{timeAgo(c.created_at)}</span></p>
                  <p className="text-sm text-text-secondary">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 shrink-0 pt-2 border-t border-divider">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            className="input-field flex-1 !py-2 text-sm"
          />
          <button type="submit" disabled={submitting} className="w-9 h-9 rounded-full bg-orange text-white flex items-center justify-center shrink-0">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  )
}

function CommunitySection() {
  const [posts, setPosts] = useState(null)
  const [error, setError] = useState(false)
  const [category, setCategory] = useState(null)
  const [sortBy, setSortBy] = useState('latest')
  const [showCreate, setShowCreate] = useState(false)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [commentsFor, setCommentsFor] = useState(null)

  function load() {
    setError(false)
    fetchCommunityPosts({ category }).then(setPosts).catch(() => setError(true))
  }

  useEffect(load, [category])

  const sortedPosts = posts
    ? [...posts].sort((a, b) => {
        if (sortBy === 'liked') return (b.likes_count || 0) - (a.likes_count || 0)
        if (sortBy === 'commented') return (b.comments_count || 0) - (a.comments_count || 0)
        return new Date(b.created_at) - new Date(a.created_at)
      })
    : []

  async function handleLike(post) {
    // Optimistic update, matching flutter_app
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, is_liked: !p.is_liked, likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    )
    try {
      await toggleCommunityPostLike(post.id)
    } catch {
      load()
    }
  }

  async function handleCreatePost(e) {
    e.preventDefault()
    if (!content.trim()) return
    setPosting(true)
    try {
      await createCommunityPost({ content: content.trim() })
      setContent('')
      setShowCreate(false)
      load()
    } catch {
      toast.error('Could not share your post.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${category === null ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary'}`}
        >
          All
        </button>
        {communityCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? null : c)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize ${category === c ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted">Sort:</span>
        {communitySortOptions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSortBy(s.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${sortBy === s.id ? 'bg-gold text-white' : 'bg-surface-light text-text-secondary'}`}
          >
            {s.label}
          </button>
        ))}
        <button type="button" onClick={() => setShowCreate((v) => !v)} className="ml-auto btn-outline !py-1.5 !px-3 text-xs">
          Share with Community
        </button>
      </div>

      {showCreate && (
        <Card>
          <form onSubmit={handleCreatePost} className="flex flex-col gap-2.5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind? Share astrology insights, experiences…"
              className="input-field resize-none"
              rows={3}
            />
            <button type="submit" className="btn-primary !py-2 text-sm w-fit" disabled={posting}>
              {posting ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
            </button>
          </form>
        </Card>
      )}

      {error ? (
        <Card className="text-center py-10"><p className="text-sm text-text-secondary">Could not load posts.</p></Card>
      ) : posts === null ? (
        <Card className="h-40 animate-pulse" />
      ) : sortedPosts.length === 0 ? (
        <Card className="text-center py-10"><p className="text-sm text-text-muted">No posts yet.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedPosts.map((post) => (
            <Card key={post.id}>
              <div className="flex items-start gap-2.5">
                <Avatar name={post.author_name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate">{post.author_name}</p>
                    {post.is_verified && <BadgeCheck size={13} className="text-orange shrink-0" />}
                  </div>
                  {post.author_sign && <p className="text-[11px] text-text-muted">{post.author_sign}</p>}
                </div>
                <span className="text-[11px] text-text-muted shrink-0">{timeAgo(post.created_at)}</span>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mt-3">{post.content}</p>
              <div className="flex items-center gap-5 mt-3 pt-3 border-t border-divider">
                <button
                  type="button"
                  onClick={() => handleLike(post)}
                  className={`inline-flex items-center gap-1.5 text-sm ${post.is_liked ? 'text-error' : 'text-text-muted'}`}
                >
                  <Heart size={16} className={post.is_liked ? 'fill-error' : ''} /> {post.likes_count || 0}
                </button>
                <button type="button" onClick={() => setCommentsFor(post)} className="inline-flex items-center gap-1.5 text-sm text-text-muted">
                  <MessageSquare size={16} /> {post.comments_count || 0}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {commentsFor && <CommentsSheet post={commentsFor} onClose={() => setCommentsFor(null)} />}
    </div>
  )
}

function LiveCommunityTab() {
  const [section, setSection] = useState('live')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSection('live')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${section === 'live' ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary'}`}
        >
          🔴 Live Sessions
        </button>
        <button
          type="button"
          onClick={() => setSection('community')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${section === 'community' ? 'bg-orange text-white' : 'bg-surface-light text-text-secondary'}`}
        >
          💬 Community
        </button>
      </div>
      {section === 'live' ? <LiveSessionsSection /> : <CommunitySection />}
    </div>
  )
}

// ── Family Members ───────────────────────────────────────────────────────
const emptyMember = { name: '', date_of_birth: '', time_of_birth: '', birth_place: '', relationship: '' }

function FamilyMembersTab() {
  const [members, setMembers] = useState(null)
  const [error, setError] = useState(false)
  const [form, setForm] = useState(emptyMember)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  function load() {
    setError(false)
    fetchFamilyMembers().then(setMembers).catch(() => setError(true))
  }

  useEffect(load, [])

  function startAdd() {
    setForm(emptyMember)
    setEditingId(null)
    setShowForm(true)
  }

  function startEdit(member) {
    setForm({
      name: member.name || '',
      date_of_birth: member.date_of_birth?.slice(0, 10) || '',
      time_of_birth: member.time_of_birth || '',
      birth_place: member.birth_place || '',
      relationship: member.relationship || '',
    })
    setEditingId(member.id)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.date_of_birth) {
      toast.error('Name and date of birth are required.')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateFamilyMember(editingId, form)
        toast.success('Family member updated.')
      } else {
        await createFamilyMember(form)
        toast.success('Family member added.')
      }
      setShowForm(false)
      load()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save this family member.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteFamilyMember(id)
      toast.success('Family member removed.')
      load()
    } catch {
      toast.error('Could not remove this family member.')
    }
  }

  if (error) return <Card className="text-center py-10"><p className="text-sm text-text-secondary">Could not load family members.</p></Card>
  if (members === null) return <Card className="h-40 animate-pulse" />

  return (
    <div className="flex flex-col gap-4">
      {!showForm && (
        <button type="button" onClick={startAdd} className="btn-outline w-fit inline-flex items-center gap-1.5 text-sm">
          <Plus size={15} /> Add Family Member
        </button>
      )}

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
              required
            />
            <input
              type="text"
              placeholder="Relationship (e.g. Mother)"
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
              className="input-field"
            />
            <input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
              className="input-field"
              required
            />
            <input
              type="time"
              value={form.time_of_birth}
              onChange={(e) => setForm((f) => ({ ...f, time_of_birth: e.target.value }))}
              className="input-field"
            />
            <input
              type="text"
              placeholder="Birth Place"
              value={form.birth_place}
              onChange={(e) => setForm((f) => ({ ...f, birth_place: e.target.value }))}
              className="input-field sm:col-span-2"
            />
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-primary text-sm !py-2" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : editingId ? 'Save Changes' : 'Add Member'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm !py-2">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {members.length === 0 && !showForm ? (
        <Card className="text-center py-10"><p className="text-sm text-text-muted">No family members added yet.</p></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Card key={m.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{m.name} {m.relationship && <span className="text-text-muted font-normal">· {m.relationship}</span>}</p>
                <p className="text-xs text-text-muted">{formatDate(m.date_of_birth)}{m.sun_sign ? ` · ${m.sun_sign}` : ''}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => startEdit(m)} className="w-8 h-8 rounded-lg hover:bg-surface-light flex items-center justify-center text-text-secondary">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => handleDelete(m.id)} className="w-8 h-8 rounded-lg hover:bg-error/10 flex items-center justify-center text-error">
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Notifications ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [notifications, setNotifications] = useState(null)
  const [error, setError] = useState(false)

  function load() {
    setError(false)
    fetchNotifications().then(setNotifications).catch(() => setError(true))
  }

  useEffect(load, [])

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      load()
    } catch {
      toast.error('Could not update notifications.')
    }
  }

  if (error) return <Card className="text-center py-10"><p className="text-sm text-text-secondary">Could not load notifications.</p></Card>
  if (notifications === null) return <Card className="h-40 animate-pulse" />

  return (
    <div className="flex flex-col gap-3">
      {notifications.length > 0 && (
        <button type="button" onClick={handleMarkAllRead} className="text-xs text-orange font-medium self-end">
          Mark all as read
        </button>
      )}
      {notifications.length === 0 ? (
        <Card className="text-center py-10"><p className="text-sm text-text-muted">No notifications yet.</p></Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <Card key={n.id} className={`flex items-start gap-3 ${!n.is_read ? 'border-orange/40' : ''}`}>
              <span className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center text-orange shrink-0">
                <Bell size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                {n.message && <p className="text-xs text-text-secondary mt-0.5">{n.message}</p>}
                <p className="text-[11px] text-text-muted mt-1">{formatDate(n.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Chat History ─────────────────────────────────────────────────────────
function ChatHistoryTab() {
  const [threads, setThreads] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchChatThreads().then(setThreads).catch(() => setError(true))
  }, [])

  if (error) return <Card className="text-center py-10"><p className="text-sm text-text-secondary">Could not load chat history.</p></Card>
  if (threads === null) return <Card className="h-40 animate-pulse" />
  if (threads.length === 0) return <Card className="text-center py-10"><p className="text-sm text-text-muted">No chat history yet.</p></Card>

  return (
    <div className="flex flex-col gap-2">
      {threads.map((t) => (
        <Link
          key={t.astrologer_id || t.id}
          to={`/chat/${t.astrologer_id}`}
          className="card flex items-center gap-3 hover:border-orange/50 transition-colors"
        >
          <Avatar src={t.astrologer_avatar_url} name={t.astrologer_name} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{t.astrologer_name || 'Astrologer'}</p>
            {t.last_message && <p className="text-xs text-text-muted truncate">{t.last_message}</p>}
          </div>
          {t.unread_count > 0 && (
            <span className="w-5 h-5 rounded-full bg-orange text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {t.unread_count}
            </span>
          )}
          <ChevronRight size={16} className="text-text-muted shrink-0" />
        </Link>
      ))}
    </div>
  )
}

// ── Consultations (+ leave a review) ─────────────────────────────────────
function ReviewForm({ consultation, onDone }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) {
      toast.error('Please pick a star rating.')
      return
    }
    setSaving(true)
    try {
      await submitAstrologerReview(consultation.astrologer_id, {
        rating,
        reviewText: text.trim() || undefined,
        consultationId: consultation.id,
      })
      toast.success('Thanks for your review!')
      onDone()
    } catch {
      toast.error('Could not submit your review.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-divider">
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => {
          const value = i + 1
          const filled = value <= (hoverRating || rating)
          return (
            <button
              key={value}
              type="button"
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(value)}
              aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
            >
              <Star size={20} className={filled ? 'fill-gold text-gold' : 'fill-transparent text-text-muted'} />
            </button>
          )
        })}
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Optional comment"
        className="input-field !py-2 text-sm"
      />
      <button type="submit" className="btn-primary !py-2 text-sm w-fit" disabled={saving}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : 'Submit Review'}
      </button>
    </form>
  )
}

function ConsultationsTab() {
  const [consultations, setConsultations] = useState(null)
  const [error, setError] = useState(false)
  const [reviewingId, setReviewingId] = useState(null)

  useEffect(() => {
    fetchConsultationHistory()
      .then(({ list }) => setConsultations(list))
      .catch(() => setError(true))
  }, [])

  if (error) {
    return <Card className="text-center py-10"><p className="text-sm text-text-secondary">Could not load consultation history right now.</p></Card>
  }
  if (consultations === null) return <Card className="h-40 animate-pulse" />
  if (consultations.length === 0) return <Card className="text-center py-10"><p className="text-sm text-text-muted">No past consultations yet.</p></Card>

  return (
    <div className="flex flex-col gap-2">
      {consultations.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-orange/10 flex items-center justify-center text-orange shrink-0">
                {c.type === 'chat' ? <MessageCircle size={16} /> : c.type === 'video' ? <Video size={16} /> : <PhoneCall size={16} />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium capitalize truncate">{c.astrologer_name || `${c.type} consultation`}</p>
                <p className="text-xs text-text-muted">{formatDate(c.created_at)} · {formatDuration(c.duration_seconds)}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-orange">₹{Number(c.total_amount || 0).toFixed(2)}</p>
              <p className="text-[11px] text-text-muted capitalize">{c.status}</p>
            </div>
          </div>
          {c.status === 'completed' && (
            reviewingId === c.id ? (
              <ReviewForm consultation={c} onDone={() => setReviewingId(null)} />
            ) : (
              <button type="button" onClick={() => setReviewingId(c.id)} className="text-xs text-orange font-medium mt-2.5">
                Rate this consultation
              </button>
            )
          )}
        </Card>
      ))}
    </div>
  )
}

export default function Account() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')

  useEffect(() => {
    setPageMeta('My Account | GrahVarta', 'Manage your GrahVarta profile, wallet and consultation history.')
  }, [])

  if (loading) {
    return (
      <div className="container-page py-24 flex flex-col items-center justify-center text-center gap-4 min-h-[40vh]">
        <span className="w-12 h-12 rounded-full border-4 border-surface-light border-t-orange animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  const activeTab = tabs.find((t) => t.id === tab)

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading level="h1" eyebrow="Your Account" title="My Account" />

      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl">
        <aside className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  tab === id ? 'bg-orange text-white' : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-colors whitespace-nowrap"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab && (
            <div className="mb-5">
              <h2 className="flex items-center gap-2.5 text-2xl font-bold">
                <activeTab.icon size={22} className="text-orange" /> {activeTab.label}
              </h2>
              <p className="text-sm text-text-secondary mt-1">{activeTab.description}</p>
            </div>
          )}
          {tab === 'profile' && <ProfileTab user={user} />}
          {tab === 'wallet' && <WalletTab />}
          {tab === 'horoscope' && <MyHoroscopeTab />}
          {tab === 'birthchart' && <BirthChartTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'live' && <LiveCommunityTab />}
          {tab === 'family' && <FamilyMembersTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'chats' && <ChatHistoryTab />}
          {tab === 'consultations' && <ConsultationsTab />}
        </div>
      </div>
    </div>
  )
}
