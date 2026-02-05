import { useState } from 'react';
import { Star, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { awardLoyaltyPoints } from '@/utils/loyaltyRewards';


interface ReviewFormProps {
  bookingId: string;
  charterId: string;
  customerName: string;
  customerEmail: string;
  onSuccess: () => void;
}

export function ReviewForm({ bookingId, charterId, customerName, customerEmail, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const uploadedUrls: string[] = [];

    for (const file of Array.from(e.target.files)) {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('review-photos')
        .upload(fileName, file);

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('review-photos')
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }

    setPhotos([...photos, ...uploadedUrls]);
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setSubmitting(true);
    const { data } = await supabase.functions.invoke('review-system', {
      body: {
        action: 'submit',
        reviewData: { bookingId, charterId, customerName, customerEmail, rating, reviewText, photos }
      }
    });

    if (data?.success) {
      // Award loyalty points for review
      const userId = localStorage.getItem('userId') || customerEmail;
      await awardLoyaltyPoints(userId, 'review', undefined, 'Submitted a review');
      onSuccess();
    }
    setSubmitting(false);

  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoverRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Your Review</label>
        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience..."
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Photos (Optional)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative">
              <img src={photo} alt="" className="w-20 h-20 object-cover rounded" />
              <button
                type="button"
                onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <label className="cursor-pointer">
          <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          <Button type="button" variant="outline" disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </Button>
        </label>
      </div>

      <Button type="submit" disabled={rating === 0 || submitting} className="w-full">
        {submitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}

export default ReviewForm;

