// Static content for the Vastu consultation marketing page. No calculators
// here — this is an informational/booking-demo page, not a live tool.
export const vastuConsultations = [
  {
    id: 'home',
    label: 'Home',
    icon: 'Home',
    description:
      'A full-home Vastu review to help your living space feel more balanced, restful and welcoming for the whole family.',
    checks: [
      'Main entrance direction and threshold placement',
      'Kitchen and stove positioning',
      'Master bedroom and children\'s room placement',
      'Pooja room / sacred corner alignment',
      'Water sources, wells and drainage direction',
      'Overall room-to-room energy flow',
    ],
  },
  {
    id: 'office',
    label: 'Office',
    icon: 'Building2',
    description:
      'A workplace Vastu review aimed at supporting focus, smoother teamwork and steadier business growth.',
    checks: [
      'Reception and main entrance orientation',
      'Owner / manager cabin placement',
      'Seating direction for key roles',
      'Meeting room and cash-counter placement',
      'Storage, server room and utility zones',
      'Signage and lighting balance at entry points',
    ],
  },
  {
    id: 'plot',
    label: 'Plot',
    icon: 'MapPinned',
    description:
      'A pre-construction plot assessment so your build starts on a well-oriented, favourably shaped foundation.',
    checks: [
      'Plot shape and boundary regularity',
      'Road-facing direction and slope of land',
      'Ideal placement of the main structure on the plot',
      'Open space and setback distribution',
      'Soil and surrounding-terrain considerations',
      'Compound wall and gate positioning',
    ],
  },
]

export const consultationIncludes = [
  'A guided walkthrough of your space or plot layout',
  'A written summary of observations and suggested adjustments',
  'Simple, low-cost remedy suggestions where possible',
  'A follow-up Q&A session to clarify any recommendations',
]
