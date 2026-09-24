// Real premium reports system (backend/src/routes/reports.js,
// reportController.js) — distinct from this site's public Gemini-based
// /kundli tool. These are AI-generated reports (Kundli, career, love, etc.)
// tied to the user's account: one free unlock, then paid plans (Silver/
// Gold/Diamond) that grant credits, paid from wallet balance.
import { api } from './api'

export async function fetchReports() {
  const res = await api.get('/api/reports', { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function fetchCredits() {
  const res = await api.get('/api/reports/credits', { auth: true })
  return res.data
}

export async function fetchUnlockedReports() {
  const res = await api.get('/api/reports/unlocked', { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function fetchReportDetail(unlockId) {
  const res = await api.get(`/api/reports/unlocked/${unlockId}`, { auth: true })
  return res.data
}

export async function unlockReport(reportId, { familyMemberId, language } = {}) {
  const res = await api.post(
    '/api/reports/unlock',
    { report_id: reportId, family_member_id: familyMemberId, language },
    { auth: true }
  )
  return res.data
}

export async function fetchReportPlans() {
  const res = await api.get('/api/reports/plans', { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function purchaseReportPlan(planName) {
  const res = await api.post('/api/reports/plans/purchase', { plan_name: planName }, { auth: true })
  return res.data
}

// ai_content comes back as "## Heading\nbody\n\n## Next heading\nbody" — a
// tiny parser rather than pulling in a full markdown renderer for one field.
export function parseReportContent(text) {
  if (!text) return []
  return text
    .split(/\n(?=##\s)/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const match = block.match(/^##\s*(.+?)\n([\s\S]*)$/)
      if (match) return { heading: match[1].trim(), body: match[2].trim() }
      return { heading: null, body: block }
    })
}
