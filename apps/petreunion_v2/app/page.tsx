import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          PetReunion v2
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Clean restart. No scrapers. No fake data. Only real, user-submitted reports.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/report/lost"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Report Lost Pet
          </Link>
          <Link
            href="/report-found"
            className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
          >
            Report Found Pet
          </Link>
          <Link
            href="/search"
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50"
          >
            Search Pets
          </Link>
        </div>
      </div>
    </main>
  );
}

