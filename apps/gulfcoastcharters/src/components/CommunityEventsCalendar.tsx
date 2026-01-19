import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import EventCard from './EventCard';
import EventDetailsModal from './EventDetailsModal';
import EventCreationModal from './EventCreationModal';
import { mockEvents, CommunityEvent } from '@/data/mockEvents';

export default function CommunityEventsCalendar() {
  const [events, setEvents] = useState<CommunityEvent[]>(mockEvents);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleViewDetails = (event: CommunityEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const handleEventCreated = (newEvent: CommunityEvent) => {
    setEvents([newEvent, ...events]);
  };

  const filteredEvents = activeTab === 'all' 
    ? events 
    : events.filter(e => e.type === activeTab);

  const upcomingEvents = filteredEvents.filter(e => new Date(e.date) >= new Date());
  const pastEvents = filteredEvents.filter(e => new Date(e.date) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-8 h-8" />
            Community Events
          </h2>
          <p className="text-gray-600 mt-1">Join charter meetups, tournaments, and sailing clubs</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="charter-meetup">Meetups</TabsTrigger>
          <TabsTrigger value="fishing-tournament">Tournaments</TabsTrigger>
          <TabsTrigger value="sailing-club">Clubs</TabsTrigger>
          <TabsTrigger value="group-booking">Group Bookings</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Upcoming Events ({upcomingEvents.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map(event => (
                <EventCard key={event.id} event={event} onViewDetails={handleViewDetails} />
              ))}
            </div>
            {upcomingEvents.length === 0 && (
              <p className="text-gray-500 text-center py-8">No upcoming events in this category</p>
            )}
          </div>

          {pastEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Past Events ({pastEvents.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60">
                {pastEvents.map(event => (
                  <EventCard key={event.id} event={event} onViewDetails={handleViewDetails} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EventDetailsModal
        event={selectedEvent}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        currentUserId="current-user-id"
      />

      <EventCreationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
}
