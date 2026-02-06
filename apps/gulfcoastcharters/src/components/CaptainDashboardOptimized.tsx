import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Users, CheckCircle, Clock, Mail, Shield, Anchor, Briefcase } from 'lucide-react';
import { ReviewModeration } from './ReviewModeration';
import CustomEmailPurchase from './CustomEmailPurchase';
import { supabase } from '@/lib/supabase';
import CaptainEarnings from './CaptainEarnings';
import CaptainAvailabilityCalendar from './CaptainAvailabilityCalendar';
import InsuranceVerification from './InsuranceVerification';
import { CertificationManager } from './CertificationManager';
import CaptainAlertPreferences from './CaptainAlertPreferences';
import CaptainPerformanceTracker from './CaptainPerformanceTracker';
import { EmptyState } from './ui/empty-state';

interface Booking {
  id: string;
  charterName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  guests: number;
  totalPrice: number;
  status: string;
  notes: string;
  reminderSent: boolean;
}

export default function CaptainDashboardOptimized() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings');

  const [captainId, setCaptainId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get captain ID and auth user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAuthUserId(user.id);
        supabase
          .from('captain_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile) {
              setCaptainId(profile.id);
            }
          });
      }
    });
  }, []);

  const loadBookings = useCallback(async () => {
    if (!captainId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/captain/bookings?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setBookings(result.bookings || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
    setLoading(false);
  }, [captainId, statusFilter, startDate, endDate]);

  const loadAnalytics = useCallback(async () => {
    if (!captainId) return;
    
    try {
      const response = await fetch('/api/captain/analytics');
      const result = await response.json();
      
      if (result.success) {
        setAnalytics({
          totalRevenue: result.analytics.totalRevenue,
          totalBookings: result.analytics.totalBookings,
          completedBookings: result.analytics.completedBookings,
          upcomingBookings: result.analytics.upcomingBookings,
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }, [captainId]);

  useEffect(() => {
    if (captainId) {
      loadBookings();
      loadAnalytics();
    }
  }, [captainId, loadBookings, loadAnalytics]);

  const updateStatus = useCallback(async (bookingId: string, status: string) => {
    try {
      const response = await fetch('/api/captain/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateStatus',
          bookingId,
          data: { status },
        }),
      });
      const result = await response.json();
      if (result.success) {
        loadBookings();
        loadAnalytics();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, [loadBookings, loadAnalytics]);

  const saveNotes = useCallback(async () => {
    if (!selectedBooking) return;
    try {
      const response = await fetch('/api/captain/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addNotes',
          bookingId: selectedBooking.id,
          data: { notes },
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSelectedBooking(null);
        loadBookings();
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  }, [selectedBooking, notes, loadBookings]);

  const sendReminder = useCallback(async (bookingId: string) => {
    await supabase.functions.invoke('captain-bookings', {
      body: { action: 'triggerReminder', bookingId }
    });
    alert('Reminder sent!');
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => bookings, [bookings]);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <SEO title="Captain Dashboard" description="Manage bookings and operations" type="article" />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Captain Dashboard</h1>

        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold">${analytics.totalRevenue}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Bookings</p>
                  <p className="text-2xl font-bold">{analytics.totalBookings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{analytics.completedBookings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold">{analytics.upcomingBookings}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            <Card className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative z-0">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative z-0">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="relative z-0">
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <Button onClick={loadBookings}>Apply Filters</Button>
              </div>
            </Card>

            {loading ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Loading bookings...</p>
              </Card>
            ) : filteredBookings.length === 0 ? (
              <EmptyState
                icon={<Anchor className="w-16 h-16" />}
                title="No Bookings Found"
                description="You don't have any bookings matching the selected filters. Check back soon!"
                actionLabel="Clear Filters"
                onAction={() => {
                  setStatusFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
              />
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-xl font-bold">{booking.charterName}</h3>
                          <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 font-medium">Customer</p>
                            <p className="font-semibold">{booking.customerName}</p>
                            <p className="text-gray-500">{booking.customerEmail}</p>
                            <p className="text-gray-500">{booking.customerPhone}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-medium">Details</p>
                            <p className="font-semibold">{booking.bookingDate} at {booking.bookingTime}</p>
                            <p className="text-gray-500">{booking.guests} guests</p>
                            <p className="font-bold text-green-600">${booking.totalPrice}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedBooking(booking); setNotes(booking.notes); }}>
                          Add Notes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => sendReminder(booking.id)} disabled={booking.reminderSent}>
                          <Mail className="w-4 h-4 mr-1" />
                          {booking.reminderSent ? 'Sent' : 'Remind'}
                        </Button>
                        {booking.status === 'confirmed' && (
                          <Button size="sm" onClick={() => updateStatus(booking.id, 'completed')}>Complete</Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            {captainId ? (
              <>
                <CaptainAvailabilityCalendar captainId={captainId} />
                <CaptainEarnings captainId={captainId} />
              </>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Loading captain profile...</p>
              </Card>
            )}
            <CaptainAlertPreferences />
          </TabsContent>

          <TabsContent value="business" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Business &amp; Email
              </h3>
              {authUserId ? (
                <CustomEmailPurchase
                  userId={authUserId}
                  userType="captain"
                  currentPoints={0}
                  onPurchaseSuccess={() => {}}
                />
              ) : (
                <p className="text-gray-600">Loading...</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            {captainId ? (
              <>
                <CertificationManager captainId={captainId} />
                <InsuranceVerification captainId={captainId} />
              </>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Loading captain profile...</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <CaptainPerformanceTracker />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 mt-4">
            <div className="min-h-[400px]">
              {captainId ? (
                <ReviewModeration captainId={captainId} />
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-gray-600">Loading captain profile...</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
          </DialogHeader>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." rows={5} />
          <Button onClick={saveNotes}>Save Notes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
