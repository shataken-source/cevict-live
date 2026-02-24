import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { boatRentals } from '@/data/boatRentals';

export default function RentalCalendarView() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedBoat, setSelectedBoat] = useState(boatRentals[0].id);

  const mockBookings = [
    { date: new Date(2024, 10, 20), boatId: 'rental-3', time: '9:00 AM - 5:00 PM' },
    { date: new Date(2024, 10, 22), boatId: 'rental-9', time: '10:00 AM - 2:00 PM' },
  ];

  const getBookingsForDate = (checkDate: Date) => {
    return mockBookings.filter(b => 
      b.date.toDateString() === checkDate.toDateString() && b.boatId === selectedBoat
    );
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Select Boat</h3>
        <div className="space-y-2">
          {boatRentals.map(boat => (
            <button
              key={boat.id}
              onClick={() => setSelectedBoat(boat.id)}
              className={`w-full text-left p-3 rounded-lg transition ${
                selectedBoat === boat.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="font-semibold">{boat.name}</div>
              <div className="text-sm text-gray-600">{boat.type}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Availability Calendar</h3>
        <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
        {date && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Bookings for {date.toLocaleDateString()}</h4>
            {getBookingsForDate(date).length > 0 ? (
              getBookingsForDate(date).map((booking, idx) => (
                <Badge key={idx} variant="destructive" className="mr-2">{booking.time}</Badge>
              ))
            ) : (
              <Badge variant="default">Available All Day</Badge>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
