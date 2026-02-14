'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReportLostPet from '@/components/petreunion/ReportLostPet';

export default function QuickEntryPage() {
  const router = useRouter();
  const [shelterId, setShelterId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('shelter_id');
    if (!id) {
      router.push('/petreunion/shelter/login');
      return;
    }
    setShelterId(id);
  }, []);

  const handleComplete = (result: { id: string }) => {
    // After submitting, go back to dashboard
    router.push('/petreunion/shelter/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ⚡ Quick Entry - New Pet
          </h1>
          <p className="text-gray-600">
            Enter a new pet that just came into your shelter
          </p>
        </div>
        <ReportLostPet 
          onComplete={handleComplete}
          shelterId={shelterId || undefined}
        />
      </div>
    </div>
  );
}

