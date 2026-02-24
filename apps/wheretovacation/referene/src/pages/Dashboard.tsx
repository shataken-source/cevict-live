import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    loadBookings();
    loadProfile();
  }, [user]);

  const loadBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, properties(*)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setBookings(data || []);
  };

  const loadProfile = async () => {
    const { data } = await supabase.from('user_profiles').select('*').eq('id', user?.id).single();
    setProfile(data);
  };

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    if (error) {
      toast({ title: 'Error cancelling booking', variant: 'destructive' });
    } else {
      toast({ title: 'Booking cancelled' });
      loadBookings();
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name || user.email}</p>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {bookings.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No bookings yet</p>
                <Button onClick={() => navigate('/')}>Browse Properties</Button>
              </Card>
            ) : (
              bookings.map((booking) => (
                <Card key={booking.id} className="p-6">
                  <div className="flex gap-6">
                    <img src={booking.properties.images[0]} alt={booking.properties.title} className="w-48 h-32 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{booking.properties.title}</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {booking.properties.location}</div>
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}</div>
                        <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> ${booking.total_price}</div>
                      </div>
                      <div className="mt-4 flex gap-2 items-center">
                        <span className={`px-3 py-1 rounded-full text-sm ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {booking.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm ${booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          Payment: {booking.payment_status || 'pending'}
                        </span>
                        {booking.status !== 'cancelled' && (
                          <Button variant="destructive" size="sm" onClick={() => cancelBooking(booking.id)}>Cancel</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}

          </TabsContent>

          <TabsContent value="profile">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Profile Information</h2>
              <div className="space-y-2">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {profile?.full_name || 'Not set'}</p>
                <p><strong>Phone:</strong> {profile?.phone || 'Not set'}</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
