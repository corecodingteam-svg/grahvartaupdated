import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { SOCKET_URL, getToken } from '../lib/api'
import { decodeMessage, fetchPeerKey, isChatReady, seal, chatKeyStatus, uploadEncryptedImage } from '../lib/chatCrypto'
import { detectContactInfo, blockedMessageText } from '../lib/contactFilter'

// Drives the socket.io consultation lifecycle exactly as the Flutter app
// does (backend/src/socket/index.js) — request_consultation creates the
// session server-side (with wallet/balance checks), the astrologer accepts
// it, then messages/billing flow over the same socket. Shared by Chat and
// Call since the queue/accept/end lifecycle is identical between them; Call
// additionally fetches an Agora token once status is 'active'.
//
// Status machine: connecting -> queued -> active -> ended
//                            \-> rejected / insufficient_balance / error

export function useConsultation({ astrologerId, type, enabled = true }) {
  const socketRef = useRef(null)
  const consultationIdRef = useRef(null)
  const statusRef = useRef('connecting')

  const [status, setStatusState] = useState('connecting')
  const [consultationId, setConsultationIdState] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [peerTyping, setPeerTyping] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [notice, setNotice] = useState('') // e.g. "message not sent" for contact details
  // End-to-end encryption: the astrologer's public key (null = they use an older app)
  const [peerKey, setPeerKeyState] = useState(null)
  const peerKeyRef = useRef(null)
  const lastSentRef = useRef(null)
  const setPeerKey = (k) => { peerKeyRef.current = k; setPeerKeyState(k) }
  const refreshPeerKey = async (id) => { if (id) setPeerKey(await fetchPeerKey(id)) }

  const setStatus = useCallback((next) => {
    statusRef.current = next
    setStatusState(next)
  }, [])

  const setConsultationId = useCallback((next) => {
    consultationIdRef.current = next
    setConsultationIdState(next)
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    const token = getToken()
    if (!token) {
      setStatus('error')
      setErrorMessage('You must be logged in.')
      return undefined
    }

    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('set_role', { role: 'user' })
      socket.emit('request_consultation', { astrologer_id: astrologerId, type })
    })

    socket.on('consultation_queued', (data) => {
      setStatus('queued')
      if (data?.consultation_id) {
        setConsultationId(data.consultation_id)
        refreshPeerKey(data.consultation_id)
      }
    })

    socket.on('consultation_started', (data) => {
      setStatus('active')
      if (data?.consultation_id) setConsultationId(data.consultation_id)
      refreshPeerKey(data?.consultation_id || consultationIdRef.current)
    })

    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, decodeMessage(msg)])
    })

    // A chat key changed (someone reset their chat PIN): reload keys and resend once
    socket.on('e2e_key_stale', async () => {
      const last = lastSentRef.current
      lastSentRef.current = null
      await chatKeyStatus().catch(() => {})
      await refreshPeerKey(consultationIdRef.current)
      if (last && isChatReady() && peerKeyRef.current) {
        socket.emit('send_message', { consultation_id: consultationIdRef.current, content: seal(last, peerKeyRef.current), message_type: 'e2e' })
      }
    })

    socket.on('message_blocked', (data) => setNotice(data?.message || 'Message not sent.'))

    socket.on('peer_typing', (data) => {
      setPeerTyping(!!data?.typing)
    })

    socket.on('billing_tick', (data) => {
      if (typeof data?.elapsed_seconds === 'number') setElapsedSeconds(data.elapsed_seconds)
    })

    socket.on('consultation_ended', () => {
      setStatus('ended')
    })

    socket.on('consultation_rejected', () => {
      setStatus('rejected')
    })

    socket.on('insufficient_balance', () => {
      setStatus('insufficient_balance')
    })

    socket.on('error', (err) => {
      setStatus('error')
      setErrorMessage(typeof err === 'string' ? err : err?.message || 'Something went wrong.')
    })

    socket.on('connect_error', () => {
      setStatus('error')
      setErrorMessage('Could not connect. Please check your connection.')
    })

    return () => {
      if (consultationIdRef.current && statusRef.current === 'active') {
        socket.emit('end_consultation', { consultation_id: consultationIdRef.current })
      }
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [astrologerId, type, enabled])

  const emitPayload = (payload, plain, plainType = 'text') => {
    const id = consultationIdRef.current
    if (isChatReady() && peerKeyRef.current) {
      lastSentRef.current = payload
      socketRef.current.emit('send_message', { consultation_id: id, content: seal(payload, peerKeyRef.current), message_type: 'e2e' })
    } else if (plain) {
      socketRef.current.emit('send_message', { consultation_id: id, content: plain, message_type: plainType })
    } else {
      return false
    }
    return true
  }

  /** Returns false (and sets `notice`) when the text contains contact details. */
  const sendMessage = useCallback((content) => {
    const text = content.trim()
    if (!socketRef.current || !consultationIdRef.current || !text) return false
    // Phone numbers / email addresses may not be shared. The server can't read
    // encrypted chats, so the check runs here and the attempt is reported.
    const check = detectContactInfo(text)
    if (check.blocked) {
      setNotice(blockedMessageText(check.detected))
      socketRef.current.emit('report_blocked_message', { consultation_id: consultationIdRef.current, detected: check.detected, content: text })
      return false
    }
    setNotice('')
    emitPayload({ t: 'text', b: text }, text)
    return true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Sends a photo (end-to-end encrypted chats only). */
  const sendImage = useCallback(async (file) => {
    if (!socketRef.current || !consultationIdRef.current || !isChatReady() || !peerKeyRef.current) return false
    const payload = await uploadEncryptedImage(file)
    return emitPayload(payload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTyping = useCallback((typing) => {
    if (!socketRef.current || !consultationIdRef.current) return
    socketRef.current.emit(typing ? 'typing_start' : 'typing_stop', {
      consultation_id: consultationIdRef.current,
    })
  }, [])

  const endConsultation = useCallback(() => {
    if (!socketRef.current || !consultationIdRef.current) return
    socketRef.current.emit('end_consultation', { consultation_id: consultationIdRef.current })
  }, [])

  return {
    socket: socketRef,
    status,
    consultationId,
    errorMessage,
    messages,
    peerTyping,
    elapsedSeconds,
    sendMessage,
    sendImage,
    notice,
    endToEnd: !!peerKey,
    setTyping,
    endConsultation,
  }
}
