"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// Use relative path from src/components
const CaptainProfilePage = dynamic(
  () => import('@/components/CaptainProfilePage'),
  { ssr: false, loading: () => <div className="p-8">Loading captain profile...</div> }
);

export default function CaptainDetailPage() {
  const params = useParams();
  const captainId = params?.id as string;

  if (!captainId) {
    return <div className="p-8">Captain ID not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <CaptainProfilePage captainId={captainId} />
      </div>
    </div>
  );
}

