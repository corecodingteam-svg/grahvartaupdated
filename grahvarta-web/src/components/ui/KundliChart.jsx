// Simple 4x4 grid "North Indian style" Kundli chart. Not astronomically laid
// out — just a visually structured 12-house grid with planet abbreviations,
// which is sufficient for this demo feature.
const gridPositions = [
  { house: 1, area: '1 / 2 / 2 / 3' },
  { house: 2, area: '1 / 1 / 2 / 2' },
  { house: 3, area: '2 / 1 / 3 / 2' },
  { house: 4, area: '2 / 2 / 3 / 3' },
  { house: 5, area: '3 / 1 / 4 / 2' },
  { house: 6, area: '4 / 1 / 5 / 2' },
  { house: 7, area: '4 / 2 / 5 / 3' },
  { house: 8, area: '4 / 3 / 5 / 4' },
  { house: 9, area: '4 / 4 / 5 / 5' },
  { house: 10, area: '3 / 4 / 4 / 5' },
  { house: 11, area: '2 / 4 / 3 / 5' },
  { house: 12, area: '2 / 3 / 3 / 4' },
]

export default function KundliChart({ houses = [] }) {
  return (
    <div className="grid grid-cols-4 grid-rows-4 gap-1 aspect-square w-full max-w-sm mx-auto bg-border rounded-2xl overflow-hidden p-1">
      {gridPositions.map(({ house, area }) => {
        const houseData = houses.find((h) => h.house === house)
        return (
          <div
            key={house}
            style={{ gridArea: area }}
            className={`bg-card rounded-lg flex flex-col items-center justify-center gap-1 p-1 border ${
              house === 1 ? 'border-orange/60' : 'border-border'
            }`}
          >
            <span className="text-[10px] text-text-muted">
              {house}
              {houseData?.sign && <span className="hidden sm:inline"> · {houseData.sign.slice(0, 3)}</span>}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1">
              {houseData?.planets.length ? (
                houseData.planets.map((abbr) => (
                  <span key={abbr} className="text-[11px] sm:text-xs font-semibold text-orange">
                    {abbr}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-text-muted">&mdash;</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
