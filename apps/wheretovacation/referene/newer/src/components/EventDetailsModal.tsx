import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Users, DollarSign, Bell, Camera, Trophy } from 'lucide-react';
import { CommunityEvent } from '@/data/mockEvents';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { EventPhotoGallery } from './EventPhotoGallery';
import { EventPhotoUpload } from './EventPhotoUpload';
import { EventPhotoModeration } from './EventPhotoModeration';
import PhotoContestManager from './PhotoContestManager';
import PhotoContestLeaderboard from './PhotoContestLeaderboard';


interface EventDetailsModalProps {
  event: CommunityEvent | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function EventDetailsModal({ event, isOpen, onClose, currentUserId }: EventDetailsModalProps) {
  const { toast } = useToast();
  const [isRSVPd, setIsRSVPd] = useState(event?.attendees.includes(currentUserId) || false);
  const [reminderSet, setReminderSet] = useState(false);
  const [refreshGallery, setRefreshGallery] = useState(0);

  const isOrganizer = event?.organizer === 'Current User'; // In production, check actual organizer ID


  if (!event) return null;

  const handleRSVP = () => {
    setIsRSVPd(!isRSVPd);
    toast({
      title: isRSVPd ? "RSVP Cancelled" : "RSVP Confirmed!",
      description: isRSVPd ? "You've cancelled your RSVP" : "You're registered for this event"
    });
  };

  const handleSetReminder = async () => {
    try {
      // Calculate reminder time (24 hours before event)
      const eventDateTime = new Date(`${event.date}T${event.time}`);
      const reminderTime = new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000);

      await supabase.functions.invoke('event-reminders', {
        body: {
          action: 'schedule',
          eventId: event.id,
          userId: currentUserId,
          reminderTime: reminderTime.toISOString(),
          eventDetails: {
            eventTitle: event.title,
            eventDate: new Date(event.date).toLocaleDateString(),
            eventTime: event.time,
            location: event.location,
            userEmail: 'user@example.com', // In production, get from user context
            userName: 'User' // In production, get from user context
          }
        }
      });

      setReminderSet(true);
      toast({
        title: "Reminder Set",
        description: "You'll receive an email 24 hours before the event"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set reminder. Please try again.",
        variant: "destructive"
      });
    }
  };


  const spotsLeft = event.maxAttendees - event.attendees.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="photos">
              <Camera className="w-4 h-4 mr-2" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="contest">
              <Trophy className="w-4 h-4 mr-2" />
              Contest
            </TabsTrigger>
            {isOrganizer && <TabsTrigger value="moderate">Moderate</TabsTrigger>}
          </TabsList>


          <TabsContent value="details" className="space-y-4">
            <img src={event.imageUrl} alt={event.title} className="w-full h-64 object-cover rounded-lg" />
            
            <p className="text-gray-700">{event.description}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold">Date & Time</p>
                  <p className="text-sm">{new Date(event.date).toLocaleDateString()} at {event.time}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-semibold">Location</p>
                  <p className="text-sm">{event.location}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold">Attendees</p>
                  <p className="text-sm">{event.attendees.length}/{event.maxAttendees} • {spotsLeft} spots left</p>
                </div>
              </div>
              
              {event.price && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-semibold">Price</p>
                    <p className="text-sm">${event.price} per person</p>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <p className="text-sm font-semibold mb-1">Organized by</p>
              <p className="text-sm">{event.organizer}</p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                className="flex-1" 
                onClick={handleRSVP}
                variant={isRSVPd ? "outline" : "default"}
              >
                {isRSVPd ? "Cancel RSVP" : "RSVP Now"}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleSetReminder}
                disabled={reminderSet}
              >
                <Bell className="w-4 h-4 mr-2" />
                {reminderSet ? "Reminder Set" : "Set Reminder"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            {isRSVPd && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Upload Photos</h3>
                <EventPhotoUpload
                  eventId={event.id}
                  userId={currentUserId}
                  onUploadComplete={() => setRefreshGallery(prev => prev + 1)}
                />
              </div>
            )}
            
            <div>
              <h3 className="font-semibold mb-3">Event Gallery</h3>
              <EventPhotoGallery 
                key={refreshGallery} 
                eventId={event.id} 
                isOrganizer={isOrganizer}
                currentUserId={currentUserId}
                currentUserName="User"
                eventAttendees={event.attendees.map(id => ({ user_id: id, user_name: `User ${id}` }))}
              />

            </div>
          </TabsContent>

          <TabsContent value="contest" className="space-y-4">
            {isOrganizer && (
              <PhotoContestManager eventId={event.id} isOrganizer={isOrganizer} />
            )}
            <PhotoContestLeaderboard eventId={event.id} />
          </TabsContent>

          {isOrganizer && (
            <TabsContent value="moderate">
              <EventPhotoModeration eventId={event.id} moderatorId={currentUserId} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
