import LegalPage from '../components/ui/LegalPage'

const EFFECTIVE_DATE = 'September 24, 2026'
const CONTACT_EMAIL = 'support@grahvarta.com'

const SECTIONS = [
  {
    id: 'overview',
    heading: 'Overview',
    body: [
      'GrahVarta ("we", "us", "our") provides an astrology platform — through this website and our mobile app — where you can consult astrologers by chat, voice and video, get horoscopes, kundli, birth charts and reports, and take part in live sessions and a community feed.',
      'This Privacy Policy explains what personal information we collect, why we collect it, who we share it with, and the choices you have. By creating an account or using GrahVarta, you agree to the practices described here. If you do not agree, please do not use the service.',
    ],
  },
  {
    id: 'collect',
    heading: 'Information We Collect',
    body: ['Depending on how you use GrahVarta, we collect the following:'],
    list: [
      'Account details — your name, email address and password. Passwords are stored only in hashed form; we cannot read them.',
      'Birth details — date, time and place of birth, if you provide them, used to prepare your kundli, birth chart, personalised horoscope and reports. You can also save birth details of family members you add.',
      'Profile photo — if you upload one.',
      'Consultation content — messages and images you send to astrologers in chat, and records of your consultations (astrologer, type, time, duration and charges). Voice and video calls are carried live through our real-time communication provider.',
      'Wallet and payment records — top-ups, per-minute charges, report purchases and gifts sent. Payments are handled by our payment provider; we do not receive or store your card, UPI or bank credentials.',
      'Community activity — posts, comments, likes, live-session chat messages, gifts and reviews you submit. These may be visible to other users.',
      'Inputs to our free tools — details you enter into tools such as Kundli, Kundli Matching, Tarot, Numerology, Vastu, Love Calculator and Muhurat, so that we can produce your result.',
      'Technical information — browser and device type, IP address, pages visited and basic diagnostic logs, collected automatically to run and secure the service.',
      'Support communications — anything you send us when you contact support, including through the live chat widget.',
    ],
  },
  {
    id: 'use',
    heading: 'How We Use Your Information',
    list: [
      'To create and secure your account and log you in.',
      'To connect you with astrologers and deliver chats, calls, reports and personalised content.',
      'To process payments, maintain your wallet balance and bill consultations accurately.',
      'To prepare results for the tools and reports you request.',
      'To send service messages such as consultation updates and notifications.',
      'To provide customer support, prevent fraud and abuse, and keep the platform safe.',
      'To understand how the service is used and to improve its features and performance.',
      'To comply with legal obligations.',
    ],
  },
  {
    id: 'sharing',
    heading: 'Who We Share Information With',
    body: ['We do not sell your personal information. We share it only as follows:'],
    list: [
      'Astrologers you consult — they see the details needed to advise you (such as your name, and the birth details and messages you share during the consultation).',
      'Other users — anything you post publicly in the community, live sessions or reviews (reviews can be submitted anonymously).',
      'Service providers who act on our behalf — payment processing (Razorpay), real-time voice/video (Agora), live-chat support (Tawk.to), hosting and infrastructure, and providers that help us generate astrological content from the details you enter. They may only use your information to provide their service to us.',
      'Legal and safety reasons — where required by law or to protect the rights, safety and security of users, astrologers or GrahVarta.',
      'Business transfers — if GrahVarta is involved in a merger, acquisition or sale of assets, your information may be transferred, and we will tell you if that changes how it is handled.',
    ],
  },
  {
    id: 'cookies',
    heading: 'Cookies and Local Storage',
    body: [
      'We store a login token, your theme preference and your shopping cart in your browser\'s local storage so the site works as you expect. Our live-chat widget (Tawk.to) and font provider (Google Fonts) may set their own cookies or receive your IP address under their own privacy policies. You can clear local storage and cookies at any time through your browser settings; you will then need to log in again.',
    ],
  },
  {
    id: 'security',
    heading: 'Data Security',
    body: [
      'We protect your information with measures including encrypted connections (HTTPS), hashed passwords, and access controls that limit chat history and account data to you (and the astrologer in that conversation). No system is completely secure, so we cannot guarantee absolute security. Please keep your password confidential.',
    ],
  },
  {
    id: 'retention',
    heading: 'Data Retention',
    body: [
      'We keep your information for as long as your account is active and as needed to provide the service. Some records — such as payment and transaction history — may be kept longer where required for accounting, tax, dispute-resolution or legal purposes. When information is no longer needed, we delete or anonymise it.',
    ],
  },
  {
    id: 'rights',
    heading: 'Your Choices and Rights',
    body: ['You can:'],
    list: [
      'View and update your profile, birth details and family members from My Account.',
      'Request a copy of the personal information we hold about you.',
      'Ask us to correct inaccurate information.',
      'Ask us to delete your account and associated personal data, subject to records we must keep by law.',
      'Withdraw consent for optional processing, such as notifications, at any time.',
    ],
    after: `To exercise any of these rights, email us at ${CONTACT_EMAIL} from the address on your account. We will respond within a reasonable time and in line with applicable Indian data-protection law.`,
  },
  {
    id: 'children',
    heading: 'Children\'s Privacy',
    body: [
      'GrahVarta is intended for people aged 18 and over. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, contact us and we will delete it.',
    ],
  },
  {
    id: 'transfers',
    heading: 'Where Your Data Is Processed',
    body: [
      'Some of our service providers operate servers outside India, so your information may be processed in other countries. Where this happens, we rely on providers that apply appropriate safeguards to protect it.',
    ],
  },
  {
    id: 'changes',
    heading: 'Changes to This Policy',
    body: [
      'We may update this policy from time to time. When we do, we will change the effective date above, and for significant changes we will give more prominent notice. Continued use of GrahVarta after an update means you accept the revised policy.',
    ],
  },
  {
    id: 'contact',
    heading: 'Contact Us',
    body: [
      `Questions, concerns or requests about this policy or your data? Email us at ${CONTACT_EMAIL}.`,
    ],
  },
]

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      metaDescription="How GrahVarta collects, uses, shares and protects your personal information, and the choices you have."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
      seeAlso={{ to: '/terms', label: 'Terms of Use' }}
    />
  )
}
