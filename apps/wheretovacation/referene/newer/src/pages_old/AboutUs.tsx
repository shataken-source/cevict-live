import AppLayout from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Anchor, Shield, Users, Award, Heart, TrendingUp } from 'lucide-react';

const stats = [
  { label: 'Verified Captains', value: '500+', icon: Users },
  { label: 'Successful Trips', value: '50,000+', icon: Anchor },
  { label: 'Customer Satisfaction', value: '98%', icon: Heart },
  { label: 'Years in Business', value: '12', icon: Award }
];

const values = [
  {
    icon: Shield,
    title: 'Safety First',
    description: 'Every captain is USCG licensed, insured, and rigorously vetted. We verify credentials, inspect vessels, and ensure all safety equipment meets federal standards.'
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'We built this platform for captains and anglers. Our community shares knowledge, fishing reports, and supports each other on and off the water.'
  },
  {
    icon: Award,
    title: 'Quality Guaranteed',
    description: 'We only work with the best. Captains maintain high ratings through exceptional service, local expertise, and unforgettable fishing experiences.'
  },
  {
    icon: TrendingUp,
    title: 'Fair & Transparent',
    description: 'No hidden fees. Clear pricing. Honest reviews. We believe in transparency for both customers and captains. What you see is what you get.'
  }
];

export default function AboutUs() {
  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6">About Gulf Coast Charters</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Connecting passionate anglers with the Gulf Coast's finest fishing captains since 2013. 
              We are more than a booking platform - we are a community dedicated to unforgettable fishing adventures.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-6xl mx-auto px-4 -mt-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <Card key={idx} className="p-6 text-center shadow-lg">
                <stat.icon className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* Story Section */}
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Story</h2>
          <div className="prose prose-lg max-w-none text-gray-600 space-y-4">
            <p>
              Gulf Coast Charters was founded by Captain Mike Rodriguez, a third-generation fishing guide from Destin, Florida. 
              After 20 years running charters, Mike saw how difficult it was for both captains and customers to connect. 
              Captains relied on word-of-mouth and outdated websites. Customers struggled to find reputable guides and compare options.
            </p>
            <p>
              In 2013, Mike partnered with tech entrepreneur Sarah Chen to build a better solution. They started with 15 captains 
              in the Destin area and a simple booking system. The response was overwhelming. Captains loved the exposure and easy 
              booking management. Customers appreciated verified reviews, transparent pricing, and instant confirmation.
            </p>
            <p>
              Today, Gulf Coast Charters is the largest charter fishing platform in the Gulf of Mexico, spanning from Texas to Florida. 
              We have helped over 50,000 anglers experience world-class fishing with verified, professional captains. Our platform has 
              empowered hundreds of small business owners to grow their charter operations and reach customers they never could before.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">What We Stand For</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value, idx) => (
                <Card key={idx} className="p-6">
                  <value.icon className="w-12 h-12 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Leadership Team</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                MR
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Mike Rodriguez</h3>
              <p className="text-blue-600 font-semibold mb-3">Co-Founder & CEO</p>
              <p className="text-gray-600 text-sm">USCG Master Captain with 30+ years guiding experience</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                SC
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Sarah Chen</h3>
              <p className="text-blue-600 font-semibold mb-3">Co-Founder & CTO</p>
              <p className="text-gray-600 text-sm">Former tech lead at major travel platforms</p>
            </Card>
            <Card className="p-6 text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                JW
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">James Williams</h3>
              <p className="text-blue-600 font-semibold mb-3">VP of Captain Relations</p>
              <p className="text-gray-600 text-sm">20+ years in marine industry and charter operations</p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
            <p className="text-xl text-blue-100 mb-8">Whether you are a captain or an angler, we would love to have you</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/apply-captain" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Become a Captain
              </a>
              <a href="/search" className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors">
                Book a Charter
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
