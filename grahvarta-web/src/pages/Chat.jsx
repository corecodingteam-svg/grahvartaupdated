import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAstrologerById } from '../data/astrologers'
import { setPageMeta } from '../lib/demo'

const cannedReplies = [
  'I sense there is more to your situation — could you tell me a bit more?',
  'The planetary positions suggest this phase will bring positive change soon.',
  'That is a common concern — with patience and the right remedies, things will improve.',
  'Your chart shows strong potential here. Let us look at it more closely.',
  'Trust the process — the stars indicate favourable timing ahead.',
]

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Chat() {
  const { id } = useParams()
  const astrologer = getAstrologerById(id)
  const navigate = useNavigate()

  const [seconds, setSeconds] = useState(0)
  const [messages, setMessages] = useState(() =>
    astrologer
      ? [
          { id: 'm1', from: 'astrologer', text: `Namaste! I am ${astrologer.name}. How can I help you today?` },
          { id: 'm2', from: 'user', text: 'Hi, I wanted to ask about my career prospects this year.' },
          { id: 'm3', from: 'astrologer', text: 'Sure, let me take a look at your chart. Could you share your date of birth?' },
        ]
      : []
  )
  const [input, setInput] = useState('')
  const replyIndexRef = useRef(0)
  const replyTimeoutRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (astrologer) {
      setPageMeta(`Chat with ${astrologer.name} | GrahVarta`, `Demo chat consultation with ${astrologer.name}.`)
    }
  }, [astrologer])

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current)
    }
  }, [])

  if (!astrologer) {
    return <Navigate to="/astrologers" replace />
  }

  function sendMessage() {
    const text = input.trim()
    if (!text) return
    const userMsg = { id: `u-${Date.now()}`, from: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    replyTimeoutRef.current = setTimeout(() => {
      const reply = cannedReplies[replyIndexRef.current % cannedReplies.length]
      replyIndexRef.current += 1
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, from: 'astrologer', text: reply }])
    }, 1200)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function endChat() {
    toast('Demo chat ended', { icon: '✨' })
    navigate(`/astrologer/profile/${id}`)
  }

  return (
    <div className="container-page py-4 sm:py-6 flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)]">
      <h1 className="sr-only">Chat with {astrologer.name}</h1>
      {/* Header */}
      <div className="card flex items-center justify-between gap-3 !py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/astrologer/profile/${id}`)}
            className="text-text-secondary hover:text-orange shrink-0"
            aria-label="Back to profile"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="relative shrink-0">
            <img src={astrologer.photo} alt={astrologer.name} className="w-10 h-10 rounded-xl object-cover border border-border" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                astrologer.online ? 'bg-success' : 'bg-text-muted'
              }`}
              aria-label={astrologer.online ? 'Online' : 'Offline'}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{astrologer.name}</p>
            <p className="text-xs text-text-secondary">₹{astrologer.pricePerMin}/min</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-mono text-gold" aria-label="Consultation duration">
            {formatTime(seconds)}
          </span>
          <button type="button" onClick={endChat} className="btn-outline !py-1.5 !px-3 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange">
            End Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.from === 'user' ? 'bg-orange text-white' : 'bg-card border border-border text-text-primary'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-2">
        <div className="flex items-center gap-2 card !p-2">
          <label htmlFor="chat-message-input" className="sr-only">
            Type your message
          </label>
          <input
            id="chat-message-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 bg-transparent outline-none text-sm px-2 text-text-primary placeholder:text-text-muted"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-orange flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-orange"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[11px] text-text-muted text-center mt-2">This is a demo chat — replies are simulated.</p>
      </div>
    </div>
  )
}
