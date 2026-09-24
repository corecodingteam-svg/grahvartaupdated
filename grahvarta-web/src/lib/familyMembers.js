// Family member birth-detail records (backend/src/routes/familyMembers.js) —
// used both standalone (view/manage) and as the family_member_id param when
// unlocking a report for someone other than yourself (see lib/reports.js).
import { api } from './api'

export async function fetchFamilyMembers() {
  const res = await api.get('/api/family-members', { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function createFamilyMember(fields) {
  const res = await api.post('/api/family-members', fields, { auth: true })
  return res.data
}

export async function updateFamilyMember(id, fields) {
  const res = await api.patch(`/api/family-members/${id}`, fields, { auth: true })
  return res.data
}

export async function deleteFamilyMember(id) {
  return api.delete(`/api/family-members/${id}`, { auth: true })
}
