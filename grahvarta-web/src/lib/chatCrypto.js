// End-to-end encrypted chat — browser side.
//
// Same format as the Flutter apps (lib/services/chat_crypto.dart): one X25519
// key pair per account, messages sealed with NaCl box (tweetnacl), and the
// private key backed up on the server locked with an Argon2id key derived
// from the owner's 6-digit chat PIN. The server never sees the PIN, the
// private key or any message text.
import nacl from 'tweetnacl'
import { argon2id } from 'hash-wasm'

const LOCAL_KEY = 'grahvarta_chat_e2e_key'
export const KDF = { alg: 'argon2id', m: 65536, t: 3, p: 1 }

let config = { apiBase: '', getToken: () => null }
/** apiBase is the URL that '/chat-keys/me' etc. are appended to (ends in /api). */
export function configureChatCrypto(c) {
  config = { ...config, ...c }
}

let priv = null // Uint8Array(32)
let pub = null // base64
const shared = new Map() // other pub -> precomputed box key

const enc = new TextEncoder()
const dec = new TextDecoder()
const b64 = (u8) => {
  let s = ''
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(s)
}
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export class ChatKeyError extends Error {}

async function call(path, { method = 'GET', body } = {}) {
  const token = config.getToken()
  const res = await fetch(`${config.apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* empty body */ }
  if (res.status === 409) throw new ChatKeyError('A chat PIN is already set for this account. Enter it to unlock.')
  if (!res.ok) throw new ChatKeyError(data?.message || `Server error (${res.status})`)
  return data
}

function use(secret) {
  priv = secret
  pub = b64(nacl.box.keyPair.fromSecretKey(secret).publicKey)
  shared.clear()
}

function saveLocal(secret) {
  use(secret)
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ pub, priv: b64(secret) })) } catch { /* storage blocked */ }
}

/** Removes the key from this browser (on logout). The locked backup stays on the server. */
export function clearChatKey() {
  priv = null
  pub = null
  shared.clear()
  try { localStorage.removeItem(LOCAL_KEY) } catch { /* storage blocked */ }
}

export const isChatReady = () => !!priv

/** 'ready' | 'needsSetup' | 'locked' */
export async function chatKeyStatus() {
  const { key } = await call('/chat-keys/me')
  if (!key) {
    clearChatKey()
    return 'needsSetup'
  }
  if (priv && pub === key.public_key) return 'ready'
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')
    if (saved && saved.pub === key.public_key) {
      use(unb64(saved.priv))
      return 'ready'
    }
  } catch { /* corrupt or blocked storage */ }
  clearChatKey()
  return 'locked'
}

const deriveKey = (pin, salt, kdf) =>
  argon2id({ password: pin, salt, parallelism: kdf.p, iterations: kdf.t, memorySize: kdf.m, hashLength: 32, outputType: 'binary' })

async function upload(secret, pin, reset) {
  const salt = nacl.randomBytes(16)
  const nonce = nacl.randomBytes(24)
  const wrapKey = await deriveKey(pin, salt, KDF)
  const body = {
    public_key: b64(nacl.box.keyPair.fromSecretKey(secret).publicKey),
    enc_private_key: b64(nacl.secretbox(secret, nonce, wrapKey)),
    salt: b64(salt),
    nonce: b64(nonce),
    kdf: KDF,
    reset,
  }
  await call('/chat-keys/me', { method: 'PUT', body })
  saveLocal(secret)
}

/** First time: create the account's chat key, locked with `pin`. */
export const setupChatKey = (pin) => upload(nacl.box.keyPair().secretKey, pin, false)

/** Forgot PIN: new key; chats sealed to the old key can no longer be opened. */
export const resetChatKey = (pin) => upload(nacl.box.keyPair().secretKey, pin, true)

/** Unlocks the server backup. Resolves false for a wrong PIN. */
export async function unlockChatKey(pin) {
  const { key } = await call('/chat-keys/me')
  if (!key) throw new ChatKeyError('No chat key found. Set a chat PIN first.')
  const wrapKey = await deriveKey(pin, unb64(key.salt), key.kdf)
  const secret = nacl.secretbox.open(unb64(key.enc_private_key), unb64(key.nonce), wrapKey)
  if (!secret) return false
  if (b64(nacl.box.keyPair.fromSecretKey(secret).publicKey) !== key.public_key) return false
  saveLocal(secret)
  return true
}

/** The other person's public key for a consultation (null if they don't use encrypted chat yet). */
export async function fetchPeerKey(consultationId) {
  try {
    const data = await call(`/chat-keys/consultation/${consultationId}`)
    return data?.peer_key || null
  } catch {
    return null
  }
}

function boxKey(otherPub) {
  let k = shared.get(otherPub)
  if (!k) {
    k = nacl.box.before(unb64(otherPub), priv)
    shared.set(otherPub, k)
  }
  return k
}

/** Seals a payload ({t:'text', b} or {t:'image', u, k, n, m}) for `peerPub`; returns the envelope string. */
export function seal(payload, peerPub) {
  if (!priv) throw new ChatKeyError('Chat is locked')
  const nonce = nacl.randomBytes(24)
  const c = nacl.box.after(enc.encode(JSON.stringify(payload)), nonce, boxKey(peerPub))
  return JSON.stringify({ v: 1, s: pub, r: peerPub, n: b64(nonce), c: b64(c) })
}

/** Opens an envelope; null if it wasn't sealed to this account's current key. */
export function open(envelope) {
  if (!priv) return null
  try {
    const env = JSON.parse(envelope)
    if (env.v !== 1) return null
    const other = env.s === pub ? env.r : env.r === pub ? env.s : null
    if (!other) return null
    const plain = nacl.box.open.after(unb64(env.c), unb64(env.n), boxKey(other))
    return plain ? JSON.parse(dec.decode(plain)) : null
  } catch {
    return null
  }
}

export const isEnvelope = (s) => typeof s === 'string' && s.startsWith('{"v":1,')

export const LOCKED_TEXT = "🔒 This message can't be shown on this device"

/**
 * Makes a stored or received message readable. Returns {...msg, type, content}
 * with type 'text' | 'e2e_image' | the original type.
 */
export function decodeMessage(msg) {
  const type = msg.message_type || msg.type || 'text'
  const raw = msg.content ?? msg.message ?? ''
  if (type !== 'e2e') return { ...msg, type, content: raw }
  const p = open(raw)
  if (!p) return { ...msg, type: 'text', content: LOCKED_TEXT }
  if (p.t === 'image') return { ...msg, type: 'e2e_image', content: JSON.stringify(p), payload: p }
  return { ...msg, type: 'text', content: p.b || '' }
}

/** Short preview for chat lists. */
export function previewOf(text) {
  if (!isEnvelope(text)) return text || ''
  const p = open(text)
  if (!p) return '🔒 Encrypted message'
  return p.t === 'image' ? '📷 Photo' : p.b || ''
}

/** Encrypts an image File/Blob, uploads the ciphertext and returns the payload to seal. */
export async function uploadEncryptedImage(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const key = nacl.randomBytes(32)
  const nonce = nacl.randomBytes(24)
  const form = new FormData()
  form.append('file', new Blob([nacl.secretbox(bytes, nonce, key)], { type: 'application/octet-stream' }), 'image.bin')
  const token = config.getToken()
  const res = await fetch(`${config.apiBase}/consultations/upload-encrypted`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.data?.url) throw new ChatKeyError(data?.message || 'Image upload failed')
  return { t: 'image', u: data.data.url, k: b64(key), n: b64(nonce), m: file.type || 'image/jpeg' }
}

const imageCache = new Map()
/** Downloads and decrypts an image payload; resolves to an object URL. */
export function loadImage(payload) {
  if (!imageCache.has(payload.u)) {
    imageCache.set(payload.u, (async () => {
      const res = await fetch(payload.u)
      if (!res.ok) throw new ChatKeyError('Image not available')
      const plain = nacl.secretbox.open(new Uint8Array(await res.arrayBuffer()), unb64(payload.n), unb64(payload.k))
      if (!plain) throw new ChatKeyError('Image could not be decrypted')
      return URL.createObjectURL(new Blob([plain], { type: payload.m || 'image/jpeg' }))
    })())
  }
  return imageCache.get(payload.u)
}
