'use client';

import { AlertTriangle, Shield, Info } from '@/components/ui/icons';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-orange-500 to-red-600 p-4 rounded-full mb-4">
            <AlertTriangle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Disclaimer</h1>
          <p className="text-gray-600">Important Information About Using PetReunion</p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6 prose prose-blue max-w-none">
            <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6">
              <h2 className="text-2xl font-bold text-red-900 mb-3">PLEASE READ CAREFULLY</h2>
              <p className="text-red-800 font-semibold">
                PetReunion is a free service provided to help reunite lost pets with their owners. 
                We do not guarantee the accuracy of information provided by users, nor do we guarantee 
                that any pet will be found or reunited.
              </p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">No Guarantee of Results</h3>
            <p className="text-gray-700 mb-4">
              While we strive to provide the best possible service, PetReunion cannot and does not guarantee:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
              <li><strong>Pet Recovery:</strong> We cannot guarantee that any lost pet will be found or reunited with their owner</li>
              <li><strong>Match Accuracy:</strong> Automated matching may produce false positives or miss actual matches</li>
              <li><strong>Information Accuracy:</strong> User-submitted information may be incomplete, outdated, or incorrect</li>
              <li><strong>Service Availability:</strong> The service may experience downtime, errors, or interruptions</li>
              <li><strong>Search Completeness:</strong> We cannot guarantee that all shelters or sources will be searched</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">User Responsibility</h3>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-yellow-900">You Are Responsible For:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm mt-2">
                    <li>Verifying the accuracy of all information before acting on it</li>
                    <li>Conducting your own search efforts beyond using PetReunion</li>
                    <li>Ensuring your safety when meeting others</li>
                    <li>Verifying pet ownership before returning a pet</li>
                    <li>Following all applicable laws and regulations</li>
                  </ul>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">Not Responsible For</h3>
            <p className="text-gray-700 mb-4">
              PetReunion and its operators are NOT responsible for:
            </p>

            <h4 className="text-lg font-semibold text-gray-800 mt-4 mb-2">User-Submitted Content</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>The accuracy, completeness, or truthfulness of user-submitted information</li>
              <li>False, misleading, or fraudulent pet reports</li>
              <li>Inappropriate, offensive, or harmful content posted by users</li>
              <li>Copyright or trademark violations in user-submitted photos</li>
            </ul>

            <h4 className="text-lg font-semibold text-gray-800 mt-4 mb-2">User Interactions</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Communications or interactions between users</li>
              <li>Meetings arranged through the service</li>
              <li>Disputes over pet ownership</li>
              <li>Scams, fraud, or criminal activity by users</li>
              <li>Physical harm or property damage resulting from user interactions</li>
            </ul>

            <h4 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Third-Party Content and Services</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Information scraped from shelters, social media, or other sources</li>
              <li>Accuracy of third-party databases or websites</li>
              <li>Actions or policies of third-party service providers</li>
              <li>Links to external websites or resources</li>
            </ul>

            <h4 className="text-lg font-semibold text-gray-800 mt-4 mb-2">Technical Issues</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Service outages, downtime, or technical failures</li>
              <li>Data loss or corruption</li>
              <li>Security breaches or unauthorized access</li>
              <li>Errors in automated matching or searching</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">Safety Recommendations</h3>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <p className="font-semibold text-blue-900 mb-2">When Meeting Someone to Reunite a Pet:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
                <li>Always meet in a public, well-lit location</li>
                <li>Bring a friend or family member if possible</li>
                <li>Verify pet ownership through photos, vet records, or microchip</li>
                <li>Trust your instincts - if something feels wrong, leave</li>
                <li>Do not share personal information (home address, financial details)</li>
                <li>Consider involving local animal control or police for verification</li>
              </ul>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">Verification of Ownership</h3>
            <p className="text-gray-700 mb-4">
              Before returning a found pet to someone claiming ownership, we strongly recommend:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Requesting multiple photos of the pet from different angles</li>
              <li>Asking for veterinary records or adoption papers</li>
              <li>Checking for a microchip and verifying registration</li>
              <li>Asking specific questions only the true owner would know</li>
              <li>Involving local animal control or a veterinarian for verification</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">Legal Compliance</h3>
            <p className="text-gray-700 mb-4">
              Users are responsible for complying with all applicable local, state, and federal laws, including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-700 mb-4">
              <li>Reporting found pets to local animal control as required by law</li>
              <li>Following proper procedures for claiming lost pets from shelters</li>
              <li>Respecting property rights and trespassing laws when searching</li>
              <li>Adhering to leash laws and animal control regulations</li>
            </ul>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">Medical and Veterinary Advice</h3>
            <p className="text-gray-700 mb-4">
              PetReunion does not provide medical or veterinary advice. If you find an injured or sick pet, 
              please contact a licensed veterinarian or local animal control immediately.
            </p>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">Use at Your Own Risk</h3>
            <div className="bg-gray-100 border-2 border-gray-300 p-6 rounded-lg">
              <p className="text-gray-900 font-semibold text-center text-lg">
                BY USING PETREUNION, YOU ACKNOWLEDGE AND AGREE THAT YOU DO SO AT YOUR OWN RISK. 
                YOU ASSUME FULL RESPONSIBILITY FOR YOUR ACTIONS AND ANY CONSEQUENCES THAT MAY RESULT.
              </p>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mt-8 mb-3">Questions or Concerns?</h3>
            <p className="text-gray-700 mb-2">
              If you have questions about this disclaimer or concerns about the service:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> support@petreunion.com</p>
              <p className="text-gray-700 mt-2"><strong>Response Time:</strong> We aim to respond within 48 hours</p>
            </div>

            <div className="mt-6 text-sm text-gray-600 italic">
              <p>
                This disclaimer is part of our{' '}
                <Link href="/petreunion/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                {' '}and should be read in conjunction with our{' '}
                <Link href="/petreunion/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-x-4">
          <Link href="/petreunion/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/petreunion/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>
          <span className="text-gray-400">|</span>
          <Link href="/petreunion" className="text-blue-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
