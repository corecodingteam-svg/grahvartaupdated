import { useCallback, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { chatKeyStatus, setupChatKey, unlockChatKey, resetChatKey } from './chatCrypto'

const COPY = {
  create: {
    title: 'Set your chat PIN',
    text: "Your chats are end-to-end encrypted. This 6-digit PIN unlocks them on a new phone or browser. We can't see it or recover it.",
    button: 'Save PIN',
  },
  unlock: {
    title: 'Enter your chat PIN',
    text: 'Unlock your end-to-end encrypted chats in this browser.',
    button: 'Unlock chats',
  },
  reset: {
    title: 'Set a new chat PIN',
    text: 'Chats sent before the reset can no longer be opened. New chats will work normally.',
    button: 'Save PIN',
  },
}

/**
 * `ensure()` resolves true once this browser holds the account's chat key,
 * asking for the chat PIN when needed; false if the user backs out.
 * Render `modal` somewhere in the page.
 */
export function useChatUnlock() {
  const [mode, setMode] = useState(null) // null | 'create' | 'unlock' | 'reset'
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [askReset, setAskReset] = useState(false)
  const resolver = useRef(null)

  const finish = useCallback((ok) => {
    setMode(null)
    setPin('')
    setConfirm('')
    setError('')
    setAskReset(false)
    resolver.current?.(ok)
    resolver.current = null
  }, [])

  const ensure = useCallback(async () => {
    let status
    try {
      status = await chatKeyStatus()
    } catch {
      // Key service unreachable: continue without end-to-end encryption. The
      // server still refuses unencrypted messages once both people have keys.
      return true
    }
    if (status === 'ready') return true
    return new Promise((resolve) => {
      resolver.current = resolve
      setMode(status === 'needsSetup' ? 'create' : 'unlock')
    })
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(pin)) return setError('Enter 6 digits')
    if (mode !== 'unlock' && pin !== confirm) return setError("PINs don't match")
    setBusy(true)
    setError('')
    try {
      if (mode === 'create') await setupChatKey(pin)
      else if (mode === 'reset') await resetChatKey(pin)
      else if (!(await unlockChatKey(pin))) {
        setPin('')
        setError('Wrong PIN. Try again.')
        return
      }
      finish(true)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const digits = (v) => v.replace(/\D/g, '').slice(0, 6)
  const c = mode && COPY[mode]

  const modal = !mode ? null : (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-surface border border-border p-6 shadow-xl text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-orange/15 flex items-center justify-center text-orange">
          <Lock size={26} />
        </div>
        {askReset ? (
          <>
            <h2 className="text-lg font-bold text-text-primary">Reset chat PIN?</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Because your chats are end-to-end encrypted, nobody, including Grahvarta, can recover them without your PIN.
              If you reset it, your earlier chats will no longer be readable on any device.
            </p>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setAskReset(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm text-text-secondary">Cancel</button>
              <button type="button" onClick={() => { setAskReset(false); setMode('reset'); setPin(''); setConfirm(''); setError('') }}
                className="flex-1 rounded-xl bg-error py-2.5 text-sm font-semibold text-white">Reset</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-text-primary">{c.title}</h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">{c.text}</p>
            <input
              autoFocus type="password" inputMode="numeric" autoComplete="off" placeholder={mode === 'unlock' ? 'Chat PIN' : 'New 6-digit PIN'}
              value={pin} onChange={(e) => setPin(digits(e.target.value))} disabled={busy}
              className="input-field mt-5 w-full text-center text-xl tracking-[0.5em]"
            />
            {mode !== 'unlock' && (
              <input
                type="password" inputMode="numeric" autoComplete="off" placeholder="Confirm PIN"
                value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} disabled={busy}
                className="input-field mt-3 w-full text-center text-xl tracking-[0.5em]"
              />
            )}
            {error && <p className="mt-3 text-sm text-error">{error}</p>}
            <button type="submit" disabled={busy}
              className="mt-5 w-full rounded-xl bg-orange py-3 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Please wait…' : c.button}
            </button>
            <div className="mt-3 flex justify-between text-sm">
              <button type="button" disabled={busy} onClick={() => finish(false)} className="text-text-muted hover:text-text-primary">Not now</button>
              {mode === 'unlock' && (
                <button type="button" disabled={busy} onClick={() => setAskReset(true)} className="text-orange hover:underline">Forgot PIN?</button>
              )}
            </div>
          </>
        )}
      </form>
    </div>
  )

  return { ensure, modal }
}
