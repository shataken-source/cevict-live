import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Users, CheckCircle, Clock, Mail, Star, Shield, Gift, TrendingUp } from 'lucide-react';
import { ReviewModeration } from './ReviewModeration';
import { supabase } from '@/lib/supabase';
import SMSVerificationModal from './SMSVerificationModal';
import CaptainEarnings from './CaptainEarnings';
import CaptainAvailabilityCalendar from './CaptainAvailabilityCalendar';
import InsuranceVerification from './InsuranceVerification';
import { CertificationManager } from './CertificationManager';
import CaptainAlertPreferences from './CaptainAlertPreferences';
import AlertHistoryPanel from './AlertHistoryPanel';
import CaptainPerformanceTracker from './CaptainPerformanceTracker';
import { FleetManagement } from './FleetManagement';
import { BookingManagementPanel } from './captain/BookingManagementPanel';
import { EarningsChartPanel } from './captain/EarningsChartPanel';
import { CustomerMessagingPanel } from './captain/CustomerMessagingPanel';
import { DocumentUploadPanel } from './captain/DocumentUploadPanel';
import { EnhancedDocumentUpload } from './captain/EnhancedDocumentUpload';
import { CaptainComplianceOverview } from './captain/CaptainComplianceOverview';
import { CaptainExpirationTimeline } from './captain/CaptainExpirationTimeline';
import CustomEmailPurchase from './CustomEmailPurchase';
import CertificationBadges from './CertificationBadges';
import CaptainDocumentPurchase from './captain/CaptainDocumentPurchase';
import TrainingAcademyDashboard from './training/TrainingAcademyDashboard';
import LicenseVerificationPanel from './captain/LicenseVerificationPanel';
import LastMinuteDealsManager from './LastMinuteDealsManager';
import FishyOnboardingBot from './FishyOnboardingBot';
import FishyAIChat from './FishyAIChat';
import CaptainAvailabilityManager from './captain/CaptainAvailabilityManager';

















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

export default function CaptainDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [captainId, setCaptainId] = useState<string | null>(null);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeen CaptainOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    // Get captain ID from auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Get captain profile
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

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenCaptainOnboarding', 'true');
    setShowOnboarding(false);
  };



  // Mock earnings data for charts
  const earningsData = {
    monthlyEarnings: [
      { month: 'Jan', amount: 4500 },
      { month: 'Feb', amount: 5200 },
      { month: 'Mar', amount: 6100 },
      { month: 'Apr', amount: 5800 },
      { month: 'May', amount: 7200 },
      { month: 'Jun', amount: 8500 }
    ],
    bookingRevenue: [
      { charter: 'Deep Sea Fishing', revenue: 2400 },
      { charter: 'Sunset Cruise', revenue: 1800 },
      { charter: 'Island Hopping', revenue: 3200 },
      { charter: 'Snorkeling Trip', revenue: 1500 }
    ],
    totalEarnings: 32500,
    thisMonth: 8500
  };

  useEffect(() => {
    if (captainId) {
      loadBookings();
      loadAnalytics();
      loadDocuments();
    }
  }, [captainId, statusFilter, startDate, endDate]);

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('captain_documents')
        .select('*')
        .eq('captain_id', user.id)
        .order('uploaded_at', { ascending: false });

      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };


  const loadBookings = async () => {
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
      } else {
        console.error('Error loading bookings:', result.error);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
    setLoading(false);
  };

  const loadAnalytics = async () => {
    if (!captainId) return;
    
    try {
      const response = await fetch('/api/captain/analytics');
      const result = await response.json();
      
      if (result.success) {
        // Format analytics to match expected structure
        setAnalytics({
          totalRevenue: result.analytics.totalRevenue,
          totalBookings: result.analytics.totalBookings,
          completedBookings: result.analytics.completedBookings,
          upcomingBookings: result.analytics.upcomingBookings,
        });
      } else {
        console.error('Error loading analytics:', result.error);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const updateStatus = async (bookingId: string, status: string) => {
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
  };

  const saveNotes = async () => {
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
  };

  const sendReminder = async (bookingId: string) => {
    // TODO: Implement reminder sending via email/SMS
    console.log('Send reminder for booking:', bookingId);
    alert('Reminder functionality coming soon!');
    loadBookings();
  };


  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <SEO
        title="Captain Dashboard - Gulf Charter Finder"
        description="Manage your charter bookings, view analytics, and communicate with customers on Gulf Charter Finder."
      />
      <div className="max-w-7xl mx-auto">
        {!captainId && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">Loading captain profile...</p>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Captain Dashboard</h1>
          <CertificationBadges 
            certifications={{
              uscg_license: true,
              insurance: true,
              first_aid: true,
              cpr: true,
              safety_cert: true,
              master_captain: false
            }}
            size="md"
          />
        </div>

        <Card className="p-4 mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <Gift className="text-blue-600 flex-shrink-0" size={24} />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Boost Your Referrals!</h3>
              <p className="text-sm text-gray-700 mb-2">
                Get everyone on your charter to create an account = <span className="font-bold text-blue-600">1 referral point per person!</span>
              </p>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-gray-600">A full 6-person charter = 6 referral points. Points add up fast!</span>
              </div>
            </div>
          </div>
        </Card>


        {analytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Total Revenue</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold truncate">${analytics.totalRevenue}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Total Bookings</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{analytics.totalBookings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Completed</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{analytics.completedBookings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-gray-600 truncate">Upcoming</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{analytics.upcomingBookings}</p>
                </div>
              </div>
            </Card>
          </div>
        )}



        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full grid-cols-7 lg:grid-cols-14">

            <TabsTrigger value="bookings" className="text-xs sm:text-sm">Bookings</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending</TabsTrigger>
            <TabsTrigger value="deals" className="text-xs sm:text-sm">Deals</TabsTrigger>
            <TabsTrigger value="availability" className="text-xs sm:text-sm">Availability</TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs sm:text-sm">Earnings</TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm">Messages</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
            <TabsTrigger value="licenses" className="text-xs sm:text-sm">Licenses</TabsTrigger>
            <TabsTrigger value="fleet" className="text-xs sm:text-sm">Fleet</TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">Calendar</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm">Stats</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm">Reviews</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm">Alerts</TabsTrigger>
            <TabsTrigger value="training" className="text-xs sm:text-sm">Training</TabsTrigger>
          </TabsList>












          
          <TabsContent value="bookings" className="space-y-3 sm:space-y-4">
            <Card className="p-3 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                  className="text-sm"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                  className="text-sm"
                />
                <Button onClick={loadBookings} className="text-sm">Apply Filters</Button>
              </div>
            </Card>


            <div className="space-y-3 sm:space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id} className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold truncate">{booking.charterName}</h3>
                        <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div className="min-w-0">
                          <p className="text-gray-600 font-medium mb-1">Customer</p>
                          <p className="font-semibold truncate">{booking.customerName}</p>
                          <p className="text-gray-500 truncate">{booking.customerEmail}</p>
                          <p className="text-gray-500 truncate">{booking.customerPhone}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-600 font-medium mb-1">Booking Details</p>
                          <p className="font-semibold break-words">{booking.bookingDate} at {booking.bookingTime}</p>
                          <p className="text-gray-500">{booking.guests} guests</p>
                          <p className="font-bold text-green-600 text-sm sm:text-base">${booking.totalPrice}</p>
                        </div>
                      </div>
                      {booking.notes && (
                        <div className="mt-3 p-2 sm:p-3 bg-gray-50 rounded">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">Notes:</p>
                          <p className="text-xs sm:text-sm break-words">{booking.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row lg:flex-col gap-2 flex-wrap lg:flex-nowrap">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedBooking(booking); setNotes(booking.notes); }} className="text-xs flex-1 lg:flex-none whitespace-nowrap">
                        Add Notes
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => sendReminder(booking.id)} disabled={booking.reminderSent} className="text-xs flex-1 lg:flex-none">
                        <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        <span className="truncate">{booking.reminderSent ? 'Sent' : 'Reminder'}</span>
                      </Button>
                      {booking.status === 'confirmed' && (
                        <Button size="sm" onClick={() => updateStatus(booking.id, 'completed')} className="text-xs flex-1 lg:flex-none whitespace-nowrap">Complete</Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>


          </TabsContent>

          <TabsContent value="pending">
            <BookingManagementPanel bookings={bookings} onUpdate={loadBookings} />
          </TabsContent>


          <TabsContent value="deals">
            <LastMinuteDealsManager captainId={captainId} />
          </TabsContent>


          <TabsContent value="availability">
            <CaptainAvailabilityManager captainId={captainId} />
          </TabsContent>

          <TabsContent value="earnings">
            <EarningsChartPanel data={earningsData} />
          </TabsContent>



          <TabsContent value="messages">
            <CustomerMessagingPanel captainId={captainId} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <CaptainDocumentPurchase />
            
            <CustomEmailPurchase 
              userId={captainId}
              userType="captain"
              currentPoints={0}
              onPurchaseSuccess={loadDocuments}
            />

            
            <CaptainComplianceOverview 
              captainId={captainId} 
              onUploadClick={(docType) => {
                setSelectedDocType(docType);
                // Scroll to upload section
                setTimeout(() => {
                  const uploadSection = document.getElementById('document-upload-section');
                  uploadSection?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CaptainExpirationTimeline documents={documents} />
            </div>

            <div id="document-upload-section">
              <h2 className="text-2xl font-bold mb-4">Upload Documents</h2>
              <EnhancedDocumentUpload captainId={captainId} />
            </div>
          </TabsContent>




          <TabsContent value="fleet">
            <FleetManagement />
          </TabsContent>


          <TabsContent value="calendar">
            <CaptainAvailabilityCalendar captainId={captainId} />
          </TabsContent>

          <TabsContent value="performance">
            <CaptainPerformanceTracker />
          </TabsContent>
          
          <TabsContent value="reviews">
            {captainId ? (
              <ReviewModeration captainId={captainId} />
            ) : (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Loading captain profile...</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <CaptainAlertPreferences />
            <AlertHistoryPanel />
          </TabsContent>

          <TabsContent value="training">
            <TrainingAcademyDashboard captainId={captainId} />
          </TabsContent>




        </Tabs>

        {showOnboarding && (
          <FishyOnboardingBot userType="captain" onComplete={handleOnboardingComplete} />
        )}

        <FishyAIChat userType="captain" context={{ page: 'captain-dashboard' }} />

      </div>

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter notes about this charter..."
            rows={5}
          />
          <Button onClick={saveNotes}>Save Notes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
