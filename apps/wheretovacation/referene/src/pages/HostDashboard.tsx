import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property, Booking } from '@/types';
import { PropertyStats } from '@/components/host/PropertyStats';
import { BookingRequestsList } from '@/components/host/BookingRequestsList';
import { PropertyManagementList } from '@/components/host/PropertyManagementList';
import { AvailabilityCalendar } from '@/components/host/AvailabilityCalendar';
import { PricingRules } from '@/components/host/PricingRules';
import { UnifiedCalendar } from '@/components/host/UnifiedCalendar';
import { CalendarSync } from '@/components/host/CalendarSync';

import { BlockedDate, PricingRule } from '@/types/host';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';


export default function HostDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [stats, setStats] = useState({ earnings: 0, views: 0, bookings: 0, occupancy: 0 });

  useEffect(() => {
    if (user) {
      loadHostData();
    }
  }, [user]);
  const loadHostData = async () => {
    const { data: props } = await supabase.from('properties').select('*').eq('owner_id', user?.id);
    if (props) setProperties(props);

    const { data: bks } = await supabase.from('bookings').select('*, property:properties(*)').in('property_id', props?.map(p => p.id) || []);
    if (bks) setBookings(bks);

    const { data: blocked } = await supabase.from('blocked_dates').select('*').in('property_id', props?.map(p => p.id) || []);
    if (blocked) setBlockedDates(blocked);

    calculateStats(bks || []);
  };

  const handleMoveBooking = async (bookingId: string, newStartDate: Date, newEndDate: Date) => {
    await supabase.from('bookings').update({ 
      check_in: newStartDate.toISOString(), 
      check_out: newEndDate.toISOString() 
    }).eq('id', bookingId);
    toast.success('Booking moved successfully');
    loadHostData();
  };

  const handleBulkBlockDates = async (propertyIds: string[], startDate: Date, endDate: Date) => {
    for (const propertyId of propertyIds) {
      await supabase.from('blocked_dates').insert({
        property_id: propertyId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        reason: 'Bulk blocked by host'
      });
    }
    toast.success(`Blocked dates for ${propertyIds.length} properties`);
    loadHostData();
  };


  const calculateStats = (bookings: Booking[]) => {
    const earnings = bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.total_price, 0);
    setStats({ earnings, views: 1250, bookings: bookings.length, occupancy: 75 });
  };

  const handleApprove = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
    toast.success('Booking approved');
    loadHostData();
  };

  const handleReject = async (bookingId: string) => {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    toast.success('Booking rejected');
    loadHostData();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Host Dashboard</h1>
      <PropertyStats {...stats} totalEarnings={stats.earnings} totalViews={stats.views} totalBookings={stats.bookings} occupancyRate={stats.occupancy} />
      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="unified-calendar">Unified Calendar</TabsTrigger>
          <TabsTrigger value="sync">Calendar Sync</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>


        <TabsContent value="bookings">
          <BookingRequestsList bookings={bookings} onApprove={handleApprove} onReject={handleReject} onMessage={() => {}} />
        </TabsContent>
        <TabsContent value="properties">
          <PropertyManagementList properties={properties} onEdit={() => {}} onViewAnalytics={() => {}} onManageCalendar={() => {}} onManagePricing={() => {}} />
        </TabsContent>
        <TabsContent value="unified-calendar">
          <UnifiedCalendar 
            properties={properties} 
            bookings={bookings} 
            blockedDates={blockedDates}
            onMoveBooking={handleMoveBooking}
            onBlockDates={handleBulkBlockDates}
          />
        </TabsContent>
        <TabsContent value="sync">
          <div className="space-y-6">
            {properties.map((property) => (
              <CalendarSync key={property.id} propertyId={property.id} propertyName={property.title} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <AvailabilityCalendar propertyId={selectedProperty} blockedDates={blockedDates} onBlockDates={() => {}} onUnblockDates={() => {}} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingRules propertyId={selectedProperty} rules={pricingRules} onAddRule={() => {}} onDeleteRule={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
