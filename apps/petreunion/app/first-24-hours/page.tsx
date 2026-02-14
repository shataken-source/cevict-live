import Link from 'next/link'
import { Clock, Search, FileText, Phone, Home, CheckCircle, ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'First 24 Hours - Lost Pet Checklist | PetReunion',
  description: 'What to do in the first 24 hours after your pet goes missing. Search nearby, flyers, shelters, microchip, and report here.',
}

const steps = [
  {
    icon: Search,
    title: 'Search immediately nearby',
    items: [
      'Check your yard, under decks, sheds, and bushes—many lost cats stay within 3–5 houses.',
      'Call your pet’s name; shake treats or a familiar noise (e.g. food bag).',
      'For cats: check at dawn and dusk (they’re most active then); look in high and low places.',
    ],
    color: 'text-blue-600',
  },
  {
    icon: FileText,
    title: 'Report and post',
    items: [
      'Report your pet as lost here on PetReunion so others can search and match.',
      'Lost a dog? Start a Search Party in the Ring (Neighbors) app—AI scans nearby Ring cameras for matches; no Ring device required to report.',
      'Post on local social media (Nextdoor, Facebook lost-pet groups, neighborhood chats).',
      'Put up physical flyers with a clear photo, description, and contact info near where they were last seen.',
    ],
    color: 'text-purple-600',
  },
  {
    icon: Phone,
    title: 'Contact shelters and vets',
    items: [
      'Call local animal shelters and animal control; ask how to file a lost report and check their intake.',
      'Call nearby vets and emergency clinics in case someone brought your pet in.',
      'Visit shelters in person if possible—don’t rely only on phone descriptions.',
    ],
    color: 'text-green-600',
  },
  {
    icon: Home,
    title: 'Microchip and ID',
    items: [
      'If your pet is microchipped, make sure the chip registry has your current phone and address.',
      'If not chipped, consider getting it done after reunion—it greatly increases the chance of getting them back next time.',
    ],
    color: 'text-amber-600',
  },
]

export default function First24HoursPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-10 h-10 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">First 24 Hours</h1>
        </div>
        <p className="text-lg text-gray-600 mb-8">
          A quick checklist for when your pet just went missing. Time matters—start with these steps.
        </p>

        <div className="space-y-6">
          {steps.map(({ icon: Icon, title, items, color }) => (
            <div key={title} className="bg-white rounded-lg shadow-lg p-6">
              <h2 className={`text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2 ${color}`}>
                <Icon className="w-6 h-6" />
                {title}
              </h2>
              <ul className="space-y-2 text-gray-700">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-white rounded-lg shadow border-2 border-blue-200">
          <p className="font-semibold text-gray-900 mb-2">Report your lost pet here</p>
          <p className="text-gray-600 text-sm mb-4">
            The sooner you add a listing, the sooner the community and our search can help. Include a clear photo and location (City, State).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/report/lost"
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Report lost pet
            </Link>
            <a
              href="https://ring.com/search-party"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-medium text-sm"
            >
              Ring Search Party (lost dogs)
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/about" className="text-blue-600 hover:underline">About PetReunion</Link>
          {' · '}
          <Link href="/privacy" className="text-blue-600 hover:underline">Data Privacy</Link>
        </p>
      </div>
    </div>
  )
}
