// Real per-user backend data — distinct from this site's public Gemini-based
// /kundli and /horoscope tools. These pull from the user's own stored birth
// details (backend/src/controllers/birthChartController.js,
// horoscopeController.js), persisted/cached server-side per account.
import { api } from './api'

export async function fetchMyBirthChart() {
  const res = await api.get('/api/content/birth-chart', { auth: true })
  return res.data
}

export async function fetchMyHoroscope(period = 'daily') {
  const res = await api.get(`/api/horoscope/my?period=${period}`, { auth: true })
  return res.data
}
