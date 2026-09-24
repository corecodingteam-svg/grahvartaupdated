// Live sessions + community feed (backend/src/routes/live.js, liveController.js).
// Ported to match flutter_app/lib/screens/live/live_screen.dart exactly
// rather than inventing a separate UX — same categories, same client-side
// sort, same "hide ended sessions entirely" behavior, same tip amounts.
// For a regular user, live sessions are browse/view-only — creating/starting/
// ending a session is astrologer-only (the backend 403s a non-astrologer on
// createLiveSession). Viewing/chatting/tipping happens over the same
// socket.io connection as consultations (join_live/leave_live/send_tip/live_chat).
import { api } from './api'

// Must match categories used in astrologer post creation (flutter_app's own
// comment) — a fixed list, not free-form.
export const communityCategories = ['general', 'horoscope', 'tips', 'meditation', 'vastu']

export const communitySortOptions = [
  { id: 'latest', label: 'Latest' },
  { id: 'liked', label: 'Most Liked' },
  { id: 'commented', label: 'Most Commented' },
]

export const tipPresets = [50, 100, 200, 500, 1000]

export async function fetchLiveSessions() {
  const res = await api.get('/api/live/sessions', { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function fetchCommunityPosts({ category, zodiacSign, page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (category) params.set('category', category)
  if (zodiacSign) params.set('zodiac_sign', zodiacSign)
  const res = await api.get(`/api/live/community?${params.toString()}`, { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function createCommunityPost({ content, category, zodiacSign, mediaUrl, mediaType }) {
  const res = await api.post(
    '/api/live/community',
    { content, category, zodiac_sign: zodiacSign, media_url: mediaUrl, media_type: mediaType },
    { auth: true }
  )
  return res.data
}

export async function deleteCommunityPost(postId) {
  return api.delete(`/api/live/community/${postId}`, { auth: true })
}

export async function toggleCommunityPostLike(postId) {
  const res = await api.post(`/api/live/community/${postId}/like`, undefined, { auth: true })
  return res.liked
}

export async function fetchPostComments(postId) {
  const res = await api.get(`/api/live/community/${postId}/comments`, { auth: true })
  return Array.isArray(res.data) ? res.data : []
}

export async function addPostComment(postId, content) {
  const res = await api.post(`/api/live/community/${postId}/comments`, { content }, { auth: true })
  return res.data
}
