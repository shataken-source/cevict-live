'use client';

import { useState } from 'react';
import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Anchor,
  Sun,
  Droplets,
  Shirt,
  Coffee
} from 'lucide-react';
import Link from 'next/link';

export default function GCCWhatToBringPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="resources" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Anchor className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Fishing Charter: The Ultimate Pro-Pack List</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              To ensure you have the best day on the water, please review our "What to Bring" guide below. 
              We've compiled this list from thousands of successful Gulf Coast fishing trips.
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
                  <strong>Pro Tip:</strong> If you're prone to motion sickness, take a Dramamine the night before AND the morning of the trip for the best results. 
                  The Gulf waters can be unpredictable, and prevention is much better than trying to recover on the water!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Essentials */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">The Essentials</h2>
            <p className="text-xl text-gray-600">These items are absolutely crucial for your comfort and success</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sun className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Polarized Sunglasses</h3>
                  <p className="text-gray-600">
                    Essential for seeing fish through the Gulf glare and protecting your eyes. 
                    The difference between regular and polarized sunglasses is dramatic when spotting fish.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Droplets className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Sun Protection</h3>
                  <p className="text-gray-600">
                    High-SPF sunscreen (non-spray preferred for boat safety), lip balm, and a wide-brimmed hat. 
                    The Gulf sun is intense, even on cloudy days.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shirt className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Light Layers</h3>
                  <p className="text-gray-600">
                    It is often 10–15 degrees cooler on the water. A windbreaker or light hoodie is highly recommended for morning departures.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-8 border border-blue-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Footwear Requirements</h3>
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-gray-700 font-medium">Non-skid, rubber-soled shoes required</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Sneakers are great; please no black-soled boots as they mark the deck
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>White-soled sneakers ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Boat shoes ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Sandals with straps ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span>Black-soled boots ✗</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Food & Drink */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Food & Drink</h2>
            <p className="text-xl text-gray-600">Stay energized and hydrated throughout your trip</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Hydration</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Bring plenty of water and Gatorade. The sun and salt air can dehydrate you faster than expected.
              </p>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Pro Tip:</strong> Freeze one bottle of water overnight - it'll stay cold for hours and you'll have ice-cold water all day.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Snacks/Lunch</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Simple, non-greasy foods (sandwiches, chips, fruit) work best. Avoid heavy meals that might not sit well on the water.
              </p>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  <strong>Recommended:</strong> PB&J, turkey sandwiches, granola bars, bananas, apples, pretzels
                </p>
              </div>
            </div>
          </div>

          {/* Cooler Rule */}
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-orange-800 mb-2">The Cooler Rule</h3>
                <p className="text-orange-700">
                  We provide a cooler for your drinks on the boat. Please bring a separate large cooler to leave in your vehicle for transporting your fresh-caught fillets home!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Provide */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Provide</h2>
            <p className="text-xl text-gray-600">Everything you need for a successful fishing trip</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <CheckCircle className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">All Licenses & Permits</h3>
              <p className="text-gray-600">
                Fishing licenses for all passengers are included - no need to purchase anything beforehand.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <CheckCircle className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Top-Tier Equipment</h3>
              <p className="text-gray-600">
                Professional rods, reels, bait, tackle, and ice for your catch. All equipment is regularly maintained.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <CheckCircle className="w-8 h-8 text-purple-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Fish Cleaning Service</h3>
              <p className="text-gray-600">
                Professional fish cleaning and bagging at the end of the trip. Your catch is ready to cook!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Liability Disclaimer */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-red-800 mb-4">Safety & Liability Disclaimer</h3>
                <div className="space-y-4 text-red-700">
                  <p>
                    <strong>Assumption of Risk:</strong> Fishing charter activities involve inherent risks including, but not limited to, 
                    water-related hazards, equipment operation, and marine wildlife encounters. By participating, you voluntarily 
                    assume all risks associated with these activities.
                  </p>
                  
                  <p>
                    <strong>Health & Fitness:</strong> Participants must be in good physical condition. If you have any medical conditions, 
                    are pregnant, or have recent surgeries, please consult your physician before booking. Inform your captain of any 
                    relevant medical conditions.
                  </p>
                  
                  <p>
                    <strong>Alcohol Policy:</strong> Moderate alcohol consumption is permitted for passengers 21+ after fishing activities. 
                    Intoxicated individuals will not be allowed to participate in fishing activities for safety reasons.
                  </p>
                  
                  <p>
                    <strong>Weather Conditions:</strong> Trips may be modified, rescheduled, or cancelled due to unsafe weather conditions. 
                    The captain's decision regarding weather is final for safety purposes.
                  </p>
                  
                  <p>
                    <strong>Personal Property:</strong> Gulf Coast Charters is not responsible for lost, damaged, or stolen personal items. 
                    Please secure phones, cameras, and other valuables.
                  </p>
                  
                  <p>
                    <strong>Liability Waiver:</strong> All participants must sign a liability waiver before departure. 
                    Parental consent is required for participants under 18.
                  </p>
                </div>
                
                <div className="mt-6 p-4 bg-white rounded-lg border border-red-200">
                  <p className="text-sm text-gray-700">
                    <strong>For questions about safety or liability:</strong> Contact us at (251) 555-0123 or 
                    <a href="mailto:info@gulfcoastcharters.com" className="text-blue-600 hover:underline"> info@gulfcoastcharters.com</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for Your Adventure?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Now that you know what to bring, it's time to book your Gulf Coast fishing experience!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-blue-600 hover:bg-blue-50">
              <Link href="/gcc/booking">
                Book Your Trip
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600">
              <a href="tel:(251) 555-0123">
                <Phone className="w-5 h-5 mr-2" />
                Call Us
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Cross-Promotion Section */}
      <section className="py-16 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Planning Your Full Gulf Coast Vacation?</h2>
              <p className="text-xl text-teal-100">
                You've got the fishing gear covered - let us help with the rest of your trip planning!
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3">Complete Vacation Packing</h3>
                <p className="text-teal-100 mb-4">
                  Don't forget beach essentials, vacation rental supplies, and rainy day backup plans.
                </p>
                <Button asChild className="w-full bg-white text-teal-600 hover:bg-teal-50">
                  <Link href="/vacation-rental-checklist">
                    Get Vacation Checklist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3">Rainy Day Backup Plan</h3>
                <p className="text-teal-100 mb-4">
                  If weather cancels your charter, we've got 50+ indoor activities to save your day.
                </p>
                <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-teal-600">
                  <Link href="/rainy-day-guide">
                    Rainy Day Guide
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3">Local Insider Secrets</h3>
                <p className="text-teal-100 mb-4">
                  Find the best bait shops, boat ramps, and avoid the tourist traps with local knowledge.
                </p>
                <Button asChild variant="outline" className="w-full border-white text-white hover:bg-white hover:text-teal-600">
                  <Link href="/local-guides/orange-beach-bait-ramps">
                    Local Guides
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
