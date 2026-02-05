import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { List, Trophy, Calendar as CalendarIcon, Gift, User } from 'lucide-react';
import BookingHistoryCard from './BookingHistoryCard';
import ProfileSettings from './ProfileSettings';
import { LoyaltyRewardsDashboard } from './LoyaltyRewardsDashboard';
import { ReferralDashboard } from './ReferralDashboard';
import CustomEmailPurchase from './CustomEmailPurchase';
import ReviewForm from './ReviewForm';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';

export default function CustomerDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userPoints, setUserPoints] = useState(0);
  const [date, setDate] = useState<Date>();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);


  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserEmail(user.email || '');
      setUserId(user.id);

      // Fetch user points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user.id)
        .single();
      
      if (pointsData) {
        setUserPoints(pointsData.total_points || 0);
      }


      const { data, error } = await supabase.functions.invoke('booking-manager', {
        body: { action: 'list', userId: user.id }
      });

      if (error) throw error;
      
      if (data?.bookings) {
        const formattedBookings = data.bookings.map((b: any) => ({
          id: b.id,
          charterName: b.charter_name,
          boatType: b.boat_type,
          date: new Date(b.booking_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          location: b.location,
          price: parseFloat(b.price),
          status: b.status,
          imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763263124588_253a38ca.webp',
          hasReview: false
        }));
        setBookings(formattedBookings);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bookings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'upcoming') return b.status === 'upcoming';
    if (filter === 'past') return b.status === 'completed';
    return true;
  });


  const handleLeaveReview = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setShowReviewModal(true);
  };

  const handleDownloadReceipt = (bookingId: string) => {
    // Download receipt functionality
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <SEO
        title="My Bookings - Gulf Charter Finder"
        description="View and manage your charter boat bookings, leave reviews, and track your upcoming trips on Gulf Charter Finder."
        type="article"
      />
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">My Dashboard</h1>

        
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings"><List className="w-4 h-4 mr-2" />Bookings</TabsTrigger>
            <TabsTrigger value="rewards"><Trophy className="w-4 h-4 mr-2" />Rewards</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarIcon className="w-4 h-4 mr-2" />Calendar</TabsTrigger>
            <TabsTrigger value="referrals"><Gift className="w-4 h-4 mr-2" />Referrals</TabsTrigger>
            <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="space-y-6">
            <LoyaltyRewardsDashboard userId={userEmail} />
          </TabsContent>




          <TabsContent value="bookings">
            <div className="mb-4 flex gap-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
              <Button variant={filter === 'upcoming' ? 'default' : 'outline'} onClick={() => setFilter('upcoming')}>Upcoming</Button>
              <Button variant={filter === 'past' ? 'default' : 'outline'} onClick={() => setFilter('past')}>Past</Button>
            </div>
            {loading ? (
              <div className="text-center py-8">Loading bookings...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No bookings found</div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map(booking => (
                  <BookingHistoryCard
                    key={booking.id}
                    booking={booking}
                    onLeaveReview={handleLeaveReview}
                    onDownloadReceipt={handleDownloadReceipt}
                  />
                ))}
              </div>
            )}

          </TabsContent>

          <TabsContent value="calendar">
            <div className="bg-white p-6 rounded-lg shadow">
              <CalendarComponent mode="single" selected={date} onSelect={setDate} className="mx-auto" />
            </div>
          </TabsContent>


          <TabsContent value="referrals">
            <ReferralDashboard userEmail={userEmail} />
          </TabsContent>
          <TabsContent value="profile" className="space-y-6">
            <CustomEmailPurchase 
              userId={userId}
              userType="customer"
              currentPoints={userPoints}
              onPurchaseSuccess={fetchBookings}
            />
            <ProfileSettings />
          </TabsContent>

        </Tabs>
      </div>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          <ReviewForm charterId={selectedBookingId || ''} onSuccess={() => setShowReviewModal(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
