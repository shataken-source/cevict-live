/**
 * Booking Details Page
 * 
 * Route: /bookings/[id]
 * Displays detailed information about a specific booking
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Badge } from '../../src/components/ui/badge';
import { Calendar, MapPin, Users, DollarSign, Clock, Mail, Phone, FileText, ArrowLeft } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { toast } from 'sonner';
import BookingStatusTracker from '../../src/components/BookingStatusTracker';
import BookingModificationModal from '../../src/components/BookingModificationModal';

interface Booking {
  id: string;
  charter_name?: string;
  captain_name?: string;
  captain_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  booking_date: string;
  booking_time?: string;
  duration_hours?: number;
  guests: number;
  total_price: number;
  status: string;
  payment_status?: string;
  special_requests?: string;
  departure_location?: string;
  created_at?: string;
  updated_at?: string;
}

export default function BookingDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showModifyModal, setShowModifyModal] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        if (!currentUser) {
          router.push('/admin/login?redirect=/bookings/' + id);
          return;
        }
        
        setUser(currentUser);
      } catch (error: any) {
        console.error('Auth error:', error);
        toast.error('Please log in to view booking details');
        router.push('/admin/login');
      }
    }

    if (id) {
      checkAuth();
    }
  }, [id, router]);

  useEffect(() => {
    if (!id || typeof id !== 'string' || !user) return;

    async function loadBooking() {
      try {
        setLoading(true);
        setError(null);

        // Fetch booking
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', id)
          .single();

        if (bookingError) {
          // Try alternative table structure
          const { data: altData, error: altError } = await supabase
            .from('bookings')
            .select(`
              *,
              captain_profiles (
                id,
                business_name,
                user_id
              ),
              profiles:user_id (
                id,
                email,
                full_name
              )
            `)
            .eq('id', id)
            .single();

          if (altError) {
            throw new Error('Booking not found');
          }

          setBooking({
            ...altData,
            charter_name: altData.charter_name || altData.trip_name || 'Charter Booking',
            captain_name: altData.captain_profiles?.business_name || 'Captain',
            customer_name: altData.profiles?.full_name || altData.customer_name,
            customer_email: altData.profiles?.email || altData.customer_email,
          } as Booking);
        } else {
          setBooking(bookingData);
        }

        // Verify user has access to this booking
        if (bookingData) {
          const isCustomer = bookingData.user_id === user.id || bookingData.customer_email === user.email;
          const isCaptain = bookingData.captain_id === user.id;
          
          if (!isCustomer && !isCaptain) {
            throw new Error('You do not have permission to view this booking');
          }
        }
      } catch (err: any) {
        console.error('Error loading booking:', err);
        setError(err.message || 'Failed to load booking details');
        toast.error(err.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [id, user]);

  const handleModifyBooking = () => {
    setShowModifyModal(true);
  };

  const handleBookingUpdated = () => {
    // Reload booking data
    if (id && typeof id === 'string') {
      router.reload();
    }
  };

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !booking) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The booking you are looking for does not exist or you do not have permission to view it.'}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/bookings')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Bookings
              </Button>
              <Button onClick={() => router.push('/captains')}>
                Browse Captains
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const bookingDate = booking.booking_date ? new Date(booking.booking_date) : null;
  const isUpcoming = bookingDate && bookingDate > new Date();
  const canModify = isUpcoming && booking.status !== 'cancelled' && booking.status !== 'completed';

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <Link href="/bookings">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Booking Details</h1>
            {canModify && (
              <Button onClick={handleModifyBooking} variant="outline">
                Modify Booking
              </Button>
            )}
          </div>
        </div>

        {/* Booking Status Tracker */}
        <div className="mb-6">
          <BookingStatusTracker 
            status={booking.status as any} 
            bookingDate={booking.booking_date} 
          />
        </div>

        <div className="grid gap-6">
          {/* Main Booking Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{booking.charter_name || 'Charter Booking'}</CardTitle>
                <Badge 
                  variant={
                    booking.status === 'confirmed' ? 'default' :
                    booking.status === 'completed' ? 'default' :
                    booking.status === 'cancelled' ? 'destructive' :
                    'secondary'
                  }
                >
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-semibold">
                      {bookingDate ? bookingDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'Not set'}
                    </p>
                    {booking.booking_time && (
                      <p className="text-sm text-gray-600 mt-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {booking.booking_time}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Guests</p>
                    <p className="font-semibold">{booking.guests || 'Not specified'}</p>
                  </div>
                </div>

                {booking.departure_location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Departure Location</p>
                      <p className="font-semibold">{booking.departure_location}</p>
                    </div>
                  </div>
                )}

                {booking.duration_hours && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-semibold">{booking.duration_hours} hours</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Price</p>
                    <p className="text-3xl font-bold text-green-600">
                      ${booking.total_price?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  {booking.payment_status && (
                    <Badge variant={booking.payment_status === 'paid' ? 'default' : 'secondary'}>
                      Payment: {booking.payment_status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Captain/Customer Info */}
          <div className="grid md:grid-cols-2 gap-6">
            {booking.captain_name && (
              <Card>
                <CardHeader>
                  <CardTitle>Captain</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold mb-2">{booking.captain_name}</p>
                  {booking.captain_id && (
                    <Link href={`/captains/${booking.captain_id}`}>
                      <Button variant="link" size="sm" className="p-0">
                        View Captain Profile
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {booking.customer_name && (
              <Card>
                <CardHeader>
                  <CardTitle>Customer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold mb-1">{booking.customer_name}</p>
                  {booking.customer_email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Mail className="w-4 h-4" />
                      {booking.customer_email}
                    </div>
                  )}
                  {booking.customer_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      {booking.customer_phone}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <Card>
              <CardHeader>
                <CardTitle>Special Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{booking.special_requests}</p>
              </CardContent>
            </Card>
          )}

          {/* Booking Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Booking ID:</span>
                <span className="font-mono">{booking.id}</span>
              </div>
              {booking.created_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(booking.created_at).toLocaleString()}</span>
                </div>
              )}
              {booking.updated_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span>{new Date(booking.updated_at).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modification Modal */}
        {showModifyModal && booking && (
          <BookingModificationModal
            booking={{
              ...booking,
              charterName: booking.charter_name || 'Charter Booking',
              date: booking.booking_date,
              time: booking.booking_time || '',
              guests: booking.guests || 0,
              amount: booking.total_price || 0,
              charterId: booking.captain_id || booking.id,
            }}
            isOpen={showModifyModal}
            onClose={() => setShowModifyModal(false)}
          />
        )}
      </div>
    </Layout>
  );
}
