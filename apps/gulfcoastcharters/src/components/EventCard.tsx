import { Calendar, MapPin, Users, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommunityEvent } from '@/data/mockEvents';

interface EventCardProps {
  event: CommunityEvent;
  onViewDetails: (event: CommunityEvent) => void;
}

const eventTypeColors = {
  'charter-meetup': 'bg-blue-500',
  'fishing-tournament': 'bg-green-500',
  'sailing-club': 'bg-purple-500',
  'group-booking': 'bg-orange-500'
};

const eventTypeLabels = {
  'charter-meetup': 'Charter Meetup',
  'fishing-tournament': 'Fishing Tournament',
  'sailing-club': 'Sailing Club',
  'group-booking': 'Group Booking'
};

export default function EventCard({ event, onViewDetails }: EventCardProps) {
  const spotsLeft = event.maxAttendees - event.attendees.length;
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onViewDetails(event)}>
      <img src={event.imageUrl} alt={event.title} className="w-full h-48 object-cover" />
      <CardContent className="p-4">
        <Badge className={`${eventTypeColors[event.type]} mb-2`}>
          {eventTypeLabels[event.type]}
        </Badge>
        <h3 className="font-bold text-lg mb-2">{event.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(event.date).toLocaleDateString()} at {event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{event.attendees.length}/{event.maxAttendees} attending • {spotsLeft} spots left</span>
          </div>
          {event.price && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>${event.price} per person</span>
            </div>
          )}
        </div>
        
        <Button className="w-full mt-4" onClick={(e) => { e.stopPropagation(); onViewDetails(event); }}>
          View Details & RSVP
        </Button>
      </CardContent>
    </Card>
  );
}
