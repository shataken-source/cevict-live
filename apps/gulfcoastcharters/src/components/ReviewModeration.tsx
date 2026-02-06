import { useState, useEffect } from 'react';
import { Star, MessageSquare, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

export function ReviewModeration({ captainId }: { captainId: string | null }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    if (captainId) {
      loadReviews();
    }
  }, [captainId]);

  const loadReviews = async () => {
    // Mock reviews for now
    setReviews([
      {
        id: '1',
        customerName: 'John Doe',
        rating: 5,
        reviewText: 'Amazing experience! Highly recommend.',
        status: 'pending',
        createdAt: new Date().toISOString(),
        photos: []
      }
    ]);
  };

  const respondToReview = async () => {
    if (!selectedReview) return;
    
    // TODO: Create API endpoint for responding to reviews
    // For now, just update local state
    setReviews(reviews.map(r => 
      r.id === selectedReview.id 
        ? { ...r, response, respondedAt: new Date().toISOString() }
        : r
    ));
    
    setSelectedReview(null);
    setResponse('');
  };

  const moderateReview = async (reviewId: string, status: string) => {
    // TODO: Create API endpoint for moderating reviews
    // For now, just update local state
    setReviews(reviews.map(r => 
      r.id === reviewId 
        ? { ...r, status }
        : r
    ));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Review Management</h2>
      
      {reviews.map((review) => (
        <Card key={review.id} className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{review.customerName}</h4>
                <Badge variant={review.status === 'approved' ? 'default' : 'secondary'}>
                  {review.status}
                </Badge>
              </div>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-700">{review.reviewText}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedReview(review)}
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Respond
            </Button>
            {review.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moderateReview(review.id, 'approved')}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moderateReview(review.id, 'rejected')}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>

          {selectedReview?.id === review.id && (
            <div className="mt-4 space-y-2">
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Write your response..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={respondToReview}>Submit Response</Button>
                <Button variant="outline" onClick={() => setSelectedReview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
