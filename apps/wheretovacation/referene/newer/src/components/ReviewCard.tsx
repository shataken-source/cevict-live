import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import SocialShare from './SocialShare';


interface Review {
  id: string;
  rating: number;
  customerName: string;
  reviewText: string;
  photos?: string[];
  captainResponse?: string;
  createdAt: string;
  charterName?: string;
  location?: string;
}


interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold">{review.customerName}</h4>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p className="text-gray-700 mb-4">{review.reviewText}</p>

      {review.photos && review.photos.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {review.photos.map((photo, idx) => (
            <img
              key={idx}
              src={photo}
              alt=""
              className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80"
            />
          ))}
        </div>
      )}

      {review.captainResponse && (
        <div className="bg-blue-50 p-4 rounded-lg mt-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Captain's Response</p>
          <p className="text-sm text-blue-800">{review.captainResponse}</p>
        </div>
      )}

      {/* Social Sharing for Reviews */}
      {review.rating >= 4 && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">Share your great experience!</p>
          <SocialShare
            title={`${review.rating} stars for ${review.charterName || 'this charter'}!`}
            description={`"${review.reviewText.substring(0, 100)}..." - Amazing charter experience!`}
            url={window.location.href}
            imageUrl={review.photos?.[0]}
            hashtags={['CharterReview', 'BoatLife', 'OceanAdventure']}
            type="review"
          />
        </div>
      )}

    </Card>
  );
}

export default ReviewCard;

