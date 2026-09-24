// Normalizes the real `astrologers` table shape (backend/migrations/002_marketplace.sql)
// into the flat fields the UI components use — one place to adapt if the
// backend response shape ever changes, instead of five.
export function normalizeAstrologer(raw) {
  if (!raw) return null
  const tags = raw.specializations?.length ? raw.specializations : raw.expertise_areas || []

  return {
    id: raw.id,
    name: raw.display_name || raw.name || 'Astrologer',
    photo: raw.avatar_url || null,
    badge: raw.verification_badge || (raw.is_verified ? 'Verified' : null),
    expertise: tags,
    languages: raw.languages || [],
    experienceYears: Number(raw.experience_years) || 0,
    rating: Number(raw.rating) || 0,
    reviewCount: Number(raw.review_count) || 0,
    pricePerMin: Number(raw.per_minute_rate_chat) || 0,
    pricePerMinCall: Number(raw.per_minute_rate_call) || 0,
    online: !!raw.is_online,
    available: raw.is_available !== false,
    bio: raw.bio || '',
    sunSign: raw.sun_sign || null,
  }
}

export function normalizeReview(raw) {
  return {
    id: raw.id,
    user: raw.is_anonymous ? 'Anonymous' : raw.user_name || 'User',
    rating: Number(raw.rating) || 0,
    text: raw.review_text || '',
    date: raw.created_at ? new Date(raw.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '',
  }
}
