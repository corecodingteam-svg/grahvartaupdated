// Static demo Subh Muhurat data — auspicious date/time windows per category.
// All dates/times are illustrative demo content, not real panchang calculations.
export const muhuratCategories = [
  {
    slug: 'annaprashan',
    title: 'Annaprashan',
    description: 'Auspicious timings for a baby’s first solid-food ceremony, chosen to support healthy growth and good fortune.',
    dates: [
      { date: 'Sep 24, 2026', day: 'Thursday', time: '09:12 AM – 11:04 AM' },
      { date: 'Oct 08, 2026', day: 'Thursday', time: '08:40 AM – 10:20 AM' },
      { date: 'Oct 22, 2026', day: 'Thursday', time: '09:05 AM – 10:55 AM' },
    ],
  },
  {
    slug: 'naamkaran',
    title: 'Naamkaran',
    description: 'Favourable windows for the naming ceremony, typically observed on or after the 11th day after birth.',
    dates: [
      { date: 'Sep 21, 2026', day: 'Monday', time: '07:30 AM – 09:15 AM' },
      { date: 'Oct 05, 2026', day: 'Monday', time: '07:45 AM – 09:30 AM' },
      { date: 'Oct 19, 2026', day: 'Monday', time: '07:20 AM – 09:00 AM' },
    ],
  },
  {
    slug: 'vehicle-purchase',
    title: 'Car / Bike Purchase',
    description: 'Auspicious slots considered favourable for booking or taking delivery of a new vehicle.',
    dates: [
      { date: 'Sep 25, 2026', day: 'Friday', time: '10:00 AM – 01:30 PM' },
      { date: 'Oct 09, 2026', day: 'Friday', time: '10:15 AM – 01:45 PM' },
      { date: 'Oct 30, 2026', day: 'Friday', time: '09:50 AM – 01:10 PM' },
    ],
  },
  {
    slug: 'marriage',
    title: 'Marriage',
    description: 'Traditionally favoured wedding dates based on planetary alignment, avoiding inauspicious periods.',
    dates: [
      { date: 'Nov 27, 2026', day: 'Friday', time: '06:45 PM – 10:30 PM' },
      { date: 'Dec 04, 2026', day: 'Friday', time: '07:00 PM – 11:00 PM' },
      { date: 'Dec 11, 2026', day: 'Friday', time: '06:30 PM – 10:15 PM' },
    ],
  },
  {
    slug: 'bhoomi-pujan',
    title: 'Bhoomi Pujan',
    description: 'Ground-breaking ceremony timings believed to bring stability and prosperity to a new construction.',
    dates: [
      { date: 'Sep 27, 2026', day: 'Sunday', time: '08:00 AM – 10:30 AM' },
      { date: 'Oct 11, 2026', day: 'Sunday', time: '08:15 AM – 10:45 AM' },
      { date: 'Oct 25, 2026', day: 'Sunday', time: '07:50 AM – 10:20 AM' },
    ],
  },
  {
    slug: 'griha-pravesh',
    title: 'Griha Pravesh',
    description: 'Housewarming muhurat for moving into a new home, chosen to invite positive energy into the household.',
    dates: [
      { date: 'Oct 02, 2026', day: 'Friday', time: '09:30 AM – 12:00 PM' },
      { date: 'Oct 16, 2026', day: 'Friday', time: '09:15 AM – 11:45 AM' },
      { date: 'Nov 06, 2026', day: 'Friday', time: '09:40 AM – 12:10 PM' },
    ],
  },
  {
    slug: 'mundan',
    title: 'Mundan',
    description: 'Auspicious dates for a child’s first hair-cutting ceremony, an important rite of passage.',
    dates: [
      { date: 'Sep 28, 2026', day: 'Monday', time: '08:30 AM – 10:45 AM' },
      { date: 'Oct 12, 2026', day: 'Monday', time: '08:10 AM – 10:30 AM' },
      { date: 'Oct 26, 2026', day: 'Monday', time: '08:25 AM – 10:40 AM' },
    ],
  },
]

export function getMuhuratBySlug(slug) {
  return muhuratCategories.find((m) => m.slug === slug)
}
