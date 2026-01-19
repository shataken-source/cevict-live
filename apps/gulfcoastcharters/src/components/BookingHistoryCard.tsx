import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Download, Star } from 'lucide-react';

interface BookingHistoryCardProps {
  booking: {
    id: string;
    charterName: string;
    boatType: string;
    date: string;
    location: string;
    price: number;
    status: 'upcoming' | 'completed' | 'cancelled';
    imageUrl: string;
    hasReview?: boolean;
  };
  onLeaveReview: (bookingId: string) => void;
  onDownloadReceipt: (bookingId: string) => void;
}

export default function BookingHistoryCard({ booking, onLeaveReview, onDownloadReceipt }: BookingHistoryCardProps) {
  const statusColors = {
    upcoming: 'bg-blue-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500'
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row">
        <img src={booking.imageUrl} alt={booking.charterName} className="w-full md:w-48 h-48 object-cover" />
        <div className="flex-1 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold mb-1">{booking.charterName}</h3>
              <p className="text-gray-600">{booking.boatType}</p>
            </div>
            <Badge className={statusColors[booking.status]}>{booking.status}</Badge>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{booking.date}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span>{booking.location}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-blue-600">${booking.price}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onDownloadReceipt(booking.id)}>
                <Download className="w-4 h-4 mr-1" /> Receipt
              </Button>
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
