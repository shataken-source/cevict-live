import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  captainResponse?: string;
  captainResponseDate?: string;
  helpful: number;
  verified: boolean;
}

export default function EnhancedReviewSystem({ charterId, captainId, isCaptain }: any) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [response, setResponse] = useState('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    loadReviews();
  }, [charterId]);

  const loadReviews = async () => {
    const { data } = await supabase.functions.invoke('review-system', {
      body: { action: 'list', charterId }
    });
    if (data?.reviews) setReviews(data.reviews);
  };

  const handleRespond = async (reviewId: string) => {
    await supabase.functions.invoke('review-system', {
      body: { action: 'respond', reviewId, captainId, response }
    });
    setResponse('');
    setRespondingTo(null);
    loadReviews();
  };

  const handleHelpful = async (reviewId: string) => {
    await supabase.functions.invoke('review-system', {
      body: { action: 'helpful', reviewId }
    });
    loadReviews();
  };

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <Card key={review.id} className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold">{review.userName}</p>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                {review.verified && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>}
              </div>
            </div>
            <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-gray-700 mb-3">{review.comment}</p>
          {review.captainResponse && (
            <div className="bg-blue-50 p-3 rounded mb-2">
              <p className="text-sm font-semibold text-blue-900 mb-1">Captain's Response:</p>
              <p className="text-sm text-blue-800">{review.captainResponse}</p>
              <p className="text-xs text-blue-600 mt-1">{new Date(review.captainResponseDate!).toLocaleDateString()}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleHelpful(review.id)}>
              <ThumbsUp className="w-4 h-4 mr-1" />Helpful ({review.helpful})
            </Button>
            {isCaptain && !review.captainResponse && (
              <Button variant="outline" size="sm" onClick={() => setRespondingTo(review.id)}>
                <MessageSquare className="w-4 h-4 mr-1" />Respond
              </Button>
            )}
          </div>
          {respondingTo === review.id && (
            <div className="mt-3">
              <Textarea placeholder="Write your response..." value={response} onChange={(e) => setResponse(e.target.value)} className="mb-2" />
              <div className="flex gap-2">
                <Button onClick={() => handleRespond(review.id)}>Submit Response</Button>
                <Button variant="outline" onClick={() => setRespondingTo(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
