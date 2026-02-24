import { Button } from '@/components/ui/button';
import { Home, CheckCircle, Coffee, Utensils, Shield, MapPin, Wifi, Battery, Bug, ShoppingCart, Camera } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

export default function VacationRentalChecklistPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Home className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Vacation Rental Checklist: Don't Leave Home Without These</h1>
            <p className="text-xl text-teal-100 mb-8 max-w-3xl mx-auto">
              Most rentals provide the basics, but for a stress-free stay on the Gulf Coast, 
              we recommend packing these often-forgotten items from our local experience.
            </p>
          </div>
        </div>
      </section>

      {/* Local's Tip */}
      <section className="py-8 bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-100 rounded-xl p-6 border border-yellow-300">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-yellow-800 mb-2">Local's Tip from Albertville, AL</h3>
                <p className="text-yellow-700">
                  <strong>Pro Tip:</strong> If visiting the Alabama Gulf, stop at the local seafood markets on your way in—they are often cheaper and fresher than the big grocery stores. 
                  Try the ones in Gulf Shores before you hit the main tourist areas!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kitchen & Dining */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Kitchen & Dining</h2>
            <p className="text-xl text-gray-600">Save money and eat better with these kitchen essentials</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-4">
                <Coffee className="w-8 h-8 text-orange-600" />
                <h3 className="text-xl font-bold text-gray-900">The "First Morning" Kit</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Nothing's worse than waking up vacation morning with no coffee!
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Coffee grounds & filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Salt & pepper shakers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Favorite spices/herbs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Sugar or sweetener</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Utensils className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Storage Solutions</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Rentals rarely provide enough storage for leftovers and beach snacks.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Ziploc bags (various sizes)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Aluminum foil & plastic wrap</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>3-4 Tupperware containers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Reusable grocery bags</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <ShoppingCart className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Condiments</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Rentals rarely stock these for health reasons and cost.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Ketchup & mustard</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Mayonnaise (small jar)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Hot sauce & BBQ sauce</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Cooking spray or oil</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Beach & Outdoor Gear */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Beach & Outdoor Gear</h2>
            <p className="text-xl text-gray-600">Beach day essentials that rentals don't provide</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Sand-Free Setup</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Keep sand out of your rental and save yourself the cleanup hassle.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Beach towels</span>
                    <p className="text-sm text-gray-600">Rental bath towels stay inside!</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Lightweight beach blanket</span>
                    <p className="text-sm text-gray-600">Mesh or sand-free material</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Collapsible beach cooler</span>
                    <p className="text-sm text-gray-600">Perfect for sand transport</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Tech Protection</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Protect your electronics from sand, water, and long beach days.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Waterproof phone pouches</span>
                    <p className="text-sm text-gray-600">Touch-screen compatible</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Portable power bank</span>
                    <p className="text-sm text-gray-600">10,000mAh minimum</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-900">Car charger & extra cables</span>
                    <p className="text-sm text-gray-600">Multiple device types</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bug Prep Section */}
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Bug className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-orange-800 mb-2">Bug Prep</h3>
                <p className="text-orange-700">
                  Even in paradise, the "no-see-ums" come out at dusk. Bring a travel-sized insect repellent 
                  (DEET-free preferred for beach use) and consider after-bite cream for the kids.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The "Peace of Mind" Bag */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The "Peace of Mind" Bag</h2>
            <p className="text-xl text-gray-600">Items that prevent vacation meltdowns</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <Wifi className="w-8 h-8 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Digital Access</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Don't get locked out or stuck without internet access!
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Screenshot check-in instructions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Save door codes offline</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Download offline maps</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Property manager contact info</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <Battery className="w-8 h-8 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Toiletries & Supplies</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Most rentals only provide a "starter supply" - don't get caught short!
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Extra toilet paper (2-3 rolls)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Paper towels</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Dish soap & sponge</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">Laundry detergent pods</span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Kit */}
          <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-red-800 mb-2">Mini Emergency Kit</h3>
                <p className="text-red-700">
                  Small first-aid kit, pain reliever, allergy medicine, and any personal medications. 
                  Know the location of the nearest urgent care and pharmacy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Local Shopping Tips */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Local Shopping Tips</h2>
            <p className="text-xl text-gray-600">Save money and get better quality with these local insights</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Grocery Strategy</h3>
              <p className="text-gray-600 mb-4">
                Shop at Publix or Winn-Dixie instead of tourist-area stores for 30-40% savings.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Stop before reaching the beach</li>
                <li>• Buy fresh seafood locally</li>
                <li>• Stock up on drinks and snacks</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Beach Gear Rentals</h3>
              <p className="text-gray-600 mb-4">
                Rent umbrellas and chairs instead of buying - typically $25-40/day vs $200+ purchase.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Book in advance online</li>
                <li>• Look for package deals</li>
                <li>• Ask about weekly rates</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Local Markets</h3>
              <p className="text-gray-600 mb-4">
                Visit farmers markets for fresh produce and local specialties.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Gulf Shores Farmers Market</li>
                <li>• Orange Beach Craft Fair</li>
                <li>• Local seafood co-ops</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Perfect Vacation?</h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Now that you're packed and prepared, explore our Gulf Coast destination guides and start planning your adventure!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-teal-600 hover:bg-teal-50">
              <Link href="/destination/gulf-coast">
                Explore Gulf Coast
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-teal-600">
              <Link href="/search">
                Find Vacation Rentals
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
