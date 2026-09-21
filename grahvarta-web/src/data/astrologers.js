// Fully static demo data. Names are fictional and inspired by common
// Indian-astrology naming conventions — not real people.
// Photos use https://i.pravatar.cc placeholders varied by `img` number.

const firstNames = [
  'Acharya Ramesh', 'Pandit Vinod', 'Dr. Sunita', 'Acharya Kavita', 'Pandit Harish',
  'Guru Deepak', 'Acharya Meenal', 'Pandit Suresh', 'Dr. Anjali', 'Acharya Rajendra',
  'Pandit Lata', 'Guru Ashok', 'Acharya Priyanka', 'Pandit Mahesh', 'Dr. Nisha',
  'Acharya Vikram', 'Pandit Geeta', 'Guru Sanjay', 'Acharya Radhika', 'Pandit Om Prakash',
  'Dr. Kalpana', 'Acharya Yogesh',
]

const categoryList = ['vedic', 'tarot', 'numerology', 'vastu', 'prashana', 'palmistry', 'face-reading', 'lal-kitab']
const languagePool = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Punjabi', 'Bengali', 'Tamil', 'Telugu']
const expertisePool = {
  vedic: ['Vedic Astrology', 'Kundli Analysis', 'Marriage', 'Career'],
  tarot: ['Tarot Reading', 'Love', 'Career', 'Relationship'],
  numerology: ['Numerology', 'Name Correction', 'Business'],
  vastu: ['Vastu Shastra', 'Home', 'Office', 'Business'],
  prashana: ['Prashana', 'Horary Astrology', 'Quick Answers'],
  palmistry: ['Palmistry', 'Career', 'Health'],
  'face-reading': ['Face Reading', 'Personality', 'Relationship'],
  'lal-kitab': ['Lal Kitab', 'Remedies', 'Career', 'Family'],
}
const badgePool = ['Top Rated', 'Verified', 'Rising Star', 'Editor\'s Choice']

const bios = {
  vedic: 'brings deep knowledge of Vedic astrology, blending traditional chart analysis with practical, easy-to-understand guidance for career, marriage and family matters.',
  tarot: 'uses intuitive tarot reading to help clients find clarity on love, career and important life decisions, with a warm and approachable style.',
  numerology: 'specialises in numerology, helping clients understand how their numbers influence personality, business decisions and life path.',
  vastu: 'offers practical Vastu Shastra consultations for homes and offices, focused on simple, actionable changes that bring balance and positive energy.',
  prashana: 'practices Prashana (horary astrology), answering specific questions quickly based on the moment a question is asked.',
  palmistry: 'reads palm lines and mounts to offer insight into career, health and relationships, combining classical technique with a modern outlook.',
  'face-reading': 'combines traditional face reading with personality analysis to give clients a fresh perspective on relationships and life choices.',
  'lal-kitab': 'uses the unique remedies of Lal Kitab to address career, family and financial concerns with simple, actionable solutions.',
}

function seedRandom(seed) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

function pick(rand, arr, count) {
  const shuffled = [...arr].sort(() => rand() - 0.5)
  return shuffled.slice(0, count)
}

export const astrologers = firstNames.map((name, index) => {
  const id = `astro-${index + 1}`
  const rand = seedRandom(index * 17 + 3)
  const category = categoryList[index % categoryList.length]
  const experienceYears = 3 + Math.floor(rand() * 20)
  const rating = Math.round((3.5 + rand() * 1.5) * 10) / 10
  const reviewCount = 50 + Math.floor(rand() * 2500)
  const pricePerMin = [15, 20, 25, 30, 35, 40, 50][Math.floor(rand() * 7)]
  const online = rand() > 0.4
  const badge = badgePool[Math.floor(rand() * badgePool.length)]
  const imgNum = (index % 70) + 1
  const languages = pick(rand, languagePool, 2 + Math.floor(rand() * 2))
  const expertise = pick(rand, expertisePool[category], 2 + Math.floor(rand() * 2))

  const reviews = Array.from({ length: 3 + Math.floor(rand() * 3) }, (_, r) => ({
    id: `${id}-review-${r + 1}`,
    user: ['Aarav', 'Diya', 'Rohan', 'Isha', 'Kabir', 'Sneha', 'Aditya', 'Pooja'][Math.floor(rand() * 8)] + ' ' + ['P.', 'S.', 'K.', 'M.', 'R.'][Math.floor(rand() * 5)],
    text: [
      'Very insightful session, explained everything clearly.',
      'Accurate predictions and calming presence. Would consult again.',
      'Helped me understand my situation with practical remedies.',
      'Patient listener and gave honest, grounded advice.',
      'Great experience, felt heard and got useful guidance.',
    ][Math.floor(rand() * 5)],
    date: `2026-0${1 + Math.floor(rand() * 8)}-${10 + Math.floor(rand() * 18)}`,
    rating: 4 + Math.round(rand()),
  }))

  const gallery = [
    `https://i.pravatar.cc/600?img=${imgNum}`,
    `https://picsum.photos/seed/${id}-1/600/400`,
    `https://picsum.photos/seed/${id}-2/600/400`,
    `https://picsum.photos/seed/${id}-3/600/400`,
  ]

  return {
    id,
    name,
    photo: `https://i.pravatar.cc/400?img=${imgNum}`,
    badge,
    expertise,
    languages,
    experienceYears,
    rating,
    reviewCount,
    pricePerMin,
    online,
    category,
    about: `${name} has ${experienceYears}+ years of experience and ${bios[category]}`,
    gallery,
    reviews,
  }
})

export function getAstrologerById(id) {
  return astrologers.find((a) => a.id === id)
}

export function getAstrologersByCategory(category) {
  return astrologers.filter((a) => a.category === category)
}
