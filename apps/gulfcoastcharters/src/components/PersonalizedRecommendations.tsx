import { Card } from './ui/card';
import CharterCard from './CharterCard';
import { Sparkles } from 'lucide-react';
import { mockCharters } from '@/data/mockCharters';

export default function PersonalizedRecommendations({ userId }: { userId?: string }) {
  // In real app, fetch based on user viewing history, bookings, preferences
  const recommendedCharters = mockCharters.slice(0, 4);

  if (!userId) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-8 h-8 text-yellow-500" />
        <div>
          <h2 className="text-3xl font-bold">Recommended For You</h2>
          <p className="text-gray-600">Based on your interests and viewing history</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendedCharters.map((charter) => (
          <CharterCard key={charter.id} charter={charter} />
        ))}
      </div>
    </div>
  );
}
