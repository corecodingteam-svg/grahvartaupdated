import { useEffect } from 'react'
import { setPageMeta } from '../lib/demo'

const EFFECTIVE_DATE = 'September 22, 2026'
const CONTACT_EMAIL = 'support@inferapp.online'
const APP_NAME = 'StorySparkle'
const DEVELOPER_NAME = 'Infer'

const SECTIONS = [
  {
    heading: 'Overview',
    body: [
      `This Privacy Policy explains how ${APP_NAME} ("the App"), developed by ${DEVELOPER_NAME} ("we", "us", or "our"), collects, uses, and protects information when you use the App on your iOS device.`,
      'By downloading or using the App, you agree to the collection and use of information as described in this policy.',
    ],
  },
  {
    heading: 'Information We Collect',
    body: [
      'We aim to collect as little personal information as necessary to provide the App’s features. Depending on how you use the App, we may collect:',
    ],
    list: [
      'Content you create — stories, drafts, and preferences you save within the App.',
      'Device information — device type, operating system version, and app version, used for compatibility and crash diagnostics.',
      'Usage data — general interaction data (such as screens visited or features used) to help us improve the App.',
      'Support communications — if you contact us for support, we retain the email address and message you send us.',
    ],
  },
  {
    heading: 'Information We Do Not Collect',
    body: [
      'The App does not require account registration and does not knowingly collect precise location data, contacts, photos, or biometric information unless you explicitly choose to share such content through a feature that requests it.',
    ],
  },
  {
    heading: 'How We Use Information',
    list: [
      'To provide, operate, and maintain the App’s core features.',
      'To diagnose technical issues and improve stability and performance.',
      'To respond to support requests and feedback.',
      'To understand aggregate usage trends so we can improve the App experience.',
    ],
  },
  {
    heading: 'Data Storage and Security',
    body: [
      'Content you create in the App may be stored locally on your device and, where a syncing feature is enabled, on secure servers we operate or engage a third party to operate on our behalf. We use reasonable administrative, technical, and physical safeguards to protect information from unauthorized access, alteration, disclosure, or destruction.',
      'No method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    heading: 'Third-Party Services',
    body: [
      'The App may use third-party services (such as analytics or crash-reporting providers) that collect information used to identify you. These providers have their own privacy policies governing their use of such information.',
    ],
  },
  {
    heading: 'Children’s Privacy',
    body: [
      'The App is not directed at children under the age of 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can remove it.',
    ],
  },
  {
    heading: 'Your Choices and Rights',
    list: [
      'You may stop using the App at any time and delete it from your device, which removes locally stored data.',
      'You may request access to, correction of, or deletion of any personal information we hold about you by contacting us at the email below.',
      'You may manage app permissions (such as notifications) at any time via your device’s Settings app.',
    ],
  },
  {
    heading: 'Data Retention',
    body: [
      'We retain information only for as long as necessary to fulfill the purposes described in this policy, unless a longer retention period is required or permitted by law.',
    ],
  },
  {
    heading: 'Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. Any changes will be posted on this page with a revised effective date. Continued use of the App after changes are posted constitutes acceptance of the updated policy.',
    ],
  },
  {
    heading: 'Contact Us',
    body: [
      `If you have questions or concerns about this Privacy Policy or the App's data practices, please contact us at ${CONTACT_EMAIL}.`,
    ],
  },
]

export default function StoryPrivacyPolicy() {
  useEffect(() => {
    setPageMeta({
      title: `${APP_NAME} Privacy Policy`,
      description: `Privacy Policy for the ${APP_NAME} iOS app.`,
    })
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="max-w-3xl mx-auto px-5 py-14 sm:py-20">
        <header className="mb-10">
          <p className="text-sm font-medium text-orange-600 mb-2">{APP_NAME}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>
        </header>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-slate-900 mb-3">{section.heading}</h2>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="text-slate-600 leading-relaxed mb-3">
                  {paragraph}
                </p>
              ))}
              {section.list && (
                <ul className="list-disc pl-5 space-y-2 text-slate-600 leading-relaxed">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="mt-14 pt-6 border-t border-slate-200 text-sm text-slate-400">
          &copy; {new Date().getFullYear()} {DEVELOPER_NAME}. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
