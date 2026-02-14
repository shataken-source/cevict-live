import Link from 'next/link'
import { Shield, CheckCircle, Clock, Bell, FileText, ArrowRight, Sparkles } from 'lucide-react'

export default function ReunionReadyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>NEW: Be Prepared Before They're Lost</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            🛡️ Reunion Ready
          </h1>
          
          <p className="text-2xl text-gray-700 max-w-3xl mx-auto mb-4">
            Pre-register your pet's information <span className="text-emerald-600 font-semibold">before</span> they go missing
          </p>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            If the worst happens, we'll instantly publish your pre-filled report and start searching — 
            saving precious time when every minute counts.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="#how-it-works"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Back to Home
            </Link>
          </div>

          <p className="text-sm text-emerald-700 font-medium">
            ✨ Free for the first 1,000 registrations • Premium features coming soon
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-emerald-600 mb-2">90%</div>
            <p className="text-gray-700 font-medium">of lost pets are found within 1 mile of home</p>
            <p className="text-sm text-gray-500 mt-2">Acting fast increases reunion chances</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-emerald-600 mb-2">24hrs</div>
            <p className="text-gray-700 font-medium">The critical window for finding lost pets</p>
            <p className="text-sm text-gray-500 mt-2">Pre-registration saves precious time</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-emerald-600 mb-2">5min</div>
            <p className="text-gray-700 font-medium">Time it takes to activate your report</p>
            <p className="text-sm text-gray-500 mt-2">vs. 20+ minutes to fill forms in panic</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Why Pre-Register?</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <Clock className="w-12 h-12 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Activation</h3>
                <p className="text-gray-600">
                  When your pet goes missing, simply click "Activate Report" — no frantic form-filling while panicked. 
                  Your pre-filled profile goes live in seconds.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Bell className="w-12 h-12 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Auto-Notifications</h3>
                <p className="text-gray-600">
                  We'll automatically notify shelters, vets, and community members in your area. 
                  Your network starts searching immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <FileText className="w-12 h-12 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Complete Profile</h3>
                <p className="text-gray-600">
                  Take your time now to add photos, distinctive markings, microchip info, medical needs, 
                  and emergency contacts — everything searchers need to know.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Shield className="w-12 h-12 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Peace of Mind</h3>
                <p className="text-gray-600">
                  Hope you never need it, but know you're prepared. Update your pet's info anytime. 
                  Multiple pets? Register them all.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div id="how-it-works" className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-emerald-600 mb-4">1</div>
              <h3 className="font-semibold text-gray-900 mb-3">Register Now</h3>
              <p className="text-sm text-gray-600">
                Fill out your pet's profile while calm: photos, description, microchip, vet info, emergency contacts.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-emerald-600 mb-4">2</div>
              <h3 className="font-semibold text-gray-900 mb-3">Store Safely</h3>
              <p className="text-sm text-gray-600">
                Your info is stored securely and privately. Update anytime. No one sees it until you activate.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-emerald-600 mb-4">3</div>
              <h3 className="font-semibold text-gray-900 mb-3">Activate Fast</h3>
              <p className="text-sm text-gray-600">
                If your pet goes missing, log in and hit "Activate" — your report goes live instantly.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-emerald-600 mb-4">4</div>
              <h3 className="font-semibold text-gray-900 mb-3">We Search</h3>
              <p className="text-sm text-gray-600">
                Auto-notifications sent, shelters alerted, community mobilized — all while you focus on finding them.
              </p>
            </div>
          </div>
        </div>

        {/* What's Included */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What You Get (Free Beta)</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Pre-filled lost pet report (activate in seconds)',
              'Upload up to 10 photos of your pet',
              'Store microchip, vet, and emergency contact info',
              'One-click activation when they go missing',
              'Auto-notifications to local shelters',
              'Community alert broadcast',
              'Update profile anytime, unlimited edits',
              'Register multiple pets (dogs, cats, etc.)',
              'Secure, private storage (only you see it)',
              'SMS alerts when similar pets are found (coming soon)',
              'Email digest of potential matches (coming soon)',
              'Priority placement in search results (coming soon)',
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-emerald-50 rounded-lg border-2 border-emerald-200">
            <p className="text-center text-emerald-800 font-medium">
              💎 <strong>Premium Features Coming Soon:</strong> AI-powered image matching, 24/7 phone support, 
              custom alert radius, priority community alerts, reunion success stories &amp; more!
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-2xl p-12 text-center text-white mb-16">
          <h2 className="text-4xl font-bold mb-4">Ready to Protect Your Pet?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            It only takes 5 minutes. You'll thank yourself if the worst happens.
          </p>
          
          <div className="bg-yellow-400 text-gray-900 inline-block px-6 py-3 rounded-lg mb-6 font-bold text-lg">
            ⚠️ COMING SOON — Sign up for early access!
          </div>

          <form className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              placeholder="Enter your email for early access"
              className="flex-1 px-6 py-4 rounded-lg text-gray-900 text-lg"
            />
            <button
              type="submit"
              className="bg-white hover:bg-gray-100 text-emerald-600 px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Join Waitlist
            </button>
          </form>

          <p className="text-emerald-100 text-sm mt-6">
            We'll notify you when Reunion Ready launches. No spam, ever.
          </p>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Common Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is my pet's information private?</h3>
              <p className="text-gray-600">
                Yes! Your pre-registered pet profile is completely private until you activate it. 
                Only you can see and edit it. When activated, it becomes a public lost pet report like any other.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How much does it cost?</h3>
              <p className="text-gray-600">
                The first 1,000 pre-registrations are completely free during our beta period. 
                Premium features (AI matching, priority alerts, 24/7 support) will be available later for a small monthly fee.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What if I never need to use it?</h3>
              <p className="text-gray-600">
                That's the best outcome! Think of it like insurance — hope you never need it, 
                but grateful to have it if the worst happens. You can delete your profile anytime.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I register multiple pets?</h3>
              <p className="text-gray-600">
                Absolutely! Register all your furry family members. Each pet gets its own profile that can be activated independently.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How is this different from a regular report?</h3>
              <p className="text-gray-600">
                Time and accuracy. When your pet is missing, you're stressed and rushed. With Reunion Ready, 
                all your info is already entered accurately with good photos — you just hit "Activate" and we handle the rest.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/"
            className="text-emerald-600 hover:text-emerald-700 font-medium text-lg flex items-center justify-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
