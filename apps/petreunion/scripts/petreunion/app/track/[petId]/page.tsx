'use client';

import { useParams } from 'next/navigation';
import PetTracker from '@/components/dashboard/PetTracker';
import { Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TrackPetPage() {
  const params = useParams();
  const petId = params.petId as string;

  if (!petId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Pet ID</h1>
          <p className="text-gray-600 mb-6">
            No pet ID was provided. Please check the link and try again.
          </p>
          <Button asChild>
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <PetTracker petId={petId} />;
}
