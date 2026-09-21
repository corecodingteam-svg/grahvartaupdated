// Zodiac reference data for the Daily Horoscope pages. Kept separate from
// services.js (which only needs id/label/symbol for the homepage strip).
export const zodiacSigns = [
  { id: 'aries', label: 'Aries', symbol: '♈', dateRange: 'Mar 21 – Apr 19', element: 'Fire', rulingPlanet: 'Mars' },
  { id: 'taurus', label: 'Taurus', symbol: '♉', dateRange: 'Apr 20 – May 20', element: 'Earth', rulingPlanet: 'Venus' },
  { id: 'gemini', label: 'Gemini', symbol: '♊', dateRange: 'May 21 – Jun 20', element: 'Air', rulingPlanet: 'Mercury' },
  { id: 'cancer', label: 'Cancer', symbol: '♋', dateRange: 'Jun 21 – Jul 22', element: 'Water', rulingPlanet: 'Moon' },
  { id: 'leo', label: 'Leo', symbol: '♌', dateRange: 'Jul 23 – Aug 22', element: 'Fire', rulingPlanet: 'Sun' },
  { id: 'virgo', label: 'Virgo', symbol: '♍', dateRange: 'Aug 23 – Sep 22', element: 'Earth', rulingPlanet: 'Mercury' },
  { id: 'libra', label: 'Libra', symbol: '♎', dateRange: 'Sep 23 – Oct 22', element: 'Air', rulingPlanet: 'Venus' },
  { id: 'scorpio', label: 'Scorpio', symbol: '♏', dateRange: 'Oct 23 – Nov 21', element: 'Water', rulingPlanet: 'Mars' },
  { id: 'sagittarius', label: 'Sagittarius', symbol: '♐', dateRange: 'Nov 22 – Dec 21', element: 'Fire', rulingPlanet: 'Jupiter' },
  { id: 'capricorn', label: 'Capricorn', symbol: '♑', dateRange: 'Dec 22 – Jan 19', element: 'Earth', rulingPlanet: 'Saturn' },
  { id: 'aquarius', label: 'Aquarius', symbol: '♒', dateRange: 'Jan 20 – Feb 18', element: 'Air', rulingPlanet: 'Saturn' },
  { id: 'pisces', label: 'Pisces', symbol: '♓', dateRange: 'Feb 19 – Mar 20', element: 'Water', rulingPlanet: 'Jupiter' },
]

export function getZodiacById(id) {
  return zodiacSigns.find((z) => z.id === id)
}

const periods = ['today', 'tomorrow', 'weekly', 'monthly', 'yearly']

// Short generic templated blurbs per period. Combined with the sign name and
// a deterministic hash pick, this gives each sign/period pairing a slightly
// different flavour without needing 60 hand-written paragraphs.
const blurbPool = {
  today: [
    'A calm, steady energy surrounds you today — good for wrapping up pending tasks and having honest conversations.',
    'Today favours quick decisions. Trust your first instinct, especially in matters of money or work.',
    'You may feel a burst of motivation today. Use it to start something you have been postponing.',
  ],
  tomorrow: [
    'Tomorrow brings a shift in mood — expect a pleasant surprise from someone close to you.',
    'Plan tomorrow carefully; small details matter more than usual, especially at work.',
    'Tomorrow is a good day to reconnect with old friends or revisit an old idea.',
  ],
  weekly: [
    'This week overall leans in your favour, with steady progress on long-term goals and better communication at home.',
    'Expect a mixed week — early days may feel slow, but momentum builds by the weekend.',
    'A good week for financial planning and for tying up loose ends before a busier period ahead.',
  ],
  monthly: [
    'This month highlights growth in your career, though patience will be needed around mid-month.',
    'Relationships take centre stage this month — clear, gentle communication will smooth things over.',
    'A month for consolidation rather than new ventures; focus on strengthening what you already have.',
  ],
  yearly: [
    'The year ahead points towards steady, long-term gains if you stay consistent with your efforts.',
    'A transformative year is indicated, with important decisions around career or relationships.',
    'This year favours travel, learning and expanding your circle — stay open to new opportunities.',
  ],
}

const luckyColors = ['Red', 'Yellow', 'Green', 'Blue', 'Orange', 'White', 'Gold', 'Pink', 'Purple']
const luckyDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function getHoroscopeContent(signId, period, seedExtra = '') {
  const hash = hashString(`${signId}-${period}-${seedExtra}`)
  const pool = blurbPool[period] || blurbPool.today
  return pool[hash % pool.length]
}

export function getLuckyDetails(signId) {
  const hash = hashString(signId)
  return {
    number: (hash % 9) + 1,
    color: luckyColors[hash % luckyColors.length],
    day: luckyDays[hash % luckyDays.length],
  }
}

// Local copy to avoid a circular import with lib/demo.js
function hashString(str = '') {
  let hash = 5381
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

export const horoscopePeriods = periods
