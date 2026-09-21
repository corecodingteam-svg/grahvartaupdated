// Fully static demo data for the Astrology Shop / AstroMall.
// Images use https://picsum.photos placeholders matching the convention
// used in astrologers.js.

export const productCategories = ['Gemstones', 'Rudraksha', 'Yantras', 'Books', 'Puja Items']

export const products = [
  {
    slug: 'natural-yellow-sapphire',
    name: 'Natural Yellow Sapphire (Pukhraj)',
    category: 'Gemstones',
    image: 'https://picsum.photos/seed/product-yellow-sapphire/600/600',
    price: 6500,
    description:
      'Certified natural Yellow Sapphire, traditionally worn to strengthen Jupiter (Guru) in the birth chart. Comes with a lab certificate and is set in a panchdhatu ring on request.',
    inStock: true,
  },
  {
    slug: 'natural-red-coral',
    name: 'Natural Red Coral (Moonga)',
    category: 'Gemstones',
    image: 'https://picsum.photos/seed/product-red-coral/600/600',
    price: 3200,
    description:
      'Certified Red Coral associated with Mars (Mangal), commonly recommended to build confidence, courage and vitality.',
    inStock: true,
  },
  {
    slug: 'natural-blue-sapphire',
    name: 'Natural Blue Sapphire (Neelam)',
    category: 'Gemstones',
    image: 'https://picsum.photos/seed/product-blue-sapphire/600/600',
    price: 8900,
    description:
      'Certified Blue Sapphire associated with Saturn (Shani). A powerful gemstone recommended to be worn only after consultation.',
    inStock: false,
  },
  {
    slug: '5-mukhi-rudraksha-mala',
    name: '5 Mukhi Rudraksha Mala (108 Beads)',
    category: 'Rudraksha',
    image: 'https://picsum.photos/seed/product-5mukhi-mala/600/600',
    price: 850,
    description:
      'A traditional 108-bead mala of 5 Mukhi Rudraksha, used for daily japa and meditation, and associated with calm and focus.',
    inStock: true,
  },
  {
    slug: '1-mukhi-rudraksha-pendant',
    name: '1 Mukhi Rudraksha Pendant',
    category: 'Rudraksha',
    image: 'https://picsum.photos/seed/product-1mukhi-pendant/600/600',
    price: 4200,
    description:
      'A rare single-faced Rudraksha bead set as a pendant, traditionally associated with clarity of mind and spiritual growth.',
    inStock: true,
  },
  {
    slug: '7-mukhi-rudraksha-bracelet',
    name: '7 Mukhi Rudraksha Bracelet',
    category: 'Rudraksha',
    image: 'https://picsum.photos/seed/product-7mukhi-bracelet/600/600',
    price: 1100,
    description:
      'A comfortable everyday bracelet of 7 Mukhi Rudraksha beads, associated with stability and steady progress.',
    inStock: true,
  },
  {
    slug: 'shree-yantra',
    name: 'Shree Yantra (Copper, Energised)',
    category: 'Yantras',
    image: 'https://picsum.photos/seed/product-shree-yantra/600/600',
    price: 1250,
    description:
      'A handcrafted copper Shree Yantra, energised as per tradition, placed at home or workplace to invite prosperity and positive energy.',
    inStock: true,
  },
  {
    slug: 'kuber-yantra',
    name: 'Kuber Yantra (Copper)',
    category: 'Yantras',
    image: 'https://picsum.photos/seed/product-kuber-yantra/600/600',
    price: 990,
    description:
      'A copper Kuber Yantra associated with wealth and financial stability, ideal for placement in the cash box or workplace.',
    inStock: true,
  },
  {
    slug: 'navgraha-yantra',
    name: 'Navgraha Yantra (Copper)',
    category: 'Yantras',
    image: 'https://picsum.photos/seed/product-navgraha-yantra/600/600',
    price: 1450,
    description:
      'A Navgraha Yantra representing all nine planets, used to help balance planetary influences when placed in the home altar.',
    inStock: true,
  },
  {
    slug: 'kundli-and-remedies-guide',
    name: 'Kundli & Remedies — A Practical Guide',
    category: 'Books',
    image: 'https://picsum.photos/seed/product-kundli-book/600/600',
    price: 399,
    description:
      'A beginner-friendly book explaining how to read your birth chart and understand common remedies suggested in Vedic astrology.',
    inStock: true,
  },
  {
    slug: 'lal-kitab-remedies-handbook',
    name: 'Lal Kitab Remedies Handbook',
    category: 'Books',
    image: 'https://picsum.photos/seed/product-lal-kitab-book/600/600',
    price: 349,
    description:
      'A concise handbook of common Lal Kitab remedies for career, family and financial matters, explained in simple language.',
    inStock: true,
  },
  {
    slug: 'vastu-for-modern-homes',
    name: 'Vastu for Modern Homes',
    category: 'Books',
    image: 'https://picsum.photos/seed/product-vastu-book/600/600',
    price: 449,
    description:
      'Practical Vastu Shastra guidance adapted for modern apartments and homes, with simple do-it-yourself suggestions.',
    inStock: true,
  },
  {
    slug: 'puja-thali-set',
    name: 'Brass Puja Thali Set',
    category: 'Puja Items',
    image: 'https://picsum.photos/seed/product-puja-thali/600/600',
    price: 799,
    description:
      'A complete brass puja thali set including diya, incense holder, kumkum box and bell — everything needed for daily worship.',
    inStock: true,
  },
  {
    slug: 'panchdhatu-diya-pair',
    name: 'Panchdhatu Diya (Set of 2)',
    category: 'Puja Items',
    image: 'https://picsum.photos/seed/product-panchdhatu-diya/600/600',
    price: 599,
    description:
      'A pair of traditional Panchdhatu (five-metal alloy) diyas for daily aarti and festive worship.',
    inStock: true,
  },
  {
    slug: 'sandalwood-incense-pack',
    name: 'Pure Sandalwood Incense (Pack of 4)',
    category: 'Puja Items',
    image: 'https://picsum.photos/seed/product-sandalwood-incense/600/600',
    price: 249,
    description:
      'A set of four boxes of pure sandalwood incense sticks, ideal for daily puja and meditation.',
    inStock: true,
  },
]

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug)
}
