import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal } from 'lucide-react'
import AstrologerCard from '../components/astrologer/AstrologerCard'
import Card from '../components/ui/Card'
import SectionHeading from '../components/ui/SectionHeading'
import { fetchAstrologers, sortOptions } from '../lib/astrologers'
import { normalizeAstrologer } from '../lib/astrologerDisplay'
import { setPageMeta } from '../lib/demo'

const PAGE_SIZE = 24

export default function Astrologers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [expertise, setExpertise] = useState('')
  const [language, setLanguage] = useState('')
  const [maxPrice, setMaxPrice] = useState(0)
  const [minExperience, setMinExperience] = useState(0)
  const [minRating, setMinRating] = useState(0)
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [sortBy, setSortBy] = useState('popular')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [astrologers, setAstrologers] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setPageMeta('Astrologers | GrahVarta', 'Browse and filter verified astrologers by expertise, language, price, experience and rating.')
  }, [])

  const loadPage = useCallback(async (pageToLoad, { append } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(false)

    try {
      const { list, total: totalCount } = await fetchAstrologers({
        page: pageToLoad,
        limit: PAGE_SIZE,
        sort: sortBy,
        onlineOnly,
      })
      const normalized = list.map(normalizeAstrologer)
      setAstrologers((prev) => (append ? [...prev, ...normalized] : normalized))
      setTotal(totalCount)
      setPage(pageToLoad)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, onlineOnly])

  useEffect(() => {
    loadPage(1)
  }, [loadPage])

  useEffect(() => {
    const next = {}
    if (query) next.q = query
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Filter option lists are derived from whatever's actually been loaded so
  // far, rather than a hardcoded taxonomy — the real specialization/language
  // strings astrologers register with aren't known ahead of time.
  const allLanguages = useMemo(
    () => [...new Set(astrologers.flatMap((a) => a.languages))].sort(),
    [astrologers]
  )
  const allExpertise = useMemo(
    () => [...new Set(astrologers.flatMap((a) => a.expertise))].sort(),
    [astrologers]
  )
  const highestPrice = useMemo(
    () => astrologers.reduce((max, a) => Math.max(max, a.pricePerMin), 0),
    [astrologers]
  )

  const filtered = useMemo(() => {
    // Matches loosely against name, expertise and bio — the query can come
    // from a free-text "Browse by Category" tile (e.g. "Love & Relationship"),
    // not just a literal name search, and the real specialization taxonomy
    // isn't known ahead of time.
    const queryWords = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)

    return astrologers.filter((a) => {
      if (queryWords.length > 0) {
        const haystack = `${a.name} ${a.expertise.join(' ')} ${a.bio}`.toLowerCase()
        if (!queryWords.some((w) => haystack.includes(w))) return false
      }
      if (expertise && !a.expertise.includes(expertise)) return false
      if (language && !a.languages.includes(language)) return false
      if (maxPrice > 0 && a.pricePerMin > maxPrice) return false
      if (a.experienceYears < minExperience) return false
      if (a.rating < minRating) return false
      return true
    })
  }, [astrologers, query, expertise, language, maxPrice, minExperience, minRating])

  function resetFilters() {
    setQuery('')
    setExpertise('')
    setLanguage('')
    setMaxPrice(0)
    setMinExperience(0)
    setMinRating(0)
  }

  const hasMore = astrologers.length < total

  return (
    <div className="container-page py-8 sm:py-12">
      <SectionHeading
        level="h1"
        eyebrow="Discover"
        title="Find Your Astrologer"
        subtitle="Filter by expertise, language, price, experience and rating to find the right match."
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
                  placeholder="Search astrologers"
                  className="input-field pl-9 !py-2 text-base lg:!text-xs"
                />
              </div>
            </div>

            {allExpertise.length > 0 && (
              <div>
                <label htmlFor="expertise" className="text-xs text-text-secondary font-medium mb-1.5 block">
                  Expertise
                </label>
                <select id="expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} className="input-field !py-2 text-base lg:!text-xs">
                  <option value="">All expertise</option>
                  {allExpertise.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            )}

            {allLanguages.length > 0 && (
              <div>
                <label htmlFor="language" className="text-xs text-text-secondary font-medium mb-1.5 block">
                  Language
                </label>
                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="input-field !py-2 text-base lg:!text-xs">
                  <option value="">All languages</option>
                  {allLanguages.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            )}

            {highestPrice > 0 && (
              <div>
                <label htmlFor="price" className="text-xs text-text-secondary font-medium mb-1.5 block">
                  Max price: {maxPrice > 0 ? `₹${maxPrice}/min` : 'Any'}
                </label>
                <input
                  id="price"
                  type="range"
                  min={0}
                  max={highestPrice}
                  step={5}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-orange"
                />
              </div>
            )}

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

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => setOnlineOnly(e.target.checked)}
                className="accent-orange w-3.5 h-3.5"
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
            <p className="text-sm text-text-secondary">
              {loading ? 'Loading…' : `${filtered.length} of ${total} astrologers`}
            </p>
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

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-48 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="card text-center py-16">
              <p className="text-text-secondary">Could not load astrologers right now. Please try again shortly.</p>
              <button type="button" onClick={() => loadPage(1)} className="btn-outline mt-4">
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-text-secondary">No astrologers match your filters.</p>
              <button type="button" onClick={resetFilters} className="btn-outline mt-4">
                Reset filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((a) => (
                  <AstrologerCard key={a.id} astrologer={a} />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={() => loadPage(page + 1, { append: true })}
                    className="btn-outline"
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading…' : 'Load more astrologers'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
