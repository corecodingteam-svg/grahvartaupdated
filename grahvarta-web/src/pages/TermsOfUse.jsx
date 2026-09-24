import LegalPage from '../components/ui/LegalPage'

const EFFECTIVE_DATE = 'September 24, 2026'
const CONTACT_EMAIL = 'support@grahvarta.com'

const SECTIONS = [
  {
    id: 'acceptance',
    heading: 'Acceptance of These Terms',
    body: [
      'These Terms of Use ("Terms") govern your use of the GrahVarta website and mobile app (the "Service"). By creating an account or using the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the Service.',
    ],
  },
  {
    id: 'eligibility',
    heading: 'Eligibility and Your Account',
    list: [
      'You must be at least 18 years old and able to enter into a binding contract to use the Service.',
      'You agree to provide accurate information when you register and to keep it up to date.',
      'You are responsible for keeping your password confidential and for all activity under your account. Tell us promptly if you suspect unauthorised use.',
      'One person may not operate multiple accounts to abuse offers, reviews or the platform.',
    ],
  },
  {
    id: 'service',
    heading: 'What GrahVarta Provides',
    body: [
      'GrahVarta is a platform that connects you with independent astrologers for chat, voice and video consultations, and offers astrology tools and content — including horoscopes, kundli, kundli matching, birth charts, panchang, muhurat, tarot, numerology, vastu, reports, live sessions and a community feed.',
      'Astrologers are independent practitioners, not employees of GrahVarta. We provide the platform, billing and communication tools; the advice given in a consultation is the astrologer\'s own.',
    ],
  },
  {
    id: 'disclaimer',
    heading: 'Astrology Disclaimer',
    body: [
      'Astrology is a traditional belief system and is offered for guidance, insight and entertainment. Readings, predictions, tool results and reports are not scientifically proven and are not a substitute for professional medical, legal, financial, psychological or other expert advice.',
      'Do not make important decisions — including those about health, money, legal matters or relationships — based solely on anything you receive through the Service. You use astrological content at your own discretion and risk.',
    ],
  },
  {
    id: 'wallet',
    heading: 'Wallet, Pricing and Payments',
    list: [
      'Consultations are charged per minute at the rate shown on the astrologer\'s profile before you start. Charges are deducted from your GrahVarta wallet in real time while a session is active, and a session ends automatically if your balance runs out.',
      'You add money to your wallet through our payment provider (Razorpay). We do not store your card, UPI or bank credentials.',
      'Reports and other paid items are priced as shown at the time of purchase and may be paid for with wallet balance or report credits.',
      'Prices and rates may change from time to time; the rate displayed when you start a session is the rate that applies to it.',
      `If you believe you have been charged incorrectly, contact us at ${CONTACT_EMAIL} with the details and we will review it. Refunds, where applicable, are assessed case by case.`,
    ],
  },
  {
    id: 'conduct',
    heading: 'Acceptable Use',
    body: ['You agree not to:'],
    list: [
      'Harass, abuse, threaten or discriminate against astrologers or other users, or use the Service to send obscene, hateful or unlawful content.',
      'Ask for or share personal contact details, or move a consultation outside the platform to avoid platform charges.',
      'Post spam, advertising, or misleading, defamatory or infringing content in the community, live sessions or reviews.',
      'Record, copy or redistribute consultations or live sessions without permission.',
      'Attempt to hack, disrupt or reverse-engineer the Service, use bots or scrapers, or bypass security or billing.',
      'Impersonate another person or misrepresent your identity or qualifications.',
    ],
    after: 'We may remove content and suspend or terminate accounts that break these rules.',
  },
  {
    id: 'content',
    heading: 'Your Content',
    body: [
      'You keep ownership of content you submit, such as community posts, comments and reviews. By submitting it, you give GrahVarta a non-exclusive, worldwide, royalty-free licence to host, display and distribute it in connection with operating and promoting the Service. You confirm you have the right to share it and that it does not violate anyone\'s rights or the law.',
    ],
  },
  {
    id: 'ip',
    heading: 'Our Intellectual Property',
    body: [
      'The Service — including its design, text, graphics, logos, software and the reports and tool outputs we generate — is owned by GrahVarta or its licensors and protected by intellectual-property laws. You may use it for your personal, non-commercial purposes only, and may not copy, modify, sell or exploit it without our written permission.',
    ],
  },
  {
    id: 'thirdparty',
    heading: 'Third-Party Services',
    body: [
      'The Service relies on third-party providers for payments, voice/video, live chat support and hosting. Your use of those features may be subject to the providers\' own terms. We are not responsible for third-party services outside our control.',
    ],
  },
  {
    id: 'availability',
    heading: 'Availability and Changes',
    body: [
      'We aim to keep the Service running smoothly but do not promise it will always be uninterrupted or error-free. We may change, suspend or discontinue features at any time. Astrologers\' availability, online status and response times are not guaranteed.',
    ],
  },
  {
    id: 'liability',
    heading: 'Limitation of Liability',
    body: [
      'The Service is provided "as is" and "as available". To the fullest extent permitted by law, GrahVarta is not liable for any indirect, incidental, special or consequential loss, or for any loss arising from decisions you make based on astrological guidance. Our total liability for any claim relating to the Service is limited to the amount you paid us for the transaction giving rise to the claim in the three months before it arose. Nothing in these Terms limits liability that cannot be excluded by law.',
    ],
  },
  {
    id: 'termination',
    heading: 'Suspension and Termination',
    body: [
      'You may stop using the Service and ask us to close your account at any time. We may suspend or terminate your access if you breach these Terms, misuse the Service, or where required by law. Provisions that by their nature should survive termination (such as ownership, disclaimers and limitation of liability) will continue to apply.',
    ],
  },
  {
    id: 'law',
    heading: 'Governing Law',
    body: [
      'These Terms are governed by the laws of India. Any dispute that cannot be resolved informally will be subject to the exclusive jurisdiction of the competent courts in India.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to These Terms',
    body: [
      'We may update these Terms from time to time. We will change the effective date above, and for significant changes we will give more prominent notice. Continuing to use the Service after an update means you accept the revised Terms.',
    ],
  },
  {
    id: 'contact',
    heading: 'Contact Us',
    body: [`Questions about these Terms? Email us at ${CONTACT_EMAIL}.`],
  },
]

export default function TermsOfUse() {
  return (
    <LegalPage
      title="Terms of Use"
      metaDescription="The terms that apply when you use GrahVarta — accounts, wallet and payments, acceptable use, and our astrology disclaimer."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
      seeAlso={{ to: '/privacy', label: 'Privacy Policy' }}
    />
  )
}
