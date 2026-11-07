import LegalPage from '../components/ui/LegalPage'

// Public account-deletion page, linked as the "Delete account URL" in the
// Google Play listing. Keep it reachable without logging in.
const EFFECTIVE_DATE = 'November 7, 2026'
const CONTACT_EMAIL = 'support@grahvarta.com'

const SECTIONS = [
  {
    id: 'overview',
    heading: 'Delete your GrahVarta account',
    body: [
      'This page explains how to delete your account and personal data from GrahVarta, the astrology app and website by GrahVarta. Deleting your account applies to both the GrahVarta app and grahvarta.com, since they share one account.',
    ],
  },
  {
    id: 'steps',
    heading: 'How to request deletion',
    list: [
      `Send an email to ${CONTACT_EMAIL} from the email address registered on your GrahVarta account.`,
      'Use the subject line "Delete my account".',
      'Optionally, mention your registered name or phone number to help us find your account faster.',
      'We may reply to confirm the request comes from you before deleting anything.',
    ],
    after: 'We will delete your account within 30 days of confirming your request and email you when it is done. Any unused wallet balance is forfeited once the account is deleted, so please use or ask about it before you request deletion.',
  },
  {
    id: 'deleted',
    heading: 'What we delete',
    list: [
      'Account details — your name, email address, phone number, password and profile photo.',
      'Birth details you saved for yourself and for family members.',
      'Your chat messages and images from consultations, and your saved kundli, charts and reports.',
      'Your community posts, comments, likes and reviews. Where removing a review or comment would break another person\'s conversation, we anonymise it instead.',
      'Your notification settings, device tokens and preferences.',
    ],
  },
  {
    id: 'kept',
    heading: 'What we keep, and for how long',
    list: [
      'Payment, wallet and transaction records (amounts, dates and consultation billing) — kept for up to 8 years, as required by Indian tax and accounting law, then deleted.',
      'Records needed to resolve an open dispute, refund or legal claim — kept until it is resolved.',
      'Server security logs — deleted on our normal log rotation, within 90 days.',
    ],
    after: 'Records we keep are not used for any other purpose and are no longer linked to an active profile.',
  },
  {
    id: 'partial',
    heading: 'Deleting some data without closing your account',
    body: [
      `If you want to remove specific data — such as saved birth details, a family member's profile or a community post — but keep your account, email ${CONTACT_EMAIL} with the subject "Delete some of my data" and tell us what to remove.`,
    ],
  },
]

export default function DeleteAccount() {
  return (
    <LegalPage
      title="Delete Account"
      metaDescription="How to delete your GrahVarta account and personal data, what is deleted and what is kept."
      effectiveDate={EFFECTIVE_DATE}
      sections={SECTIONS}
      seeAlso={{ to: '/privacy', label: 'Privacy Policy' }}
    />
  )
}
