// Firebase Analytics (GA4) for this site.
//
// Configure with build-time env vars (public values from Firebase console →
// Project settings → Your apps → Web app):
//   VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, VITE_FIREBASE_MEASUREMENT_ID
// When they're missing (local dev, or before setup) every call is a no-op.
//
// Page views are collected automatically by GA4 "enhanced measurement"
// (initial load + SPA history changes), so routes don't need to log them.
// The Firebase SDK is loaded lazily so it never blocks first paint.

const env = import.meta.env
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'grahvarta-astrology',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '84896359635',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'grahvarta-astrology.firebaseapp.com',
}
const enabled = Boolean(config.apiKey && config.appId && config.measurementId)

let ready = null // Promise<{ analytics, sdk } | null>

function load() {
  if (!enabled || typeof window === 'undefined') return Promise.resolve(null)
  if (!ready) {
    ready = (async () => {
      try {
        const [{ initializeApp }, sdk] = await Promise.all([
          import('firebase/app'),
          import('firebase/analytics'),
        ])
        if (!(await sdk.isSupported())) return null
        const app = initializeApp(config)
        return { analytics: sdk.getAnalytics(app), sdk }
      } catch (e) {
        console.warn('[analytics] init failed (non-fatal):', e)
        return null
      }
    })()
  }
  return ready
}

function run(fn) {
  load().then((a) => { if (a) { try { fn(a) } catch (e) { console.warn('[analytics]', e) } } })
}

/** Start analytics early (call once from main.jsx). */
export function initAnalytics(appVariant) {
  run(({ analytics, sdk }) => { if (appVariant) sdk.setUserProperties(analytics, { app_variant: appVariant }) })
}

/** Log a GA4 event. Use recommended names where they fit (login, sign_up, purchase…). */
export function track(name, params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null))
  run(({ analytics, sdk }) => sdk.logEvent(analytics, name, clean))
}

/** Tie events to the signed-in account (backend id only — never email/phone). */
export function identify(userId, role) {
  if (!userId) return
  run(({ analytics, sdk }) => {
    sdk.setUserId(analytics, String(userId))
    if (role) sdk.setUserProperties(analytics, { user_role: role })
  })
}

export function clearIdentity() {
  run(({ analytics, sdk }) => {
    sdk.setUserId(analytics, null)
    sdk.setUserProperties(analytics, { user_role: null })
  })
}
