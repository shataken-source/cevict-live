/**
 * Test Page for Tip Payment
 * Navigate to: http://localhost:3000/test-tip
 */

import { useState, useEffect } from 'react';
import PostTripTipping from '@/components/PostTripTipping';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Search, Loader2 } from 'lucide-react';

interface Booking {
  id: string; // Primary key (uuid)
  booking_id?: string; // Display ID if exists, otherwise use id
  total_price?: number;
  status?: string;
  trip_date?: string;
  trip_time?: string;
  captain_id?: string;
  user_id?: string;
  captains?: {
    id: string;
    user_id: string;
    full_name?: string;
    business_name?: string;
  };
}

interface CrewMember {
  id: string;
  name: string;
  type: 'captain' | 'crew';
}

export default function TestTipPage() {
  const [showTipModal, setShowTipModal] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
  
  // Fetch available bookings on mount
  useEffect(() => {
    fetchAvailableBookings();
  }, []);

  const fetchAvailableBookings = async () => {
    setFetching(true);
    try {
      // Fetch recent bookings (limit to 10 most recent)
      // Using correct column names: id (PK), total_price, trip_date, trip_time
      // Note: trip_type column does not exist in bookings table
      const { data, error } = await supabase
        .from('bookings')
        .select('id, total_price, status, trip_date, trip_time, captain_id, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching bookings:', error);
        // Show more detailed error message
        const errorMsg = error.message || 'Unknown error';
        toast.error(`Failed to fetch bookings: ${errorMsg}`);
        
        // If it's an RLS policy error, provide helpful message
        if (error.message?.includes('policy') || error.message?.includes('permission')) {
          console.warn('⚠️ RLS Policy Error - You may need to be authenticated or adjust RLS policies for test mode');
        }
        return;
      }

      // Map id to booking_id for component compatibility
      const mappedData = (data || []).map(booking => ({
        ...booking,
        booking_id: booking.id // Use id as booking_id for compatibility
      }));
      setAvailableBookings(mappedData);
      
      if (!data || data.length === 0) {
        console.info('No bookings found in database');
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      toast.error(`Failed to fetch bookings: ${err.message || 'Unknown error'}`);
    } finally {
      setFetching(false);
    }
  };

  const fetchBookingById = async (id: string) => {
    if (!id.trim()) {
      toast.error('Please enter a booking ID');
      return;
    }

    setLoading(true);
    try {
      // Fetch booking with captain info (left join)
      // Use maybeSingle() to avoid PGRST116 when 0 rows
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          captains!bookings_captain_id_fkey(id, user_id, full_name, business_name)
        `)
        .eq('id', id)
        .maybeSingle();

      if (bookingError) {
        console.error('Booking fetch error:', bookingError);
        console.error('Error details:', JSON.stringify(bookingError, null, 2));
        toast.error(`Failed to load booking: ${bookingError.message || 'Unknown error'}`);
        setBooking(null);
        setCrew([]);
        return;
      }

      if (!bookingData) {
        console.warn('Booking not found - may not exist or RLS blocked');
        toast.error('Booking not found. It may not exist or you may not have permission to view it.');
        setBooking(null);
        setCrew([]);
        return;
      }

      // Map id to booking_id for component compatibility
      const mappedBooking = {
        ...bookingData,
        booking_id: bookingData.id // Use id as booking_id for compatibility
      };
      setBooking(mappedBooking);

      // Fetch crew members for this booking
      // First, get the captain
      // Use full_name or business_name (captains table doesn't have 'name')
      const captainName = bookingData.captains?.full_name || 
                         bookingData.captains?.business_name || 
                         'Captain';
      const captain: CrewMember = {
        id: bookingData.captains?.user_id || bookingData.captain_id,
        name: captainName,
        type: 'captain'
      };

      // Try to fetch crew members (if you have a crew table)
      // For now, just use the captain
      setCrew([captain]);

      toast.success('Booking loaded successfully!');
    } catch (err: any) {
      console.error('Error fetching booking:', err);
      toast.error('Failed to fetch booking');
      setBooking(null);
      setCrew([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingIdSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (bookingId.trim()) {
      fetchBookingById(bookingId);
    }
  };

  const selectBooking = (selectedBooking: Booking) => {
    const idToUse = selectedBooking.booking_id || selectedBooking.id;
    setBookingId(idToUse);
    fetchBookingById(idToUse);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Tip Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Test Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Enter or select a booking ID from your database</li>
                <li>Click "Load Booking" to fetch booking details</li>
                <li>Click "Open Tip Modal" below</li>
                <li>Enter a tip amount (e.g., $10.00)</li>
                <li>Click "Submit Tip"</li>
                <li>You'll be redirected to Stripe Checkout</li>
                <li>Use test card: <strong>4242 4242 4242 4242</strong></li>
                <li>Any future expiry date (e.g., 12/25)</li>
                <li>Any 3-digit CVC (e.g., 123)</li>
                <li>Any ZIP code (e.g., 12345)</li>
                <li>Complete payment</li>
              </ol>
            </div>

            {/* Booking ID Input */}
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID</Label>
              <form onSubmit={handleBookingIdSubmit} className="flex gap-2">
                <Input
                  id="bookingId"
                  value={bookingId}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    console.log('Input changed:', newValue, 'trimmed:', newValue.trim());
                    setBookingId(newValue);
                  }}
                  placeholder="Enter booking_id (UUID or booking ID)"
                  className="flex-1"
                />
                <Button 
                  type="button"
                  disabled={loading || !bookingId.trim()}
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Button clicked, bookingId:', bookingId, 'trimmed:', bookingId.trim());
                    if (bookingId.trim()) {
                      handleBookingIdSubmit();
                    }
                  }}
                  className={!bookingId.trim() ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Load Booking
                    </>
                  )}
                </Button>
              </form>
              {/* Debug info */}
              <p className="text-xs text-gray-500 mt-1">
                Debug: bookingId = "{bookingId}" (length: {bookingId.length}, trimmed: "{bookingId.trim()}")
              </p>
            </div>

            {/* Available Bookings List */}
            <div className="space-y-2">
              <Label>Or Select from Recent Bookings:</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {fetching ? (
                  <div className="text-center py-4 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                    Loading bookings...
                  </div>
                ) : availableBookings.length > 0 ? (
                  availableBookings.map((b) => (
                    <button
                      key={b.booking_id}
                      onClick={() => selectBooking(b)}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm border border-transparent hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-xs">{b.booking_id || b.id}</span>
                        <span className="text-gray-600">
                          ${(b.total_price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {b.status || 'N/A'} • {b.trip_date ? new Date(b.trip_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    <p>No bookings found.</p>
                    <p className="text-xs mt-1">Enter a booking ID manually above.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Details */}
            {booking && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold mb-2 text-green-800">✓ Booking Loaded</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Booking ID:</strong> <code className="bg-white px-1 rounded">{booking.booking_id || booking.id}</code></p>
                  <p><strong>Trip Cost:</strong> ${(booking.total_price || 0).toFixed(2)}</p>
                  <p><strong>Trip Date:</strong> {booking.trip_date ? new Date(booking.trip_date).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Status:</strong> {booking.status || 'N/A'}</p>
                  {crew.length > 0 && (
                    <p><strong>Crew:</strong> {crew.map(c => c.name).join(', ')}</p>
                  )}
                </div>
              </div>
            )}

            {!booking && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">⚠️ No Booking Selected</h3>
                <p className="text-sm">
                  Enter a booking ID above or select one from the list to test the tip payment flow.
                </p>
              </div>
            )}

            <Button 
              onClick={() => {
                if (!booking) {
                  toast.error('Please load a booking first');
                  return;
                }
                setShowTipModal(true);
              }}
              className="w-full"
              size="lg"
              disabled={!booking}
            >
              Open Tip Modal
            </Button>
          </CardContent>
        </Card>

        {/* Debug info */}
        <div className="mt-4 p-2 bg-gray-100 rounded text-sm">
          <p>Debug: showTipModal = {showTipModal ? 'true' : 'false'}</p>
          {booking && <p>Booking ID: {booking.booking_id || booking.id}</p>}
        </div>

        {booking && (
          <PostTripTipping
            open={showTipModal}
            onOpenChange={(newValue) => {
              setShowTipModal(newValue);
            }}
            booking={{
              booking_id: booking.booking_id || booking.id,
              total_price: booking.total_price || 0,
              price: booking.total_price || 0, // For compatibility
              trip_type: undefined, // trip_type column doesn't exist in bookings table
            }}
            crew={crew}
            onSuccess={() => {
              console.log('Tip submitted successfully!');
              setShowTipModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
