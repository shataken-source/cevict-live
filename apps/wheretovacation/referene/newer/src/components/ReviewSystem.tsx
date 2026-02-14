import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { ReviewCard } from './ReviewCard';
import { supabase } from '@/lib/supabase';

interface ReviewSystemProps {
  charterId: string;
}

export function ReviewSystem({ charterId }: ReviewSystemProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [charterId]);

  const loadReviews = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('review-system', {
      body: { action: 'getByCharter', charterId }
    });

    if (data?.reviews) {
      setReviews(data.reviews);
    }
    setLoading(false);
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      {reviews.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-900">{avgRating.toFixed(1)}</div>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-1">{reviews.length} reviews</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        )}
      </div>
    </div>
  );
}
