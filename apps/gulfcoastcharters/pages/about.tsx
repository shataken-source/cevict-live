/**
 * About Page
 * 
 * Route: /about
 * Displays information about Gulf Coast Charters
 */

import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { 
  Anchor, Users, Award, MapPin, Phone, Mail, 
  Calendar, Fish, Waves, Shield 
} from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <Layout session={null}>
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">About Gulf Coast Charters</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your trusted partner for unforgettable fishing adventures along the beautiful Gulf Coast
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              At Gulf Coast Charters, we're dedicated to providing exceptional fishing experiences 
              that connect you with the natural beauty of the Gulf Coast. Whether you're a seasoned 
              angler or a first-time visitor, we're committed to making your charter fishing adventure 
              safe, enjoyable, and memorable.
            </p>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fish className="w-6 h-6 text-blue-600" />
                Expert Captains
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our certified captains have years of experience navigating Gulf Coast waters and 
                know the best fishing spots for every season.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Anchor className="w-6 h-6 text-blue-600" />
                Quality Vessels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                We maintain a fleet of well-equipped, safe vessels designed for comfort and 
                optimal fishing conditions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Safety First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Your safety is our top priority. All our vessels meet or exceed Coast Guard 
                safety standards and are regularly inspected.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Story Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Our Story</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Founded by passionate anglers who grew up on the Gulf Coast, Gulf Coast Charters 
                began with a simple vision: to share the incredible fishing opportunities our 
                region has to offer.
              </p>
              <p className="text-gray-700">
                What started as a small operation has grown into a trusted network of experienced 
                captains and quality vessels, all united by our commitment to excellence and 
                customer satisfaction.
              </p>
              <p className="text-gray-700">
                Today, we're proud to connect thousands of anglers with unforgettable fishing 
                experiences each year, from inshore fishing to deep-sea adventures.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Choose Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-yellow-500 mt-1" />
                <div>
                  <h3 className="font-semibold">Award-Winning Service</h3>
                  <p className="text-sm text-gray-600">
                    Recognized for excellence in customer service and safety
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold">Experienced Team</h3>
                  <p className="text-sm text-gray-600">
                    Our captains average 10+ years of Gulf Coast fishing experience
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <h3 className="font-semibold">Flexible Booking</h3>
                  <p className="text-sm text-gray-600">
                    Easy online booking with flexible cancellation policies
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Waves className="w-5 h-5 text-cyan-600 mt-1" />
                <div>
                  <h3 className="font-semibold">Prime Locations</h3>
                  <p className="text-sm text-gray-600">
                    Access to the best fishing spots along the entire Gulf Coast
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact CTA */}
        <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Ready to Book Your Adventure?</h2>
                <p className="text-blue-100">
                  Contact us today or browse our available captains and vessels
                </p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="secondary">
                  <Link href="/contact">
                    Contact Us
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                  <Link href="/captains">
                    Browse Captains
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
