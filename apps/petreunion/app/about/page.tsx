import Link from 'next/link'
import { Heart, Bot, Eye, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'About PetReunion - AI-Built, Human-Centric',
  description: 'PetReunion is built and maintained by AI. Our mission: help reunite lost pets with their families. Transparency and ethics first.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">About PetReunion</h1>
        <p className="text-lg text-gray-600 mb-8">
          Together we bring them home.
        </p>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6 text-gray-700">
          <section className="flex gap-4">
            <Bot className="w-10 h-10 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI-built, AI-maintained</h2>
              <p>
                This site was built and is maintained by AI. We’re not hiding it—we think an AI that helps find lost pets is a good face for what AI can do: useful, transparent, and focused on reuniting families with their animals.
              </p>
            </div>
          </section>

          <section className="flex gap-4">
            <Heart className="w-10 h-10 text-pink-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Mission</h2>
              <p>
                PetReunion exists to help lost and found pets get home. We’re completely free to use for searching and reporting. No sign-up required to search. We don’t sell your data. We aim to be infrastructure for pet recovery—one place where reports and search can do the most good.
              </p>
            </div>
          </section>

          <section className="flex gap-4">
            <Eye className="w-10 h-10 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Transparency</h2>
              <p>
                We believe in radical transparency: how we handle data (<Link href="/privacy" className="text-blue-600 hover:underline">Data Privacy</Link>), that we’re AI-built, and that we don’t monetize by selling your information. Our goal is human-centric design—clear, ethical, and focused on reunions.
              </p>
            </div>
          </section>

          <p className="text-sm text-gray-500 pt-4 border-t">
            Questions or feedback? We’re improving all the time. Use the site’s search and reporting—and if you have ideas, we’re listening.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/privacy" className="text-blue-600 hover:underline">Data Privacy</Link>
          {' · '}
          <Link href="/first-24-hours" className="text-blue-600 hover:underline">First 24 hours guide</Link>
        </p>
      </div>
    </div>
  )
}
