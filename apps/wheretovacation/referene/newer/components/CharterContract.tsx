'use client';

import React, { useState } from 'react';
import { Download, FileText, Shield, AlertTriangle } from 'lucide-react';

interface ContractTemplate {
  id: string;
  title: string;
  description: string;
  category: 'liability' | 'booking' | 'cancellation' | 'safety';
  downloadUrl: string;
  previewUrl: string;
  required: boolean;
}

const contractTemplates: ContractTemplate[] = [
  {
    id: 'liability-waiver',
    title: 'Release of Liability Waiver',
    description: 'Comprehensive liability waiver protecting the charter company from claims related to inherent risks of fishing and water activities.',
    category: 'liability',
    downloadUrl: '/contracts/liability-waiver.pdf',
    previewUrl: '/contracts/liability-waiver-preview.pdf',
    required: true
  },
  {
    id: 'booking-agreement',
    title: 'Charter Booking Agreement',
    description: 'Terms and conditions for charter bookings including payment schedules, cancellation policies, and service expectations.',
    category: 'booking',
    downloadUrl: '/contracts/booking-agreement.pdf',
    previewUrl: '/contracts/booking-agreement-preview.pdf',
    required: true
  },
  {
    id: 'cancellation-policy',
    title: 'Cancellation & Refund Policy',
    description: 'Detailed cancellation terms, refund schedules, and weather-related cancellation procedures.',
    category: 'cancellation',
    downloadUrl: '/contracts/cancellation-policy.pdf',
    previewUrl: '/contracts/cancellation-policy-preview.pdf',
    required: true
  },
  {
    id: 'safety-guidelines',
    title: 'Safety Guidelines Acknowledgment',
    description: 'Safety procedures, emergency protocols, and guest responsibilities during charter activities.',
    category: 'safety',
    downloadUrl: '/contracts/safety-guidelines.pdf',
    previewUrl: '/contracts/safety-guidelines-preview.pdf',
    required: true
  },
  {
    id: 'minor-consent',
    title: 'Minor Participation Consent',
    description: 'Parental consent form for participants under 18 years of age.',
    category: 'liability',
    downloadUrl: '/contracts/minor-consent.pdf',
    previewUrl: '/contracts/minor-consent-preview.pdf',
    required: false
  },
  {
    id: 'group-charter',
    title: 'Group Charter Agreement',
    description: 'Special terms for large group charters and corporate events.',
    category: 'booking',
    downloadUrl: '/contracts/group-charter.pdf',
    previewUrl: '/contracts/group-charter-preview.pdf',
    required: false
  }
];

const categoryColors = {
  liability: 'bg-red-50 text-red-700 border-red-200',
  booking: 'bg-blue-50 text-blue-700 border-blue-200',
  cancellation: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  safety: 'bg-green-50 text-green-700 border-green-200'
};

export default function CharterContract() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPreview, setShowPreview] = useState<string | null>(null);

  const filteredContracts = selectedCategory === 'all' 
    ? contractTemplates 
    : contractTemplates.filter(contract => contract.category === selectedCategory);

  const handleDownload = (contract: ContractTemplate) => {
    // In a real implementation, this would trigger a file download
    console.log(`Downloading ${contract.title}`);
    // window.open(contract.downloadUrl, '_blank');
  };

  const handlePreview = (contract: ContractTemplate) => {
    setShowPreview(contract.id);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl p-8 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <FileText className="w-12 h-12" />
          <Shield className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Charter Contract Templates</h1>
        <p className="text-blue-100 max-w-3xl">
          Professionally drafted legal templates designed to protect your charter business and ensure compliance with Alabama state regulations. 
          All templates have been reviewed for Gulf Coast charter operations.
        </p>
        <div className="mt-6 p-4 bg-white/20 backdrop-blur rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Important:</span>
          </div>
          <p className="text-sm mt-1">
            These templates should be reviewed by a qualified attorney (recommended: Butler Snow or Lightfoot, Franklin & White) 
            before use to ensure compliance with current Alabama laws.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Templates
          </button>
          <button
            onClick={() => setSelectedCategory('liability')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'liability'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Liability
          </button>
          <button
            onClick={() => setSelectedCategory('booking')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'booking'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Booking
          </button>
          <button
            onClick={() => setSelectedCategory('cancellation')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'cancellation'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancellation
          </button>
          <button
            onClick={() => setSelectedCategory('safety')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === 'safety'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Safety
          </button>
        </div>
      </div>

      {/* Contract Templates Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {filteredContracts.map((contract) => (
          <div key={contract.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{contract.title}</h3>
                    {contract.required && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${categoryColors[contract.category]}`}>
                    {contract.category.charAt(0).toUpperCase() + contract.category.slice(1)}
                  </span>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              
              <p className="text-gray-600 mb-6">{contract.description}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(contract)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={() => handlePreview(contract)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Preview
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legal Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 mb-8">
        <h2 className="text-2xl font-bold text-yellow-800 mb-4">Legal Compliance Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">Alabama Requirements</h3>
            <ul className="space-y-2 text-yellow-700">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
                <span>USCG License verification for all captains</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
                <span>Commercial fishing license compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
                <span>Vessel safety equipment requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
                <span>Insurance coverage minimums</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">Recommended Legal Counsel</h3>
            <div className="space-y-3 text-yellow-700">
              <div>
                <strong>Butler Snow</strong>
                <p className="text-sm">Maritime & Transportation Practice</p>
                <p className="text-sm">Birmingham & Mobile, AL</p>
              </div>
              <div>
                <strong>Lightfoot, Franklin & White</strong>
                <p className="text-sm">Admiralty & Maritime Law</p>
                <p className="text-sm">Mobile, AL</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">Implementation Guide</h2>
        <div className="space-y-6 text-blue-700">
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 1: Legal Review</h3>
            <p className="mb-2">
              Have all templates reviewed by qualified maritime counsel before implementation. 
              Ensure compliance with current Alabama statutes and federal maritime law.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 2: Digital Integration</h3>
            <p className="mb-2">
              Integrate digital signature collection (SmartWaiver, DocuSign) into your booking process. 
              Ensure electronic signatures are legally binding under Alabama law.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 3: Staff Training</h3>
            <p className="mb-2">
              Train all staff on proper contract presentation, explanation, and collection procedures. 
              Ensure guests understand what they're signing.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 4: Record Keeping</h3>
            <p className="mb-2">
              Maintain secure digital and physical copies of all signed contracts for the legally required retention period (typically 3-7 years).
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Step 5: Regular Updates</h3>
            <p>
              Review and update contracts annually or when laws change. 
              Maintain compliance with evolving legal requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sample contract content for preview
export const sampleLiabilityWaiver = `
RELEASE OF LIABILITY WAIVER

GULF COAST CHARTERS
26389 Canal Rd, Orange Beach, AL 36561
(251) 555-0123

In consideration of being permitted to participate in any way in the charter fishing trip and related activities of Gulf Coast Charters (hereinafter "Activities"), the undersigned, for themselves, their personal representatives, assigns, heirs, and next of kin:

1. ACKNOWLEDGES, fully understands and agrees that participation in the Activities involves inherent risks of physical injury, illness, paralysis, death, and/or property damage, which may be caused by the negligence of the releasor or otherwise;

2. AGREES AND WARRANTS that they are physically fit and have no medical conditions that would prevent their safe participation in the Activities;

3. HEREBY RELEASES, waives, discharges and covenants not to sue Gulf Coast Charters, its owners, officers, employees, agents, and affiliates (hereinafter "Releasees") from any and all liability, claims, demands, actions, and causes of action whatsoever arising out of or related to any loss, damage, or injury, including death, that may be sustained by the undersigned;

4. INDEMNIFIES AND HOLD HARMLESS the Releasees from any loss, liability, damage, or costs, including court costs and attorney's fees, that they may incur due to participation in the Activities;

5. ASSUMES FULL RESPONSIBILITY for any and all damages, injuries, or losses that may sustain while participating in the Activities;

6. UNDERSTANDS that this Release of Liability Agreement is a contract and that they are giving up substantial legal rights, and sign it freely and voluntarily without any inducement.

This agreement shall be governed by and construed in accordance with the laws of the State of Alabama. Any legal action or proceeding shall be brought exclusively in the state or federal courts located in Baldwin County, Alabama.

I HAVE READ THIS RELEASE OF LIABILITY WAIVER, FULLY UNDERSTAND ITS TERMS, UNDERSTAND THAT I HAVE GIVEN UP SUBSTANTIAL RIGHTS BY SIGNING IT, AND SIGN IT FREELY AND VOLUNTARILY WITHOUT ANY INDUCEMENT.

Participant Name: _________________________ Date: _______________

Signature: _________________________________________

Emergency Contact: _________________________ Phone: _______________

If participant is under 18 years of age:
Parent/Guardian Name: _________________________ Date: _______________

Parent/Guardian Signature: _________________________________________
`;
