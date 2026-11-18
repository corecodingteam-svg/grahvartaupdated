import { useEffect, useState, useRef } from 'react'
import { MessageSquare, Send, Clock, Phone, Video, PhoneOff, Lock, ImagePlus } from 'lucide-react'
import { astrologerAPI } from '../../services/api'
import { getSocket } from '../../services/socket'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import { useChatUnlock } from '../../lib/useChatUnlock'
import EncryptedImage from '../../lib/EncryptedImage'
import { decodeMessage, fetchPeerKey, isChatReady, seal, chatKeyStatus, uploadEncryptedImage } from '../../lib/chatCrypto'
import { detectContactInfo, blockedMessageText } from '../../lib/contactFilter'

export default function ChatPage() {
  const [consultations, setConsultations] = useState([])
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [incomingRequest, setIncomingRequest] = useState(null)
  const [showGreetings, setShowGreetings] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const timerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const { user, astrologer } = useAuth()
  // End-to-end encrypted chat
  const { ensure, modal } = useChatUnlock()
  const [peerKey, setPeerKey] = useState(null) // user's public key; null = older app, unencrypted
  const peerKeyRef = useRef(null)
  const lastSentRef = useRef(null)
  const [notice, setNotice] = useState('')
  const [sendingImage, setSendingImage] = useState(false)
  const fileRef = useRef(null)
  useEffect(() => { peerKeyRef.current = peerKey }, [peerKey])

  // Unlock (or set up) the chat key once when the page opens, so accepting is instant
  useEffect(() => { ensure() }, [ensure])

  const astrologerName = astrologer?.display_name || user?.name || 'Astrologer'

  useEffect(() => {
    astrologerAPI.getConsultationHistory()
      .then(res => setConsultations(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Listen for incoming consultation requests
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onRequest = (data) => {
      setIncomingRequest(data)
    }

    const onStarted = (data) => {
      setIncomingRequest(null)
      // Start local timer
      setTimerSeconds(0)
      timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000)
      // Refresh consultation list
      astrologerAPI.getConsultationHistory()
        .then(res => setConsultations(res.data.data || []))
        .catch(() => {})
    }

    const onEnded = () => {
      clearInterval(timerRef.current)
      setTimerSeconds(0)
      setSelected(null)
      astrologerAPI.getConsultationHistory()
        .then(res => setConsultations(res.data.data || []))
        .catch(() => {})
    }

    socket.on('new_consultation_request', onRequest)
    socket.on('consultation_started', onStarted)
    socket.on('consultation_ended', onEnded)

    return () => {
      socket.off('new_consultation_request', onRequest)
      socket.off('consultation_started', onStarted)
      socket.off('consultation_ended', onEnded)
    }
  }, [])

  function greetingMessages(userName) {
    return [
      `🙏 Namaste ${userName}! I am ${astrologerName}. Welcome. I am here to guide you with the blessings of the stars.`,
      `✨ Greetings ${userName}! I am ${astrologerName}. Please share your date, time, and place of birth so I can begin your reading.`,
      `🔮 Welcome dear ${userName}! I am ${astrologerName}. Let me connect with the cosmic energies and guide you on your path.`,
      `🙏 नमस्ते ${userName} जी! मैं ${astrologerName} हूँ। आपका स्वागत है। कृपया अपनी जन्म तिथि, समय और स्थान बताएं।`,
      `⭐ प्रणाम ${userName} जी! मैं ${astrologerName} हूँ। ग्रह-नक्षत्र आपको यहाँ लेकर आए हैं। बताइए, आपकी क्या समस्या है?`,
      `🌙 नमस्ते ${userName} जी! मैं ${astrologerName} हूँ। आपकी सेवा में उपस्थित हूँ। अपनी परेशानी निःसंकोच साझा करें।`,
    ]
  }

  async function acceptRequest() {
    const socket = getSocket()
    if (!socket || !incomingRequest) return
    // Chats are end-to-end encrypted: unlock the key before accepting so the user isn't billed meanwhile
    if (incomingRequest.type === 'chat' && !(await ensure())) return
    socket.emit('accept_consultation', { consultation_id: incomingRequest.consultation_id })
    const newConsultation = {
      id: incomingRequest.consultation_id,
      user_name: incomingRequest.user?.name,
      type: incomingRequest.type,
      status: 'active',
      duration_seconds: 0,
    }
    setConsultations(prev => [newConsultation, ...prev])
    setSelected(newConsultation)
    setShowGreetings(true)
    setIncomingRequest(null)
  }

  // Sends text or a photo payload — sealed end-to-end when the user's app supports it
  function emitPayload(payload, plain) {
    const socket = getSocket()
    if (!socket || !selected) return false
    if (isChatReady() && peerKeyRef.current) {
      lastSentRef.current = { id: selected.id, payload }
      socket.emit('send_message', { consultation_id: selected.id, content: seal(payload, peerKeyRef.current), message_type: 'e2e' })
      return true
    }
    if (!plain) return false
    socket.emit('send_message', { consultation_id: selected.id, content: plain, message_type: 'text' })
    return true
  }

  // Phone numbers / email addresses may not be shared. The server can't read
  // encrypted chats, so the check runs here and the attempt is reported.
  function sendText(text) {
    const check = detectContactInfo(text)
    if (check.blocked) {
      setNotice(blockedMessageText(check.detected))
      getSocket()?.emit('report_blocked_message', { consultation_id: selected.id, detected: check.detected, content: text })
      return false
    }
    setNotice('')
    return emitPayload({ t: 'text', b: text }, text)
  }

  function sendGreeting(text) {
    if (!selected) return
    sendText(text)
    setShowGreetings(false)
  }

  async function sendImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/') || !selected) return
    setSendingImage(true)
    try {
      emitPayload(await uploadEncryptedImage(file))
    } catch {
      setNotice('Photo could not be sent. Please try again.')
    } finally {
      setSendingImage(false)
    }
  }

  function rejectRequest() {
    const socket = getSocket()
    if (!socket || !incomingRequest) return
    socket.emit('reject_consultation', { consultation_id: incomingRequest.consultation_id })
    setIncomingRequest(null)
  }

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  useEffect(() => {
    if (!selected) return
    let live = true
    setPeerKey(null)
    setNotice('')
    ;(async () => {
      try {
        const res = await astrologerAPI.getConsultationMessages(selected.id)
        const rows = res.data.data || []
        if (rows.some(m => m.message_type === 'e2e') && !isChatReady()) await ensure()
        if (live) setMessages(rows.map(decodeMessage))
      } catch { /* ignore */ }
      const key = await fetchPeerKey(selected.id)
      if (live) setPeerKey(key)
    })()

    const socket = getSocket()
    if (socket) {
      socket.emit('join_consultation', { consultation_id: selected.id })
      const handler = (msg) => {
        if (msg.consultation_id === selected.id) setMessages(p => [...p, decodeMessage(msg)])
      }
      // A chat key changed (someone reset their chat PIN): reload keys and resend once
      const onStale = async () => {
        const last = lastSentRef.current
        lastSentRef.current = null
        await chatKeyStatus().catch(() => {})
        const key = await fetchPeerKey(selected.id)
        setPeerKey(key)
        peerKeyRef.current = key
        if (last && last.id === selected.id && isChatReady() && key) {
          socket.emit('send_message', { consultation_id: selected.id, content: seal(last.payload, key), message_type: 'e2e' })
        }
      }
      const onBlocked = (data) => setNotice(data?.message || 'Message not sent.')
      socket.on('new_message', handler)
      socket.on('e2e_key_stale', onStale)
      socket.on('message_blocked', onBlocked)
      return () => {
        live = false
        socket.off('new_message', handler)
        socket.off('e2e_key_stale', onStale)
        socket.off('message_blocked', onBlocked)
      }
    }
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function sendMessage() {
    if (!input.trim() || !selected) return
    if (sendText(input.trim())) setInput('') // keep blocked text so it can be edited
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {modal}

      {/* Incoming Request Banner */}
      {incomingRequest && (
        <div className="flex items-center justify-between gap-4 bg-orange/15 border border-orange/40 rounded-2xl px-5 py-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange/30 flex items-center justify-center text-orange font-bold">
              {incomingRequest.user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-text-primary">{incomingRequest.user?.name} is requesting a consultation</p>
              <p className="text-sm text-text-muted capitalize">
                {incomingRequest.type === 'chat' ? '💬 Chat' : incomingRequest.type === 'voice' ? '📞 Voice Call' : '📹 Video Call'}
                {' · '}₹{incomingRequest.rate}/min
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={rejectRequest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error/20 text-error hover:bg-error/30 transition-colors text-sm font-medium">
              <PhoneOff size={15} /> Reject
            </button>
            <button onClick={acceptRequest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-success text-white hover:bg-success/90 transition-colors text-sm font-medium">
              {incomingRequest.type === 'voice' ? <Phone size={15} /> : incomingRequest.type === 'video' ? <Video size={15} /> : <MessageSquare size={15} />}
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Active session timer */}
      {timerSeconds > 0 && (
        <div className="flex items-center gap-3 bg-success/10 border border-success/30 rounded-xl px-4 py-2 text-sm">
          <Clock size={14} className="text-success" />
          <span className="text-success font-mono font-bold">{formatTime(timerSeconds)}</span>
          <span className="text-text-muted">Session in progress</span>
        </div>
      )}

    <div className="flex gap-4 flex-1 min-h-0">
      {/* Consultation List */}
      <div className={`flex flex-col ${selected ? 'hidden lg:flex' : 'flex'} w-full lg:w-72 shrink-0`}>
        <h1 className="text-xl font-bold mb-4">Consultations</h1>
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
          </div>
        ) : consultations.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <MessageSquare size={36} className="text-text-muted" />
            <p className="text-text-secondary text-sm text-center">No consultations yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 overflow-y-auto">
            {consultations.map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                  selected?.id === c.id ? 'bg-orange/15 border border-orange/30' : 'hover:bg-surface-light border border-transparent'
                }`}>
                <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center text-orange font-semibold shrink-0">
                  {c.user_name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.user_name}</p>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-text-muted capitalize">{c.type}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${
                      c.status === 'active' ? 'bg-success/20 text-success'
                      : c.status === 'completed' ? 'bg-blue-500/20 text-blue-400'
                      : c.status === 'cancelled' ? 'bg-red-500 text-white'
                      : 'bg-orange/20 text-orange'
                    }`}>{c.status}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Window */}
      {selected ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border mb-4">
            <button onClick={() => setSelected(null)} className="lg:hidden text-text-muted hover:text-text-primary">←</button>
            <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center text-orange font-semibold">
              {selected.user_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{selected.user_name}</p>
              <p className="text-xs text-text-muted capitalize">{selected.type} · {selected.status}</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-text-muted text-xs">
              <Clock size={12} />
              {Math.round((selected.duration_seconds || 0) / 60)}m
            </div>
          </div>

          {/* Greeting quick-send overlay */}
          {showGreetings && messages.length === 0 && (
            <div className="mb-4 p-4 bg-orange/5 border border-orange/20 rounded-2xl space-y-2">
              <p className="text-xs text-text-muted font-medium mb-3">👋 Send a greeting to {selected.user_name}</p>
              {greetingMessages(selected.user_name || 'there').map((msg, i) => (
                <button key={i} onClick={() => sendGreeting(msg)}
                  className="w-full text-left text-sm px-4 py-3 rounded-xl bg-surface hover:bg-orange/10 hover:border-orange/40 border border-border transition-colors text-text-secondary hover:text-text-primary">
                  {msg}
                </button>
              ))}
              <button onClick={() => setShowGreetings(false)}
                className="text-xs text-text-muted hover:text-text-primary mt-1 w-full text-center">
                Skip, I'll type my own
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            <p className="mx-auto max-w-sm flex items-start gap-2 text-[11px] leading-snug text-text-secondary bg-surface-light border border-border rounded-xl px-3 py-2 text-center">
              <Lock size={12} className="mt-0.5 shrink-0 text-orange" />
              {peerKey
                ? 'Messages are end-to-end encrypted. No one outside this chat, not even Grahvarta, can read them.'
                : 'Your chats are secure and encrypted in transit. Your conversation stays private.'}
            </p>
            {messages.length === 0 && !showGreetings && (
              <p className="text-text-muted text-sm text-center py-8">No messages yet</p>
            )}
            {messages.map((m, idx) => (
              <div
                key={m.id}
                style={{ animationDelay: `${idx === messages.length - 1 ? 0 : 0}ms` }}
                className={`flex ${m.sender_type === 'astrologer' ? 'justify-end' : 'justify-start'} animate-message-in`}
              >
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  m.sender_type === 'astrologer'
                    ? 'bg-orange text-white rounded-br-sm'
                    : 'bg-surface-light text-text-primary rounded-bl-sm border border-border'
                }`}>
                  {m.type === 'e2e_image'
                    ? <EncryptedImage payload={m.payload} />
                    : m.type === 'image'
                      ? <img src={m.content || m.message} alt="Shared in chat" className="max-w-[240px] max-h-[240px] rounded-xl object-cover" />
                      : <p>{m.content || m.message}</p>}
                  <p className={`text-xs mt-1 ${m.sender_type === 'astrologer' ? 'text-white/60' : 'text-text-muted'}`}>
                    {format(new Date(m.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {selected.status === 'active' && notice && (
            <p className="mt-3 rounded-xl bg-error/10 border border-error/20 px-3 py-2 text-xs text-error">{notice}</p>
          )}
          {selected.status === 'active' && (
            <div className="flex items-center gap-3 pt-4 border-t border-border mt-4">
              {peerKey && (
                <>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={sendImage} />
                  <button onClick={() => fileRef.current?.click()} disabled={sendingImage} aria-label="Send a photo"
                    className="w-12 h-12 bg-surface-light border border-border rounded-xl flex items-center justify-center text-text-secondary disabled:opacity-40">
                    <ImagePlus size={18} />
                  </button>
                </>
              )}
              <input
                className="input-field flex-1"
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} disabled={!input.trim()}
                className="w-12 h-12 bg-orange rounded-xl flex items-center justify-center hover:bg-orange-light transition-colors disabled:opacity-40">
                <Send size={18} className="text-white" />
              </button>
            </div>
          )}
          {selected.status !== 'active' && (
            <p className="text-center text-text-muted text-sm pt-4 border-t border-border mt-4">
              This consultation has ended
            </p>
          )}
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3">
          <MessageSquare size={40} className="text-text-muted" />
          <p className="text-text-secondary">Select a consultation to view messages</p>
        </div>
      )}
    </div>
    </div>
  )
}
