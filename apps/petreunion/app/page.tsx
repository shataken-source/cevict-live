import Link from 'next/link'
import { Search, Heart, AlertCircle, MapPin, HelpCircle, CheckCircle, Info, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            🐾 PetReunion
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Together We Bring Them Home
          </p>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto mb-6">
            A free community-powered platform to help reunite lost pets with their families
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <HelpCircle className="w-4 h-4" />
            <span>Need help? Check our guide below or use the search feature to find answers</span>
          </div>
        </div>

        {/* Action Cards with More Detail */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link
            href="/search"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-center group"
          >
            <Search className="w-12 h-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Search Lost Pets</h2>
            <p className="text-gray-600 mb-3">Search our database of lost and found pets</p>
            <div className="text-left text-sm text-gray-500 space-y-1 mt-4 pt-4 border-t">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Search by breed, color, location</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Filter by date, type, status</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>View detailed pet information</span>
              </p>
            </div>
            <div className="mt-4 text-blue-600 font-medium flex items-center justify-center gap-1">
              Start Searching <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/report/lost"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-center group"
          >
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Lost Pet</h2>
            <p className="text-gray-600 mb-3">Report a pet that has gone missing</p>
            <div className="text-left text-sm text-gray-500 space-y-1 mt-4 pt-4 border-t">
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span><strong>Required:</strong> Pet type, color, location</span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span><strong>Location format:</strong> "City, State"</span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>Add photos and description for best results</span>
              </p>
            </div>
            <div className="mt-4 text-red-600 font-medium flex items-center justify-center gap-1">
              Report Now <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/report/found"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-center group"
          >
            <Heart className="w-12 h-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Found Pet</h2>
            <p className="text-gray-600 mb-3">Report a pet you found</p>
            <div className="text-left text-sm text-gray-500 space-y-1 mt-4 pt-4 border-t">
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Check for collar/tags first!</span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>We'll match with lost pet reports</span>
              </p>
              <p className="flex items-start gap-2">
                <Info className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Help reunite pets with owners</span>
              </p>
            </div>
            <div className="mt-4 text-green-600 font-medium flex items-center justify-center gap-1">
              Report Found <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/shelters"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all hover:scale-105 text-center group"
          >
            <MapPin className="w-12 h-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Find Shelters</h2>
            <p className="text-gray-600 mb-3">Connect with local animal shelters</p>
            <div className="text-left text-sm text-gray-500 space-y-1 mt-4 pt-4 border-t">
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>Browse local shelters</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>Get contact information</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                <span>Find resources in your area</span>
              </p>
            </div>
            <div className="mt-4 text-purple-600 font-medium flex items-center justify-center gap-1">
              Find Shelters <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Enhanced How It Works Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">How It Works</h2>
          <p className="text-center text-gray-600 mb-8">Simple steps to reunite lost pets with their families</p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-4">1</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Report</h3>
              <div className="text-left space-y-2 text-gray-600">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Fill out the form with pet details</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Add photos (multiple angles help!)</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Include location: "City, State"</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Provide contact information</span>
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600 mb-4">2</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Search</h3>
              <div className="text-left space-y-2 text-gray-600">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Our system searches for matches</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Community members search and share</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Location-based alerts notify nearby users</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Image recognition helps identify pets</span>
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-4">3</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Reunite</h3>
              <div className="text-left space-y-2 text-gray-600">
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Get matched with potential matches</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Contact each other directly</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Verify it's your pet</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Celebrate your reunion! 🎉</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Help Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quick Help Guide</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Reporting a Lost Pet?
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Required fields:</strong> Pet type (Dog/Cat), Color, Date lost, Location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Location format:</strong> Use "City, State" (e.g., "Columbus, Indiana" or "Columbus, IN")</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Description:</strong> Include distinctive markings, collar info, microchip number</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Contact info:</strong> Email or phone helps others reach you</span>
                </li>
              </ul>
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600" />
                Having Trouble?
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Form won't submit?</strong> Check that all required fields (marked with *) are filled</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Location error?</strong> Make sure it's in "City, State" format</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Can't find your pet?</strong> Try broader search terms or clear filters</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Need more help?</strong> Use the search feature to find detailed guides</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Tips for Success</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">📸</div>
              <h3 className="font-semibold text-gray-900 mb-2">Add Photos</h3>
              <p className="text-sm text-gray-600">Multiple clear photos from different angles help others identify your pet</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-semibold text-gray-900 mb-2">Be Specific</h3>
              <p className="text-sm text-gray-600">Include neighborhood, landmarks, or cross streets in your location</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Act Quickly</h3>
              <p className="text-sm text-gray-600">Report as soon as possible - time is critical for reunions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
