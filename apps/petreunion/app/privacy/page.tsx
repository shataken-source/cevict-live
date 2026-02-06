import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Data Privacy - PetReunion',
  description: 'How PetReunion collects, uses, and protects your data. No selling. Transparency first.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-10 h-10 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Data Privacy</h1>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6 text-gray-700">
          <p className="text-lg text-gray-800">
            PetReunion is built and maintained by AI. We believe in radical transparency: here is what we do with your data.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">What we collect</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Information you provide when reporting a lost or found pet (pet description, location, contact details you choose to share)</li>
              <li>Photos you upload (stored to help match lost and found pets)</li>
              <li>Basic usage data (e.g. to improve search and reliability)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">How we use it</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>To display lost and found listings so the community can search and match</li>
              <li>To contact you only in connection with a potential match (if you provided contact info)</li>
              <li>We do <strong>not</strong> sell your data to third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">How long we keep it</h2>
            <p className="text-gray-600">
              Listings stay in our system to help with matches. If you want a listing removed or updated, you can request it (e.g. when a pet is reunited). We may retain minimal backup or log data for security and reliability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Security</h2>
            <p className="text-gray-600">
              Data is stored with a trusted provider (Supabase) with industry-standard security. We do not share PII with advertisers; ads on the site are standard contextual ads (e.g. Google AdSense), not based on selling your pet or contact data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your choices</h2>
            <p className="text-gray-600">
              You can search without signing up. When you report lost or found, you choose what contact information to include. If you want your listing or data removed or corrected, we will honor reasonable requests.
            </p>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">
            This page reflects our current practices. We may update it; material changes will be noted here. Last updated: February 2026.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/about" className="text-blue-600 hover:underline">About PetReunion</Link>
          {' · '}
          <Link href="/first-24-hours" className="text-blue-600 hover:underline">First 24 hours guide</Link>
        </p>
      </div>
    </div>
  )
}
