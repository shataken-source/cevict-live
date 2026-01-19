import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Calendar, Download, TrendingUp } from 'lucide-react';
import EnhancedBookingCard from '@/components/EnhancedBookingCard';
import BookingFilters from '@/components/BookingFilters';
import FavoriteCaptainsSection from '@/components/FavoriteCaptainsSection';
import TripPhotoGallery from '@/components/TripPhotoGallery';
import ReviewForm from '@/components/ReviewForm';
import BookingModal from '@/components/BookingModal';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';

export default function BookingHistory() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [favoriteCaptains, setFavoriteCaptains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showRebookModal, setShowRebookModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookingHistory();
    fetchFavoriteCaptains();
  }, []);

  const fetchBookingHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('booking-manager', {
        body: { action: 'list', userId: user.id }
      });

      if (error) throw error;

      if (data?.bookings) {
        const formatted = data.bookings.map((b: any) => ({
          id: b.id,
          charterName: b.charter_name,
          captainName: b.captain_name || 'Captain',
          captainId: b.captain_id,
          boatType: b.boat_type,
          date: new Date(b.booking_date).toLocaleDateString(),
          location: b.location,
          price: parseFloat(b.price),
          status: b.status,
          imageUrl: b.image_url || 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763263124588_253a38ca.webp',
          hasReview: b.has_review,
          reviewRating: b.review_rating,
          tripPhotos: b.trip_photos || [],
          pointsEarned: b.points_earned || Math.floor(parseFloat(b.price) * 0.1),
          isFavoriteCaptain: false
        }));
        
        setBookings(formatted);
        setFilteredBookings(formatted);
        
        const total = formatted.reduce((sum: number, b: any) => sum + b.price, 0);
        const points = formatted.reduce((sum: number, b: any) => sum + (b.pointsEarned || 0), 0);
        setTotalSpent(total);
        setTotalPointsEarned(points);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteCaptains = async () => {
    // Mock data - replace with actual API call
    setFavoriteCaptains([
      {
        id: '1',
        name: 'Captain Mike Johnson',
        imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763263124588_253a38ca.webp',
        rating: 4.9,
        totalTrips: 5,
        location: 'Gulf Shores, AL',
        boatTypes: ['Deep Sea', 'Inshore']
      }
    ]);
  };

  const handleFilterChange = (filters: any) => {
    let filtered = [...bookings];

    if (filters.startDate) {
      filtered = filtered.filter(b => new Date(b.date) >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter(b => new Date(b.date) <= filters.endDate);
    }
    if (filters.captain && filters.captain !== 'all') {
      filtered = filtered.filter(b => b.captainId === filters.captain);
    }
    if (filters.location && filters.location !== 'all') {
      filtered = filtered.filter(b => b.location === filters.location);
    }
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(b => b.status === filters.status);
    }

    setFilteredBookings(filtered);
  };

  const handleDownloadReceipt = async (bookingId: string) => {
    toast({
      title: 'Downloading Receipt',
      description: 'Your receipt is being prepared...'
    });
  };

  const handleRebook = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    setSelectedBooking(booking);
    setShowRebookModal(true);
  };

  const handleViewPhotos = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    setSelectedBooking(booking);
    setShowPhotoGallery(true);
  };

  const handleToggleFavorite = async (captainId: string) => {
    toast({
      title: 'Captain Favorited',
      description: 'Added to your favorite captains'
    });
  };

  const captainsList = [...new Set(bookings.map(b => ({ id: b.captainId, name: b.captainName })))];
  const locationsList = [...new Set(bookings.map(b => b.location))];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <SEO title="Booking History - Gulf Charter Finder" description="View your complete booking history" />
      
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Booking History</h1>
          <p className="text-gray-600">Track your trips, reviews, and rewards</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-3xl font-bold">{bookings.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Points Earned</p>
                  <p className="text-3xl font-bold text-purple-600">{totalPointsEarned}</p>
                </div>
                <Award className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-3xl font-bold text-green-600">${totalSpent.toFixed(0)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <FavoriteCaptainsSection 
          captains={favoriteCaptains}
          onBookCaptain={handleRebook}
        />

        <BookingFilters
          onFilterChange={handleFilterChange}
          captains={captainsList}
          locations={locationsList}
        />

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({bookings.filter(b => b.status === 'upcoming').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({bookings.filter(b => b.status === 'completed').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No bookings found</div>
            ) : (
              filteredBookings.map(booking => (
                <EnhancedBookingCard
                  key={booking.id}
                  booking={booking}
                  onLeaveReview={(id) => {
                    setSelectedBooking(booking);
                    setShowReviewModal(true);
                  }}
                  onDownloadReceipt={handleDownloadReceipt}
                  onRebook={handleRebook}
                  onViewPhotos={handleViewPhotos}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {filteredBookings.filter(b => b.status === 'upcoming').map(booking => (
              <EnhancedBookingCard
                key={booking.id}
                booking={booking}
                onLeaveReview={(id) => {
                  setSelectedBooking(booking);
                  setShowReviewModal(true);
                }}
                onDownloadReceipt={handleDownloadReceipt}
                onRebook={handleRebook}
                onViewPhotos={handleViewPhotos}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filteredBookings.filter(b => b.status === 'completed').map(booking => (
              <EnhancedBookingCard
                key={booking.id}
                booking={booking}
                onLeaveReview={(id) => {
                  setSelectedBooking(booking);
                  setShowReviewModal(true);
                }}
                onDownloadReceipt={handleDownloadReceipt}
                onRebook={handleRebook}
                onViewPhotos={handleViewPhotos}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          <ReviewForm 
            charterId={selectedBooking?.id || ''} 
            onSuccess={() => {
              setShowReviewModal(false);
              fetchBookingHistory();
            }} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showPhotoGallery} onOpenChange={setShowPhotoGallery}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Trip Photos</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <TripPhotoGallery 
              bookingId={selectedBooking.id}
              photos={selectedBooking.tripPhotos || []}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showRebookModal} onOpenChange={setShowRebookModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rebook Charter</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <BookingModal
              charter={{
                id: selectedBooking.id,
                name: selectedBooking.charterName,
                location: selectedBooking.location,
                price: selectedBooking.price,
                imageUrl: selectedBooking.imageUrl
              }}
              onClose={() => setShowRebookModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
