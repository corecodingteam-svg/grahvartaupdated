// Browse-by-category data (homepage "Browse by Category" section)
// Also used to map astrologer.category -> label for filtering
export const categories = [
  {
    id: 'love',
    label: 'Love & Relationship',
    icon: 'Heart',
    description: 'Guidance on love, compatibility and relationships',
  },
  {
    id: 'marriage',
    label: 'Marriage & Kundli',
    icon: 'Gem',
    description: 'Kundli matching and marriage timing',
  },
  {
    id: 'career',
    label: 'Career & Job',
    icon: 'Briefcase',
    description: 'Career growth, job change and business direction',
  },
  {
    id: 'women',
    label: 'Women Astrologers',
    icon: 'UserRound',
    description: 'Consult verified women astrologers',
  },
  {
    id: 'business',
    label: 'Business & Money',
    icon: 'TrendingUp',
    description: 'Finance, investment and business decisions',
  },
  {
    id: 'health',
    label: 'Health & Family',
    icon: 'HeartPulse',
    description: 'Health, family harmony and wellbeing',
  },
]

// Astrologer expertise categories used for /astrologer/:category routes
export const astrologerCategories = [
  { id: 'vedic', label: 'Vedic Astrology' },
  { id: 'tarot', label: 'Tarot Reading' },
  { id: 'numerology', label: 'Numerology' },
  { id: 'vastu', label: 'Vastu Shastra' },
  { id: 'prashana', label: 'Prashana' },
  { id: 'palmistry', label: 'Palmistry' },
  { id: 'face-reading', label: 'Face Reading' },
  { id: 'lal-kitab', label: 'Lal Kitab' },
]
