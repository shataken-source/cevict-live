"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// Use relative path from src/components
const CharterDetails = dynamic(
  () => import('@/components/CharterDetails'),
  { ssr: false, loading: () => <div className="p-8">Loading charter details...</div> }
);

export default function CharterDetailPage() {
  const params = useParams();
  const charterId = params?.id as string;

  if (!charterId) {
    return <div className="p-8">Charter ID not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <CharterDetails charterId={charterId} />
      </div>
    </div>
  );
}

