import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Edit, Download } from 'lucide-react';
import BookingModificationModal from './BookingModificationModal';

interface Booking {
  id: string;
  charterName: string;
  captainName: string;
  date: string;
  time: string;
  guests: number;
  amount: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  charterId: string;
  location: string;
}

const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    charterName: 'Deep Sea Adventure',
    captainName: 'John Smith',
    date: '2024-12-15',
    time: '08:00 AM',
    guests: 4,
    amount: 650,
    status: 'upcoming',
    charterId: 'charter-1',
    location: 'Tampa Bay, FL'
  },
  {
    id: '2',
    charterName: 'Sunset Cruise',
    captainName: 'Sarah Johnson',
    date: '2024-11-10',
    time: '06:00 PM',
    guests: 6,
    amount: 450,
    status: 'completed',
    charterId: 'charter-2',
    location: 'Clearwater, FL'
  },
];

export default function CustomerBookingsList() {
  const [bookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showModifyModal, setShowModifyModal] = useState(false);

  const handleModify = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowModifyModal(true);
  };

  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <Card key={booking.id} className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold">{booking.charterName}</h3>
                <Badge variant={booking.status === 'upcoming' ? 'default' : booking.status === 'completed' ? 'secondary' : 'destructive'}>
                  {booking.status}
                </Badge>
              </div>
              <p className="text-gray-600 mb-3">Captain {booking.captainName}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{new Date(booking.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{booking.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{booking.location}</span>
                </div>
              </div>
              <div className="mt-3 text-lg font-semibold text-green-600">
                ${booking.amount}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {booking.status === 'upcoming' && (
                <Button onClick={() => handleModify(booking)} variant="outline" className="w-full md:w-auto">
                  <Edit className="w-4 h-4 mr-2" />
                  Modify Booking
                </Button>
              )}
              <Button variant="outline" className="w-full md:w-auto">
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </Button>
            </div>
          </div>
        </Card>
      ))}

      {selectedBooking && (
        <BookingModificationModal
          isOpen={showModifyModal}
          onClose={() => setShowModifyModal(false)}
          booking={selectedBooking}
        />
      )}
    </div>
  );
}
