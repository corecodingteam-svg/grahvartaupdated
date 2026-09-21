// Deterministic demo astrology calculators. Nothing here is astronomically
// accurate — all results are derived from a hash of the user's input so the
// same name/DOB always produces the same "personalised" demo output.
import { hashString } from './demo'

export const zodiacSignNames = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export const nakshatras = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta',
  'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

export const planetList = [
  { key: 'sun', label: 'Sun', abbr: 'Su' },
  { key: 'moon', label: 'Moon', abbr: 'Mo' },
  { key: 'mars', label: 'Mars', abbr: 'Ma' },
  { key: 'mercury', label: 'Mercury', abbr: 'Me' },
  { key: 'jupiter', label: 'Jupiter', abbr: 'Ju' },
  { key: 'venus', label: 'Venus', abbr: 'Ve' },
  { key: 'saturn', label: 'Saturn', abbr: 'Sa' },
  { key: 'rahu', label: 'Rahu', abbr: 'Ra' },
  { key: 'ketu', label: 'Ketu', abbr: 'Ke' },
]

const dashaLords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']

export function buildKundli({ name = '', dob = '', tob = '', place = '' }) {
  const seed = `${name}|${dob}|${tob}|${place}`
  const baseHash = hashString(seed)

  const planetPositions = planetList.map((p, i) => {
    const h = hashString(`${seed}-${p.key}-${i}`)
    return {
      ...p,
      sign: zodiacSignNames[h % 12],
      house: (h % 12) + 1,
    }
  })

  const moonEntry = planetPositions.find((p) => p.key === 'moon')
  const rashi = moonEntry.sign
  const nakshatra = nakshatras[hashString(`${seed}-nakshatra`) % nakshatras.length]

  const dashaLord = dashaLords[baseHash % dashaLords.length]
  const dashaYearsRemaining = (baseHash % 15) + 1
  const dashaYearsTotal = (baseHash % 10) + 10

  const mangalDoshaHash = hashString(`${seed}-mangal`)
  const hasMangalDosha = mangalDoshaHash % 4 === 0
  const kaalSarpDoshaHash = hashString(`${seed}-kaalsarp`)
  const hasKaalSarpDosha = kaalSarpDoshaHash % 6 === 0

  // Simple 12-house grid, indexed 1-12, each holding whichever planets landed there.
  const houses = Array.from({ length: 12 }, (_, i) => {
    const houseNum = i + 1
    const planetsHere = planetPositions.filter((p) => p.house === houseNum).map((p) => p.abbr)
    return { house: houseNum, planets: planetsHere }
  })

  return {
    name: name || 'Demo User',
    dob: dob || '1995-01-01',
    tob: tob || '00:00',
    place: place || 'New Delhi, India',
    rashi,
    nakshatra,
    planetPositions,
    houses,
    dasha: { lord: dashaLord, yearsRemaining: dashaYearsRemaining, yearsTotal: dashaYearsTotal },
    doshas: [
      { name: 'Mangal Dosha', present: hasMangalDosha },
      { name: 'Kaal Sarp Dosha', present: hasKaalSarpDosha },
    ],
  }
}

const gunaCategories = [
  { key: 'varna', label: 'Varna', max: 1 },
  { key: 'vashya', label: 'Vashya', max: 2 },
  { key: 'tara', label: 'Tara', max: 3 },
  { key: 'yoni', label: 'Yoni', max: 4 },
  { key: 'grahaMaitri', label: 'Graha Maitri', max: 5 },
  { key: 'gana', label: 'Gana', max: 6 },
  { key: 'bhakoot', label: 'Bhakoot', max: 7 },
  { key: 'nadi', label: 'Nadi', max: 8 },
]

export function buildMatch(person1, person2) {
  const seed = `${person1.name}|${person1.dob}||${person2.name}|${person2.dob}`
  const baseHash = hashString(seed)

  let total = 0
  const breakdown = gunaCategories.map((cat) => {
    const h = hashString(`${seed}-${cat.key}`)
    const score = h % (cat.max + 1)
    total += score
    return { ...cat, score }
  })

  const percentage = Math.round((total / 36) * 100)

  let summary
  if (percentage >= 75) {
    summary = 'An excellent match — the charts show strong harmony across most Koota categories, indicating a supportive and long-lasting bond.'
  } else if (percentage >= 50) {
    summary = 'A good match overall, with a few areas that may need mutual understanding and compromise over time.'
  } else {
    summary = 'A moderate match. Compatibility can still work well with conscious effort, open communication and, if desired, guidance from an astrologer on remedies.'
  }

  return { totalScore: total, maxScore: 36, percentage, breakdown, summary, seedHash: baseHash }
}
