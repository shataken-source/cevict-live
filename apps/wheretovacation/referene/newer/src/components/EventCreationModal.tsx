import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface EventCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (event: any) => void;
}

export default function EventCreationModal({ isOpen, onClose, onEventCreated }: EventCreationModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    type: 'charter-meetup',
    description: '',
    date: '',
    time: '',
    location: '',
    maxAttendees: 10,
    price: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEvent = {
      id: `evt${Date.now()}`,
      ...formData,
      organizer: 'Current User',
      organizerId: 'current-user-id',
      attendees: [],
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800',
      price: formData.price ? parseFloat(formData.price) : undefined
    };
    
    onEventCreated(newEvent);
    toast({
      title: "Event Created!",
      description: "Your event has been published to the community"
    });
    onClose();
    setFormData({
      title: '',
      type: 'charter-meetup',
      description: '',
      date: '',
      time: '',
      location: '',
      maxAttendees: 10,
      price: ''
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Community Event</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="type">Event Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="charter-meetup">Charter Meetup</SelectItem>
                <SelectItem value="fishing-tournament">Fishing Tournament</SelectItem>
                <SelectItem value="sailing-club">Sailing Club</SelectItem>
                <SelectItem value="group-booking">Group Booking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxAttendees">Max Attendees</Label>
              <Input
                id="maxAttendees"
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({...formData, maxAttendees: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="price">Price (optional)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="Free"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">Create Event</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
