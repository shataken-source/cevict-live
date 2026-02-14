import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-bold">Guest Reviews</h3>
      {reviews.length === 0 ? (
        <p className="text-muted-foreground">No reviews yet</p>
      ) : (
        reviews.map((review) => (
          <Card key={review.id} className="p-4">
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarFallback>{review.user_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{review.user_name}</h4>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{new Date(review.created_at).toLocaleDateString()}</p>
                <p>{review.comment}</p>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
