import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import AstrologerCard from '../components/astrologer/AstrologerCard'
import SectionHeading from '../components/ui/SectionHeading'
import { astrologers } from '../data/astrologers'
import { astrologerCategories } from '../data/categories'
import { setPageMeta } from '../lib/demo'

const allLanguages = [...new Set(astrologers.flatMap((a) => a.languages))].sort()
const allExpertise = [...new Set(astrologers.flatMap((a) => a.expertise))].sort()

const sortOptions = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'price-low', label: 'Price: Low to High' },
  { id: 'price-high', label: 'Price: High to Low' },
  { id: 'rating', label: 'Rating' },
  { id: 'experience', label: 'Experience' },
]

export default function Astrologers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [expertise, setExpertise] = useState('')
  const [language, setLanguage] = useState('')
  const [maxPrice, setMaxPrice] = useState(50)
  const [minExperience, setMinExperience] = useState(0)
  const [minRating, setMinRating] = useState(0)
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [sortBy, setSortBy] = useState('popularity')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    setPageMeta('Astrologers | GrahVarta', 'Browse and filter verified astrologers by category, language, price, experience and rating.')
  }, [])

  useEffect(() => {
    const next = {}
    if (category) next.category = category
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const filtered = useMemo(() => {
    let list = astrologers.filter((a) => {
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false
      if (category && a.category !== category) return false
      if (expertise && !a.expertise.includes(expertise)) return false
      if (language && !a.languages.includes(language)) return false
      if (a.pricePerMin > maxPrice) return false
      if (a.experienceYears < minExperience) return false
      if (a.rating < minRating) return false
      if (onlineOnly && !a.online) return false
      return true
    })

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.pricePerMin - b.pricePerMin
        case 'price-high':
          return b.pricePerMin - a.pricePerMin
        case 'rating':
          return b.rating - a.rating
        case 'experience':
          return b.experienceYears - a.experienceYears
        default:
          return b.reviewCount - a.reviewCount
      }
    })

    return list
  }, [query, category, expertise, language, maxPrice, minExperience, minRating, onlineOnly, sortBy])

  function resetFilters() {
    setQuery('')
    setCategory('')
    setExpertise('')
    setLanguage('')
    setMaxPrice(50)
    setMinExperience(0)
    setMinRating(0)
    setOnlineOnly(false)
    setSortBy('popularity')
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Discover"
        title="Find Your Astrologer"
        subtitle="Filter by category, expertise, language, price, experience and rating to find the right match."
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <aside className={`lg:w-72 shrink-0 ${filtersOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="card flex flex-col gap-5 sticky top-20">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Filters</h2>
              <button type="button" onClick={resetFilters} className="text-xs text-orange font-medium">
                Reset all
              </button>
            </div>

            <div>
              <label htmlFor="search" className="text-xs text-text-secondary font-medium mb-1.5 block">
                Search by name
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Acharya Ramesh"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="text-xs text-text-secondary font-medium mb-1.5 block">
                Category
              </label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                <option value="">All categories</option>
                {astrologerCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expertise" className="text-xs text-text-secondary font-medium mb-1.5 block">
                Expertise
              </label>
              <select id="expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} className="input-field">
                <option value="">All expertise</option>
                {allExpertise.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="language" className="text-xs text-text-secondary font-medium mb-1.5 block">
                Language
              </label>
              <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field">
                <option value="">All languages</option>
                {allLanguages.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="price" className="text-xs text-text-secondary font-medium mb-1.5 block">
                Max price: ₹{maxPrice}/min
              </label>
              <input
                id="price"
                type="range"
                min={10}
                max={50}
                step={5}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-orange"
              />
            </div>

            <div>
              <label htmlFor="experience" className="text-xs text-text-secondary font-medium mb-1.5 block">
                Min experience: {minExperience}+ yrs
              </label>
              <input
                id="experience"
                type="range"
                min={0}
                max={20}
                step={1}
                value={minExperience}
                onChange={(e) => setMinExperience(Number(e.target.value))}
                className="w-full accent-orange"
              />
            </div>

            <div>
              <label htmlFor="rating" className="text-xs text-text-secondary font-medium mb-1.5 block">
                Min rating: {minRating.toFixed(1)}+
              </label>
              <input
                id="rating"
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full accent-orange"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="accent-orange w-4 h-4"
              />
              Online only
            </label>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="lg:hidden btn-outline !py-2 !px-4 text-sm"
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
            <p className="text-sm text-text-secondary">{filtered.length} astrologers found</p>
            <select
              aria-label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field w-auto !py-2 text-sm"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>Sort: {opt.label}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-text-secondary">No astrologers match your filters.</p>
              <button type="button" onClick={resetFilters} className="btn-outline mt-4">
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((a) => (
                <AstrologerCard key={a.id} astrologer={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
