"use client";

import dynamic from 'next/dynamic';

// Use relative path from src/components
const CaptainApplicationForm = dynamic(
  () => import('@/components/CaptainApplicationForm'),
  { ssr: false, loading: () => <div className="p-8">Loading application form...</div> }
);

export default function ApplyCaptainPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Become a Captain</h1>
        <p className="text-gray-600 mb-8">Join our network of verified charter captains</p>
        <CaptainApplicationForm />
      </div>
    </div>
  );
}

