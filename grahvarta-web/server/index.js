import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { blogArticles as staticBlogArticles, blogCategories } from '../src/data/blog.js'

// Small local API server used only in dev. Keeps GEMINI_API_KEY server-side —
// it must never be sent to the browser bundle. The frontend talks to this
// via the /api proxy configured in vite.config.js.

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOROSCOPE_CACHE_FILE = path.join(__dirname, '.horoscope-cache.json')
const KUNDLI_CACHE_FILE = path.join(__dirname, '.kundli-cache.json')
const TAROT_CACHE_FILE = path.join(__dirname, '.tarot-cache.json')
const NUMEROLOGY_CACHE_FILE = path.join(__dirname, '.numerology-cache.json')
const VASTU_CACHE_FILE = path.join(__dirname, '.vastu-cache.json')
const KUNDLI_MATCH_CACHE_FILE = path.join(__dirname, '.kundli-match-cache.json')
const TRANSIT_CACHE_FILE = path.join(__dirname, '.transit-cache.json')
const LOVE_CACHE_FILE = path.join(__dirname, '.love-cache.json')
const PANCHANG_CACHE_FILE = path.join(__dirname, '.panchang-cache.json')
const MUHURAT_CACHE_FILE = path.join(__dirname, '.muhurat-cache.json')
const BLOG_CACHE_FILE = path.join(__dirname, '.blog-cache.json')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.SERVER_PORT || 8787
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'

if (!GEMINI_API_KEY) {
  console.warn('[api-server] GEMINI_API_KEY is not set in .env — /api routes will return errors.')
}

function loadCache(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return {}
  }
}

function saveCache(file, cache) {
  try {
    fs.writeFileSync(file, JSON.stringify(cache, null, 2))
  } catch (err) {
    console.error('[api-server] Failed to persist cache:', err)
  }
}

// Deterministic string hash (djb2-style) — mirrors src/lib/demo.js so cache
// keys are stable without importing frontend code into this Node process.
function hashString(str = '') {
  let hash = 5381
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}

async function callGemini(prompt, { temperature = 0.8 } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature, maxOutputTokens: 4096 },
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed with status ${response.status}`)
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('Gemini returned malformed JSON')
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Horoscope — cached per calendar day, so a given sign/period reads the same
// all day and only changes once the date rolls over.
// ─────────────────────────────────────────────────────────────────────────

const periodPhrases = {
  today: "today's",
  tomorrow: "tomorrow's",
  weekly: "this week's",
  monthly: "this month's",
  yearly: "this year's",
}

function todayKey() {
  return new Date().toISOString().split('T')[0]
}

async function generateHoroscope({ sign, period, element, rulingPlanet }) {
  const phrase = periodPhrases[period] || periodPhrases.today
  const context = [element && `element: ${element}`, rulingPlanet && `ruling planet: ${rulingPlanet}`]
    .filter(Boolean)
    .join(', ')

  const prompt =
    `Write a short, warm horoscope for ${phrase} outlook for the zodiac sign ${sign}` +
    (context ? ` (${context})` : '') +
    `. 2-3 sentences, upbeat and specific, plain prose, no markdown, no headings. ` +
    `Also pick a lucky number from 1-9, a lucky color, and a lucky day of the week for this sign today. ` +
    `Respond strictly as minified JSON with exactly these keys: "horoscope", "luckyNumber", "luckyColor", "luckyDay". No other text.`

  const parsed = await callGemini(prompt, { temperature: 0.9 })
  return {
    horoscope: parsed.horoscope,
    luckyNumber: parsed.luckyNumber,
    luckyColor: parsed.luckyColor,
    luckyDay: parsed.luckyDay,
  }
}

app.post('/api/horoscope', async (req, res) => {
  const { sign, period = 'today', element, rulingPlanet } = req.body || {}

  if (!sign) {
    return res.status(400).json({ error: 'sign is required' })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const cacheKey = `${sign.toLowerCase()}-${period}-${todayKey()}`
  const cache = loadCache(HOROSCOPE_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const result = await generateHoroscope({ sign, period, element, rulingPlanet })
    cache[cacheKey] = result
    saveCache(HOROSCOPE_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Horoscope generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Kundli — cached forever per birth-detail combination (name+dob+tob+place),
// since a birth chart doesn't change day to day.
// ─────────────────────────────────────────────────────────────────────────

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

const PLANETS = [
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

const ELEMENT_BY_SIGN = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
}

// Standard Vimshottari Mahadasha order and year-lengths (always the same 9
// lords in this order, totalling 120 years — only the starting offset within
// the cycle depends on the birth chart).
const VIMSHOTTARI_SEQUENCE = [
  { lord: 'Ketu', years: 7 },
  { lord: 'Venus', years: 20 },
  { lord: 'Sun', years: 6 },
  { lord: 'Moon', years: 10 },
  { lord: 'Mars', years: 7 },
  { lord: 'Rahu', years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn', years: 19 },
  { lord: 'Mercury', years: 17 },
]

function normalizeSign(sign) {
  const match = ZODIAC_SIGNS.find((s) => s.toLowerCase() === String(sign || '').trim().toLowerCase())
  return match || ZODIAC_SIGNS[0]
}

function signIndex(sign) {
  return ZODIAC_SIGNS.indexOf(normalizeSign(sign))
}

// Houses are derived mathematically from the ascendant rather than trusted
// from the model, so the chart always renders a consistent 12-house wheel.
function houseFromSigns(ascendantSign, planetSign) {
  return ((signIndex(planetSign) - signIndex(ascendantSign) + 12) % 12) + 1
}

function buildDashaTimeline(currentLord, yearsRemaining) {
  const startIdx = VIMSHOTTARI_SEQUENCE.findIndex(
    (d) => d.lord.toLowerCase() === String(currentLord || '').toLowerCase()
  )
  const idx = startIdx === -1 ? 0 : startIdx
  const currentTotal = VIMSHOTTARI_SEQUENCE[idx].years
  const remaining = Math.min(Math.max(Number(yearsRemaining) || currentTotal, 0.5), currentTotal)

  const segments = []
  let age = 0

  // First segment: the remaining portion of the current Mahadasha.
  segments.push({ lord: VIMSHOTTARI_SEQUENCE[idx].lord, startAge: age, endAge: age + remaining, current: true })
  age += remaining

  // Then the rest of the 120-year cycle, continuing in order.
  for (let i = 1; i < VIMSHOTTARI_SEQUENCE.length; i += 1) {
    const entry = VIMSHOTTARI_SEQUENCE[(idx + i) % VIMSHOTTARI_SEQUENCE.length]
    segments.push({ lord: entry.lord, startAge: age, endAge: age + entry.years, current: false })
    age += entry.years
  }

  return { segments, totalYears: age, currentLord: VIMSHOTTARI_SEQUENCE[idx].lord, yearsRemaining: remaining }
}

async function generateKundliReading({ name, dob, tob, place }) {
  const prompt =
    `You are a Vedic (Jyotish) astrologer. Generate a plausible, internally-consistent demo birth chart reading ` +
    `for illustration purposes on an astrology website — it does not need to be astronomically precise. ` +
    `Birth details — Name: ${name}, Date of birth: ${dob}, Time of birth: ${tob}, Place of birth: ${place}.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) matching exactly this shape:\n` +
    `{"ascendant":"<one of the 12 zodiac signs>",` +
    `"moonSign":"<zodiac sign>","sunSign":"<zodiac sign>",` +
    `"nakshatra":"<one Vedic nakshatra name>","nakshatraPada":<1-4>,` +
    `"planets":[{"key":"sun","sign":"<zodiac sign>","degree":<0-29.9>,"retrograde":false,"strength":<0-100>},` +
    `{"key":"moon", ...same fields}, {"key":"mars", ...}, {"key":"mercury", ...}, {"key":"jupiter", ...}, ` +
    `{"key":"venus", ...}, {"key":"saturn", ...}, {"key":"rahu", ...}, {"key":"ketu", ...}],` +
    `"dasha":{"currentLord":"<one of Ketu,Venus,Sun,Moon,Mars,Rahu,Jupiter,Saturn,Mercury>","yearsRemaining":<0-20>},` +
    `"doshas":[{"name":"Mangal Dosha","present":<bool>,"severity":"Low|Medium|High","description":"<1 sentence>"},` +
    `{"name":"Kaal Sarp Dosha","present":<bool>,"severity":"Low|Medium|High","description":"<1 sentence>"},` +
    `{"name":"Sade Sati","present":<bool>,"severity":"Low|Medium|High","description":"<1 sentence>"}],` +
    `"personality":"<2-3 sentence paragraph>","strengths":["<short phrase>", "...", "..."],` +
    `"challenges":["<short phrase>", "...", "..."],"career":"<2-3 sentence paragraph>",` +
    `"relationships":"<2-3 sentence paragraph>","health":"<1-2 sentence paragraph>",` +
    `"remedies":["<short actionable remedy>", "...", "..."],` +
    `"luckyNumber":<1-9>,"luckyColor":"<color name>","luckyGemstone":"<gemstone name>"}\n\n` +
    `Use "retrograde" only for Mars, Mercury, Jupiter, Venus or Saturn (never Sun, Moon, Rahu or Ketu — set false for those). ` +
    `Provide exactly 3 items each for "strengths", "challenges" and "remedies".`

  const parsed = await callGemini(prompt, { temperature: 0.7 })

  const ascendant = normalizeSign(parsed.ascendant)
  const planets = PLANETS.map((p) => {
    const found = (parsed.planets || []).find((x) => String(x.key).toLowerCase() === p.key)
    const sign = normalizeSign(found?.sign)
    return {
      ...p,
      sign,
      degree: typeof found?.degree === 'number' ? Math.round(found.degree * 10) / 10 : 0,
      retrograde: Boolean(found?.retrograde),
      strength: Math.min(100, Math.max(0, Math.round(Number(found?.strength)) || 50)),
      house: houseFromSigns(ascendant, sign),
    }
  })

  const houses = Array.from({ length: 12 }, (_, i) => {
    const houseNum = i + 1
    return {
      house: houseNum,
      sign: ZODIAC_SIGNS[(signIndex(ascendant) + i) % 12],
      planets: planets.filter((p) => p.house === houseNum).map((p) => p.abbr),
    }
  })

  const elementCounts = { Fire: 0, Earth: 0, Air: 0, Water: 0 }
  planets.forEach((p) => {
    elementCounts[ELEMENT_BY_SIGN[p.sign]] += 1
  })

  const dashaTimeline = buildDashaTimeline(parsed.dasha?.currentLord, parsed.dasha?.yearsRemaining)

  return {
    ascendant,
    moonSign: normalizeSign(parsed.moonSign),
    sunSign: normalizeSign(parsed.sunSign),
    nakshatra: parsed.nakshatra || 'Ashwini',
    nakshatraPada: Math.min(4, Math.max(1, Math.round(Number(parsed.nakshatraPada)) || 1)),
    planets,
    houses,
    elementBalance: elementCounts,
    dasha: dashaTimeline,
    doshas: Array.isArray(parsed.doshas) ? parsed.doshas : [],
    personality: parsed.personality || '',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
    challenges: Array.isArray(parsed.challenges) ? parsed.challenges.slice(0, 3) : [],
    career: parsed.career || '',
    relationships: parsed.relationships || '',
    health: parsed.health || '',
    remedies: Array.isArray(parsed.remedies) ? parsed.remedies.slice(0, 3) : [],
    luckyNumber: parsed.luckyNumber,
    luckyColor: parsed.luckyColor,
    luckyGemstone: parsed.luckyGemstone,
  }
}

app.post('/api/kundli', async (req, res) => {
  const { name, dob, tob, place } = req.body || {}

  if (!name || !dob || !tob || !place) {
    return res.status(400).json({ error: 'name, dob, tob and place are all required' })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const cacheKey = String(hashString(`${name}|${dob}|${tob}|${place}`))
  const cache = loadCache(KUNDLI_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const result = await generateKundliReading({ name, dob, tob, place })
    cache[cacheKey] = result
    saveCache(KUNDLI_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Kundli generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Tarot — cached persistently per exact spread (reading type + question +
// the 3 drawn cards/orientations), so re-viewing the same draw is instant
// but every new draw (a new card, a new question) gets a fresh reading.
// ─────────────────────────────────────────────────────────────────────────

const readingTypeLabels = { love: 'Love', career: 'Career', finance: 'Finance' }

async function generateTarotReading({ readingType, question, cards }) {
  const typeLabel = readingTypeLabels[readingType] || 'General'
  const cardLines = cards
    .map((c, i) => `${i + 1}. Position "${c.position}": ${c.name}${c.orientation === 'reversed' ? ' (Reversed)' : ' (Upright)'}`)
    .join('\n')

  const prompt =
    `You are a warm, insightful tarot reader giving a fun, illustrative 3-card ${typeLabel} reading ` +
    `on a demo astrology website. This uses an original, invented tarot deck (not the traditional Rider-Waite deck), ` +
    `so interpret each card name on its own symbolic merit combined with its upright/reversed orientation.\n\n` +
    (question ? `The querent's question: "${question}"\n\n` : '') +
    `The 3 cards drawn, in position order:\n${cardLines}\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) with exactly this shape:\n` +
    `{"cards":[{"position":"<position name, exactly as given>","interpretation":"<2 sentences, tied to this card, its orientation, its position meaning, the ${typeLabel} theme` +
    (question ? ' and the question' : '') + `>"}, ...same for all 3 positions in order],` +
    `"summary":"<2-3 sentence synthesis weaving all 3 cards into one cohesive narrative for this ${typeLabel} reading>",` +
    `"advice":"<1 short, actionable sentence of advice>"}`

  const parsed = await callGemini(prompt, { temperature: 0.85 })

  const interpretations = cards.map((c) => {
    const found = (parsed.cards || []).find((x) => x.position === c.position)
    return { position: c.position, interpretation: found?.interpretation || '' }
  })

  return {
    cards: interpretations,
    summary: parsed.summary || '',
    advice: parsed.advice || '',
  }
}

app.post('/api/tarot', async (req, res) => {
  const { readingType, question = '', cards } = req.body || {}

  if (!readingType || !Array.isArray(cards) || cards.length !== 3) {
    return res.status(400).json({ error: 'readingType and exactly 3 cards are required' })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const spreadSignature = cards.map((c) => `${c.position}:${c.name}:${c.orientation}`).join('|')
  const cacheKey = String(hashString(`${readingType}|${question.trim().toLowerCase()}|${spreadSignature}`))
  const cache = loadCache(TAROT_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const result = await generateTarotReading({ readingType, question, cards })
    cache[cacheKey] = result
    saveCache(TAROT_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Tarot generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Numerology — Life Path and Destiny numbers are computed here with the real
// Pythagorean method (not left to the model), then Gemini writes the
// personalized interpretation. Cached persistently per name+dob.
// ─────────────────────────────────────────────────────────────────────────

const PYTHAGOREAN_MAP = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
}

function reduceNumerologyNumber(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((sum, d) => sum + Number(d), 0)
  }
  return n
}

function computeLifePathNumber(dob) {
  const digits = dob.replace(/-/g, '')
  const sum = digits.split('').reduce((s, d) => s + Number(d), 0)
  return reduceNumerologyNumber(sum)
}

function computeDestinyNumber(name) {
  const sum = name
    .toLowerCase()
    .split('')
    .reduce((s, ch) => s + (PYTHAGOREAN_MAP[ch] || 0), 0)
  return reduceNumerologyNumber(sum)
}

async function generateNumerologyReading({ name, lifePath, destiny }) {
  const prompt =
    `You are a numerologist writing a warm, personalized reading for ${name}. ` +
    `Their Life Path Number is ${lifePath} and their Destiny (Expression) Number is ${destiny}, ` +
    `both computed with the standard Pythagorean method — treat these as accurate and interpret them, do not recompute them.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) with exactly this shape:\n` +
    `{"lifePathMeaning":"<2-3 sentences interpreting Life Path ${lifePath} for ${name} specifically>",` +
    `"destinyMeaning":"<2-3 sentences interpreting Destiny Number ${destiny} for ${name} specifically>",` +
    `"compatibleNumbers":[<2 numbers 1-9 that pair well>],"luckyColor":"<color name>","luckyDay":"<day of week>",` +
    `"advice":"<1 short actionable sentence of advice tailored to these numbers>"}`

  return callGemini(prompt, { temperature: 0.75 })
}

app.post('/api/numerology', async (req, res) => {
  const { name, dob } = req.body || {}

  if (!name || !dob) {
    return res.status(400).json({ error: 'name and dob are required' })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const lifePath = computeLifePathNumber(dob)
  const destiny = computeDestinyNumber(name)
  const cacheKey = String(hashString(`${name.trim().toLowerCase()}|${dob}`))
  const cache = loadCache(NUMEROLOGY_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const reading = await generateNumerologyReading({ name, lifePath, destiny })
    const result = {
      lifePath,
      destiny,
      lifePathMeaning: reading.lifePathMeaning || '',
      destinyMeaning: reading.destinyMeaning || '',
      compatibleNumbers: Array.isArray(reading.compatibleNumbers) ? reading.compatibleNumbers.slice(0, 2) : [],
      luckyColor: reading.luckyColor,
      luckyDay: reading.luckyDay,
      advice: reading.advice,
    }
    cache[cacheKey] = result
    saveCache(NUMEROLOGY_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Numerology generation failed:', err.message)
    res.status(502).json({ error: err.message, lifePath, destiny })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Vastu — personalized assessment for a described space, cached persistently
// per (space type + facing direction + concern) combination.
// ─────────────────────────────────────────────────────────────────────────

const vastuTypeLabels = { home: 'home', office: 'office', plot: 'plot (pre-construction)' }

async function generateVastuReading({ spaceType, facingDirection, concern }) {
  const typeLabel = vastuTypeLabels[spaceType] || 'space'
  const prompt =
    `You are a Vastu Shastra consultant giving a personalized, practical assessment for a ${typeLabel} ` +
    `that faces ${facingDirection}.` +
    (concern ? ` The client's specific concern or context: "${concern}".` : '') +
    ` Give simple, low-disruption, actionable suggestions — not vague platitudes.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) with exactly this shape:\n` +
    `{"score":<0-100 overall Vastu compatibility score for this facing direction>,` +
    `"assessment":"<2-3 sentence overall assessment>",` +
    `"suggestions":["<specific actionable suggestion>", "...", "..."],` +
    `"remedies":["<simple low-cost remedy>", "...", "..."]}\n` +
    `Provide exactly 4 suggestions and exactly 3 remedies.`

  return callGemini(prompt, { temperature: 0.75 })
}

app.post('/api/vastu', async (req, res) => {
  const { spaceType, facingDirection, concern = '' } = req.body || {}

  if (!spaceType || !facingDirection) {
    return res.status(400).json({ error: 'spaceType and facingDirection are required' })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const cacheKey = String(hashString(`${spaceType}|${facingDirection}|${concern.trim().toLowerCase()}`))
  const cache = loadCache(VASTU_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const reading = await generateVastuReading({ spaceType, facingDirection, concern })
    const result = {
      score: Math.min(100, Math.max(0, Math.round(Number(reading.score)) || 60)),
      assessment: reading.assessment || '',
      suggestions: Array.isArray(reading.suggestions) ? reading.suggestions.slice(0, 4) : [],
      remedies: Array.isArray(reading.remedies) ? reading.remedies.slice(0, 3) : [],
    }
    cache[cacheKey] = result
    saveCache(VASTU_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Vastu generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Kundli Matching — Ashtakoot (8-Koota) Guna Milan, cached persistently per
// couple (order-independent, so swapping person1/person2 hits the same
// cache entry).
// ─────────────────────────────────────────────────────────────────────────

const gunaCategoryDefs = [
  { key: 'varna', label: 'Varna', max: 1 },
  { key: 'vashya', label: 'Vashya', max: 2 },
  { key: 'tara', label: 'Tara', max: 3 },
  { key: 'yoni', label: 'Yoni', max: 4 },
  { key: 'grahaMaitri', label: 'Graha Maitri', max: 5 },
  { key: 'gana', label: 'Gana', max: 6 },
  { key: 'bhakoot', label: 'Bhakoot', max: 7 },
  { key: 'nadi', label: 'Nadi', max: 8 },
]

async function generateKundliMatch({ person1, person2 }) {
  const schemaFields = gunaCategoryDefs.map((c) => `"${c.key}":<0-${c.max}>`).join(',')
  const prompt =
    `You are a Vedic astrologer performing Ashtakoot Guna Milan (marriage compatibility matching) for a demo ` +
    `astrology website — plausible and internally consistent, not necessarily ephemeris-precise.\n` +
    `Person 1: ${person1.name}, born ${person1.dob} at ${person1.tob} in ${person1.place}.\n` +
    `Person 2: ${person2.name}, born ${person2.dob} at ${person2.tob} in ${person2.place}.\n\n` +
    `Score each of the 8 Kootas within its maximum (Varna max 1, Vashya max 2, Tara max 3, Yoni max 4, ` +
    `Graha Maitri max 5, Gana max 6, Bhakoot max 7, Nadi max 8 — total possible 36).\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) with exactly this shape:\n` +
    `{"scores":{${schemaFields}},` +
    `"summary":"<3-4 sentence overall compatibility narrative mentioning both names>",` +
    `"strengths":["<short phrase>", "...", "..."],"challenges":["<short phrase>", "...", "..."]}\n` +
    `Provide exactly 3 items each for "strengths" and "challenges".`

  return callGemini(prompt, { temperature: 0.75 })
}

app.post('/api/kundli-match', async (req, res) => {
  const { person1, person2 } = req.body || {}

  if (!person1?.name || !person1?.dob || !person2?.name || !person2?.dob) {
    return res.status(400).json({ error: 'person1 and person2 (name, dob, tob, place) are required' })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const sig1 = `${person1.name}|${person1.dob}|${person1.tob}|${person1.place}`.toLowerCase()
  const sig2 = `${person2.name}|${person2.dob}|${person2.tob}|${person2.place}`.toLowerCase()
  const [a, b] = [sig1, sig2].sort()
  const cacheKey = String(hashString(`${a}::${b}`))
  const cache = loadCache(KUNDLI_MATCH_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const reading = await generateKundliMatch({ person1, person2 })
    const breakdown = gunaCategoryDefs.map((c) => ({
      ...c,
      score: Math.min(c.max, Math.max(0, Math.round(Number(reading.scores?.[c.key])) || 0)),
    }))
    const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0)
    const result = {
      breakdown,
      totalScore,
      maxScore: 36,
      percentage: Math.round((totalScore / 36) * 100),
      summary: reading.summary || '',
      strengths: Array.isArray(reading.strengths) ? reading.strengths.slice(0, 3) : [],
      challenges: Array.isArray(reading.challenges) ? reading.challenges.slice(0, 3) : [],
    }
    cache[cacheKey] = result
    saveCache(KUNDLI_MATCH_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Kundli match generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Planet Transit — no user input, cached per calendar day like Horoscope.
// ─────────────────────────────────────────────────────────────────────────

const TRANSIT_PLANETS = [
  { id: 'sun', name: 'Sun', symbol: '☉' },
  { id: 'moon', name: 'Moon', symbol: '☽' },
  { id: 'mars', name: 'Mars', symbol: '♂' },
  { id: 'mercury', name: 'Mercury', symbol: '☿' },
  { id: 'jupiter', name: 'Jupiter', symbol: '♃' },
  { id: 'venus', name: 'Venus', symbol: '♀' },
  { id: 'saturn', name: 'Saturn', symbol: '♄' },
  { id: 'rahu', name: 'Rahu', symbol: '☊' },
  { id: 'ketu', name: 'Ketu', symbol: '☋' },
]

async function generatePlanetTransits() {
  const todayLabel = new Date().toDateString()
  const planetLines = TRANSIT_PLANETS.map((p) => `"${p.id}"`).join(', ')
  const prompt =
    `You are a Vedic astrologer describing today's (${todayLabel}) current zodiac transit for all 9 grahas, ` +
    `for a demo astrology website — plausible and internally consistent, not necessarily ephemeris-precise.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary): {"transits":[` +
    `{"id":<one of ${planetLines}>,"sign":"<zodiac sign>","transitDate":"<short human phrase like 'Since Sep 16, 2026' or 'Changes sign every ~2.5 days'>",` +
    `"interpretation":"<1-2 sentence general influence of this placement>"}, ... one entry per planet id listed]}`

  const parsed = await callGemini(prompt, { temperature: 0.7 })
  return TRANSIT_PLANETS.map((p) => {
    const found = (parsed.transits || []).find((t) => t.id === p.id)
    return {
      ...p,
      sign: found?.sign || 'Aries',
      transitDate: found?.transitDate || '',
      interpretation: found?.interpretation || '',
    }
  })
}

app.get('/api/planet-transit', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const cacheKey = todayKey()
  const cache = loadCache(TRANSIT_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ transits: cache[cacheKey], cached: true })
  }

  try {
    const transits = await generatePlanetTransits()
    cache[cacheKey] = transits
    saveCache(TRANSIT_CACHE_FILE, cache)
    res.json({ transits, cached: false })
  } catch (err) {
    console.error('[api-server] Planet transit generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Love Calculator — cached persistently per name pair (order-independent).
// ─────────────────────────────────────────────────────────────────────────

async function generateLoveReading({ name, partner }) {
  const prompt =
    `You are writing a fun, lighthearted love-compatibility reading between "${name}" and "${partner}" for a demo ` +
    `astrology website, based loosely on the vibe/numerology of their names. This is for entertainment, not real ` +
    `astrology — keep it warm, playful and specific to these two names, never generic.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) with exactly this shape:\n` +
    `{"score":<0-100 compatibility score>,"interpretation":"<2-3 sentence fun, specific reading mentioning both names>",` +
    `"strengths":["<short phrase>","<short phrase>"],"tip":"<1 short playful tip for this pairing>"}`

  return callGemini(prompt, { temperature: 0.9 })
}

app.post('/api/love-calculator', async (req, res) => {
  const { name, partner } = req.body || {}

  if (!name || !partner) {
    return res.status(400).json({ error: 'name and partner are required' })
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const [a, b] = [name.trim().toLowerCase(), partner.trim().toLowerCase()].sort()
  const cacheKey = String(hashString(`${a}::${b}`))
  const cache = loadCache(LOVE_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const reading = await generateLoveReading({ name, partner })
    const result = {
      score: Math.min(100, Math.max(0, Math.round(Number(reading.score)) || 50)),
      interpretation: reading.interpretation || '',
      strengths: Array.isArray(reading.strengths) ? reading.strengths.slice(0, 2) : [],
      tip: reading.tip || '',
    }
    cache[cacheKey] = result
    saveCache(LOVE_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Love calculator generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Panchang — no user input, cached per calendar day.
// ─────────────────────────────────────────────────────────────────────────

async function generatePanchang() {
  const todayLabel = new Date().toDateString()
  const prompt =
    `You are a Vedic astrologer producing today's (${todayLabel}) Panchang for a demo astrology website — ` +
    `plausible and internally consistent, not necessarily precise ephemeris data.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) with exactly this shape:\n` +
    `{"tithi":"<tithi name>","nakshatra":"<nakshatra name>","yoga":"<yoga name>","karana":"<karana name>",` +
    `"sunrise":"<time like '06:14 AM'>","sunset":"<time like '06:32 PM'>",` +
    `"rahuKaal":"<time range like '04:30 PM – 06:00 PM'>","abhijitMuhurat":"<time range>",` +
    `"dayQuality":"<1 sentence on what today is generally favourable or unfavourable for>"}`

  return callGemini(prompt, { temperature: 0.6 })
}

app.get('/api/panchang', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const cacheKey = todayKey()
  const cache = loadCache(PANCHANG_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ ...cache[cacheKey], cached: true })
  }

  try {
    const result = await generatePanchang()
    cache[cacheKey] = result
    saveCache(PANCHANG_CACHE_FILE, cache)
    res.json({ ...result, cached: false })
  } catch (err) {
    console.error('[api-server] Panchang generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Subh Muhurat — no user input, cached per calendar day (so dates roll
// forward as they pass).
// ─────────────────────────────────────────────────────────────────────────

const muhuratCategoryDefs = [
  { slug: 'annaprashan', title: 'Annaprashan', description: 'Auspicious timings for a baby’s first solid-food ceremony, chosen to support healthy growth and good fortune.' },
  { slug: 'naamkaran', title: 'Naamkaran', description: 'Favourable windows for the naming ceremony, typically observed on or after the 11th day after birth.' },
  { slug: 'vehicle-purchase', title: 'Car / Bike Purchase', description: 'Auspicious slots considered favourable for booking or taking delivery of a new vehicle.' },
  { slug: 'marriage', title: 'Marriage', description: 'Traditionally favoured wedding dates based on planetary alignment, avoiding inauspicious periods.' },
  { slug: 'bhoomi-pujan', title: 'Bhoomi Pujan', description: 'Ground-breaking ceremony timings believed to bring stability and prosperity to a new construction.' },
  { slug: 'griha-pravesh', title: 'Griha Pravesh', description: 'Housewarming muhurat for moving into a new home, chosen to invite positive energy into the household.' },
  { slug: 'mundan', title: 'Mundan', description: 'Auspicious dates for a child’s first hair-cutting ceremony, an important rite of passage.' },
]

async function generateMuhuratDates() {
  const todayLabel = new Date().toDateString()
  const slugList = muhuratCategoryDefs.map((c) => `"${c.slug}"`).join(', ')
  const prompt =
    `You are a Vedic astrologer listing upcoming Subh Muhurat (auspicious date/time windows) starting from today ` +
    `(${todayLabel}) for a demo astrology website, for each of these event categories: ${slugList}.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary): {"categories":[` +
    `{"slug":<one of the category slugs above>,"dates":[{"date":"<e.g. 'Sep 24, 2026'>","day":"<weekday name>",` +
    `"time":"<time range like '09:12 AM – 11:04 AM'>"}, ... exactly 3 upcoming dates, soonest first, all on or after today]}, ` +
    `... one entry per category listed]}`

  const parsed = await callGemini(prompt, { temperature: 0.7 })
  return muhuratCategoryDefs.map((c) => {
    const found = (parsed.categories || []).find((x) => x.slug === c.slug)
    return { ...c, dates: Array.isArray(found?.dates) ? found.dates.slice(0, 3) : [] }
  })
}

app.get('/api/muhurat', async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a Gemini API key' })
  }

  const cacheKey = todayKey()
  const cache = loadCache(MUHURAT_CACHE_FILE)

  if (cache[cacheKey]) {
    return res.json({ categories: cache[cacheKey], cached: true })
  }

  try {
    const categories = await generateMuhuratDates()
    cache[cacheKey] = categories
    saveCache(MUHURAT_CACHE_FILE, cache)
    res.json({ categories, cached: false })
  } catch (err) {
    console.error('[api-server] Muhurat generation failed:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Blog — auto-publishes one new article per calendar day, added to a
// growing persistent archive rather than overwritten like the daily-cached
// features above (a blog permalink shouldn't change once published).
// Falls back to just the static articles, quietly, if generation fails —
// this is supplementary content, so a hiccup here shouldn't break the page.
// ─────────────────────────────────────────────────────────────────────────

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
}

async function generateBlogArticle({ category, existingTitles }) {
  const prompt =
    `Write one original astrology blog article for a demo astrology website, in the category "${category}". ` +
    `Tone: warm, informative, entertainment/spiritual-guidance framing — never present it as scientific fact. ` +
    `Do not reuse any of these already-published titles or their exact angle: ${existingTitles.slice(0, 40).join(' | ')}.\n\n` +
    `Respond strictly as minified JSON (no markdown, no commentary) with exactly this shape:\n` +
    `{"title":"<article title>","excerpt":"<1 sentence summary, under 160 characters>",` +
    `"body":["<paragraph 1>","<paragraph 2>","<paragraph 3>","<paragraph 4>"]}\n` +
    `Each paragraph should be 3-5 sentences. Exactly 4 paragraphs.`

  return callGemini(prompt, { temperature: 0.95 })
}

app.get('/api/blog', async (req, res) => {
  const cache = loadCache(BLOG_CACHE_FILE)
  const key = todayKey()

  if (GEMINI_API_KEY && !cache[key]) {
    try {
      const dayIndex = Math.floor(Date.now() / 86400000)
      const category = blogCategories[dayIndex % blogCategories.length]
      const existingTitles = [
        ...staticBlogArticles.map((a) => a.title),
        ...Object.values(cache).map((a) => a.title),
      ]
      const reading = await generateBlogArticle({ category, existingTitles })
      const baseSlug = slugify(reading.title) || `article-${key}`
      const slug = existingTitles.some((t) => slugify(t) === baseSlug) ? `${baseSlug}-${key}` : baseSlug

      cache[key] = {
        slug,
        title: reading.title,
        category,
        excerpt: reading.excerpt,
        body: Array.isArray(reading.body) ? reading.body : [],
        image: `https://picsum.photos/seed/${slug}/900/540`,
        publishedDate: key,
      }
      saveCache(BLOG_CACHE_FILE, cache)
    } catch (err) {
      // Soft-fail: today's new article just doesn't get added this time —
      // the page still renders the static + previously-generated archive.
      console.error('[api-server] Blog article generation failed:', err.message)
    }
  }

  const generatedArticles = Object.values(cache).sort((a, b) => b.publishedDate.localeCompare(a.publishedDate))
  res.json({ articles: [...generatedArticles, ...staticBlogArticles] })
})

app.listen(PORT, () => {
  console.log(`[api-server] listening on http://localhost:${PORT}`)
})
