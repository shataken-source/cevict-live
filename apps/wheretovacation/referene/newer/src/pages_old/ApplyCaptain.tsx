import { Shield, DollarSign, Calendar, Users, CheckCircle, FileCheck } from 'lucide-react';
import CaptainApplicationForm from '@/components/CaptainApplicationForm';

export default function ApplyCaptain() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Become a Gulf Coast Captain</h1>
          <p className="text-xl max-w-2xl mx-auto">Join the premier fishing charter platform and connect with thousands of eager anglers across the Gulf Coast</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Partner With Us?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-bold mb-2">Increase Earnings</h3>
              <p className="text-gray-600">Access thousands of customers and fill your calendar year-round</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-bold mb-2">Easy Booking</h3>
              <p className="text-gray-600">Manage your schedule and bookings with our intuitive platform</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-bold mb-2">Build Your Brand</h3>
              <p className="text-gray-600">Showcase your expertise and grow your reputation</p>
            </div>
            <div className="text-center">
              <div className="bg-cyan-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="font-bold mb-2">Verified Status</h3>
              <p className="text-gray-600">Stand out with our official verification badges</p>
            </div>
          </div>
        </div>

        {/* Requirements Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold mb-6">Requirements</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold">Valid USCG Captain's License</h3>
                <p className="text-gray-600">Current OUPV (6-pack) or Master Captain license required</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold">Vessel Insurance</h3>
                <p className="text-gray-600">Proof of current liability and vessel insurance coverage</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold">Safety Equipment</h3>
                <p className="text-gray-600">USCG-compliant safety equipment and current vessel inspections</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold">Professional Experience</h3>
                <p className="text-gray-600">Minimum 2 years of charter fishing experience recommended</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Process */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Verification Process</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h3 className="font-bold mb-2">Submit Application</h3>
              <p className="text-gray-600 text-sm">Complete the form and upload required documents</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h3 className="font-bold mb-2">Document Review</h3>
              <p className="text-gray-600 text-sm">Our team verifies your credentials (2-3 business days)</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h3 className="font-bold mb-2">Profile Setup</h3>
              <p className="text-gray-600 text-sm">Create your captain profile and list your charters</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
              <h3 className="font-bold mb-2">Start Earning</h3>
              <p className="text-gray-600 text-sm">Go live and start receiving bookings!</p>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Captain Application</h2>
          <CaptainApplicationForm />
        </div>
      </div>
    </div>
  );
}
