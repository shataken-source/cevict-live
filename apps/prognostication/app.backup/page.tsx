import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Win More with Data-Driven Picks
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Access premium sports predictions powered by advanced analytics and expert analysis
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link 
              href="/free-picks"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-xl font-semibold hover:bg-gray-100 transition"
            >
              View Free Picks
            </Link>
            <Link 
              href="/premium-picks"
              className="bg-yellow-400 text-black px-8 py-4 rounded-lg text-xl font-semibold hover:bg-yellow-300 transition"
            >
              Get Premium Access
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Why Prognostication?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-3">Data-Driven</h3>
              <p className="text-gray-600">Our picks are backed by advanced statistical analysis and machine learning models</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold mb-3">High Accuracy</h3>
              <p className="text-gray-600">Track record of consistent winners with transparent performance metrics</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold mb-3">Real-Time Updates</h3>
              <p className="text-gray-600">Get instant notifications on new picks and betting opportunities</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Winning?</h2>
          <p className="text-xl mb-8">Join thousands of successful bettors using our premium picks</p>
          <Link 
            href="/premium-picks"
            className="bg-yellow-400 text-black px-8 py-4 rounded-lg text-xl font-semibold hover:bg-yellow-300 transition inline-block"
          >
            Get Premium Access Now
          </Link>
        </div>
      </section>
    </div>
  )
}
