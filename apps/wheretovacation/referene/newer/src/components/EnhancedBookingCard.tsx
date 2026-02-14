import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Download, Star, Heart, RotateCcw, Camera, Award } from 'lucide-react';
import { useState } from 'react';

interface EnhancedBookingCardProps {
  booking: {
    id: string;
    charterName: string;
    captainName: string;
    captainId: string;
    boatType: string;
    date: string;
    location: string;
    price: number;
    status: 'upcoming' | 'completed' | 'cancelled';
    imageUrl: string;
    hasReview?: boolean;
    reviewRating?: number;
    tripPhotos?: string[];
    pointsEarned?: number;
    isFavoriteCaptain?: boolean;
  };
  onLeaveReview: (bookingId: string) => void;
  onDownloadReceipt: (bookingId: string) => void;
  onRebook: (bookingId: string) => void;
  onViewPhotos: (bookingId: string) => void;
  onToggleFavorite: (captainId: string) => void;
}

export default function EnhancedBookingCard({ 
  booking, 
  onLeaveReview, 
  onDownloadReceipt,
  onRebook,
  onViewPhotos,
  onToggleFavorite
}: EnhancedBookingCardProps) {
  const [isFavorite, setIsFavorite] = useState(booking.isFavoriteCaptain);

  const statusColors = {
    upcoming: 'bg-blue-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500'
  };

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    onToggleFavorite(booking.captainId);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col lg:flex-row">
        <div className="relative lg:w-64">
          <img src={booking.imageUrl} alt={booking.charterName} className="w-full h-64 lg:h-full object-cover" />
          {booking.tripPhotos && booking.tripPhotos.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2"
              onClick={() => onViewPhotos(booking.id)}
            >
              <Camera className="w-4 h-4 mr-1" />
              {booking.tripPhotos.length} Photos
            </Button>
          )}
        </div>
        
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold mb-1">{booking.charterName}</h3>
              <p className="text-gray-600">{booking.boatType}</p>
              <p className="text-sm text-gray-500 mt-1">Captain: {booking.captainName}</p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge className={statusColors[booking.status]}>{booking.status}</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                className="p-1"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{booking.date}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{booking.location}</span>
            </div>
            {booking.hasReview && booking.reviewRating && (
              <div className="flex items-center text-yellow-500">
                <Star className="w-4 h-4 mr-2 fill-current" />
                <span>You rated: {booking.reviewRating}/5</span>
              </div>
            )}
            {booking.pointsEarned && (
              <div className="flex items-center text-purple-600">
                <Award className="w-4 h-4 mr-2" />
                <span>+{booking.pointsEarned} points earned</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">${booking.price}</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onDownloadReceipt(booking.id)}>
                <Download className="w-4 h-4 mr-1" /> Receipt
              </Button>
              {booking.status === 'completed' && (
                <Button variant="outline" size="sm" onClick={() => onRebook(booking.id)}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Rebook
                </Button>
              )}
              {booking.status === 'completed' && !booking.hasReview && (
                <Button size="sm" onClick={() => onLeaveReview(booking.id)}>
                  <Star className="w-4 h-4 mr-1" /> Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
