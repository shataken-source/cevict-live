'use client';

import ReportLostPet from '@/components/petreunion/ReportLostPet';
import { useRouter } from 'next/navigation';

export default function ReportLostPetPage() {
  const router = useRouter();

  const handleComplete = (result: { id: string }) => {
    // Navigate to success page with the pet ID
    router.push(`/petreunion/success?id=${result.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🐕 Report a Lost Pet
          </h1>
          <p className="text-gray-600">
            Help us reunite lost pets with their families. Fill out the form below to create a lost pet report.
          </p>
        </div>
        <ReportLostPet onComplete={handleComplete} />
      </div>
    </div>
  );
}

