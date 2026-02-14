import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, DollarSign, MessageSquare, FileText, Navigation, Phone, MessageCircle, Cloud, Wifi, WifiOff, Camera, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import MobileBookingManager from './mobile/MobileBookingManager';
import MobileEarningsTracker from './mobile/MobileEarningsTracker';
import MobilePhotoUpload from './mobile/MobilePhotoUpload';
import QuickActionPanel from './mobile/QuickActionPanel';
import GPSCheckIn from './mobile/GPSCheckIn';
import { OfflineDocumentManager } from './OfflineDocumentManager';
import GPSWaypointManager from './GPSWaypointManager';
import MobileNotificationSettings from './MobileNotificationSettings';
import { EmergencyContacts } from './EmergencyContacts';
import { SuggestionBox } from './SuggestionBox';
import { CaptainWeatherDashboard } from './CaptainWeatherDashboard';


interface Booking {
  id: string;
  customer_name: string;
  charter_name: string;
  date: string;
  time: string;
  status: string;
  price: number;
  location?: { lat: number; lng: number };
}

export default function MobileCaptainDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [totalEarnings, setTotalEarnings] = useState(0);


  useEffect(() => {
    loadBookings();
    syncOfflineActions();
    
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineActions();
      loadBookings();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineActions = async () => {
    if (!navigator.onLine) return;
    
    const queue = JSON.parse(localStorage.getItem('action_queue') || '[]');
    if (queue.length === 0) return;

    for (const action of queue) {
      try {
        await supabase.functions.invoke('booking-manager', {
          body: { action: action.action, bookingId: action.id }
        });
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
    
    localStorage.setItem('action_queue', '[]');
    toast({ title: 'Synced', description: 'Offline actions synced' });
  };

  const loadBookings = async () => {
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase.functions.invoke('captain-bookings', {
          body: { action: 'list' }
        });
        
        if (!error && data?.bookings) {
          setBookings(data.bookings);
          await cacheBookings(data.bookings);
          
          const earnings = data.bookings
            .filter((b: Booking) => b.status === 'completed')
            .reduce((sum: number, b: Booking) => sum + b.price, 0);
          setTotalEarnings(earnings);
        }
      } else {
        const cached = await getCachedBookings();
        setBookings(cached);
      }
    } catch (error) {
      const cached = await getCachedBookings();
      setBookings(cached);
    } finally {
      setLoading(false);
    }
  };

  const cacheBookings = async (bookings: Booking[]) => {
    localStorage.setItem('cached_bookings', JSON.stringify(bookings));
  };

  const getCachedBookings = async (): Promise<Booking[]> => {
    const cached = localStorage.getItem('cached_bookings');
    return cached ? JSON.parse(cached) : [];
  };

  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const upcomingBookings = bookings.filter(b => b.status === 'confirmed');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader isOnline={isOnline} />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-6 sticky top-16 z-10 bg-white">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
          <TabsTrigger value="gps">GPS</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="p-4">
          <Card className="p-4 mb-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-90">Total Earnings</p>
                <p className="text-3xl font-bold">${totalEarnings.toLocaleString()}</p>
              </div>
              <DollarSign className="w-12 h-12 opacity-50" />
            </div>
          </Card>

          <div className="flex gap-2 mb-4 overflow-x-auto">
            <Button 
              size="sm" 
              variant={activeTab === 'bookings' ? 'default' : 'outline'}
              onClick={() => setActiveTab('bookings')}
            >
              Upcoming ({upcomingBookings.length})
            </Button>
            <Button 
              size="sm" 
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              onClick={() => setActiveTab('pending')}
            >
              Pending ({pendingBookings.length})
            </Button>
          </div>

          <div className="space-y-4">
            {activeTab === 'pending' && pendingBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} onUpdate={loadBookings} showActions />
            ))}
            {activeTab === 'bookings' && upcomingBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} onUpdate={loadBookings} showCheckIn />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="weather" className="p-4">
          <CaptainWeatherDashboard />
        </TabsContent>

        <TabsContent value="docs" className="p-4">
          <OfflineDocumentManager />
        </TabsContent>

        <TabsContent value="gps" className="p-4">
          <GPSWaypointManager />
        </TabsContent>

        <TabsContent value="emergency" className="p-4">
          <EmergencyContacts />
        </TabsContent>

        <TabsContent value="feedback" className="p-4">
          <SuggestionBox userType="captain" />
        </TabsContent>
      </Tabs>
      
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );

}

function MobileHeader({ isOnline }: { isOnline: boolean }) {
  return (
    <div className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Captain Dashboard</h1>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <><Wifi className="w-5 h-5" /><span className="text-xs">Online</span></>
          ) : (
            <><WifiOff className="w-5 h-5" /><span className="text-xs">Offline</span></>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileNav({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 shadow-lg">
      <Button 
        variant={activeTab === 'bookings' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => setActiveTab('bookings')}
      >
        <Calendar className="w-5 h-5" />
      </Button>
      <Button 
        variant={activeTab === 'earnings' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => setActiveTab('earnings')}
      >
        <DollarSign className="w-5 h-5" />
      </Button>
      <Button 
        variant={activeTab === 'messages' ? 'default' : 'ghost'} 
        size="sm"
        onClick={() => setActiveTab('messages')}
      >
        <MessageSquare className="w-5 h-5" />
      </Button>
    </div>
  );
}

function BookingCard({ 
  booking, 
  onUpdate, 
  showActions = false,
  showCheckIn = false 
}: { 
  booking: Booking; 
  onUpdate: () => void;
  showActions?: boolean;
  showCheckIn?: boolean;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg">{booking.customer_name}</h3>
          <p className="text-sm text-gray-600">{booking.charter_name}</p>
        </div>
        <Badge className={getStatusColor(booking.status)}>
          {booking.status}
        </Badge>
      </div>
      
      <div className="space-y-1 mb-3">
        <p className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          {booking.date} at {booking.time}
        </p>
        <p className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-400" />
          ${booking.price}
        </p>
      </div>

      {showActions && <QuickActionPanel bookingId={booking.id} onSuccess={onUpdate} />}
      {showCheckIn && <GPSCheckIn bookingId={booking.id} expectedLocation={booking.location} />}
    </Card>
  );
}
