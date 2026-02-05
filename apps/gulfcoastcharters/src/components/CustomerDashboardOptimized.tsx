import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, DollarSign, Anchor, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import EnhancedMessenger from './EnhancedMessenger';
import { EmptyState } from './ui/empty-state';
import BookingCardMemo from './optimized/BookingCardMemo';
import SEO from './SEO';
import { toast } from 'sonner';

interface Booking {
  id: string;
  charter_name: string;
  captain_name: string;
  captain_id: string;
  booking_date: string;
  guests: number;
  total_price: number;
  status: string;
}

export default function CustomerDashboardOptimized() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedCaptain, setSelectedCaptain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, upcoming: 0, completed: 0, spent: 0 });

  const userId = 'current-user-id';

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('bookings').select('*')
        .eq('customer_id', userId).order('booking_date', { ascending: false });

      setBookings(data || []);
      
      const total = data?.length || 0;
      const upcoming = data?.filter(b => new Date(b.booking_date) > new Date()).length || 0;
      const completed = data?.filter(b => b.status === 'completed').length || 0;
      const spent = data?.reduce((sum, b) => sum + b.total_price, 0) || 0;
      
      setStats({ total, upcoming, completed, spent });
    } catch (error: any) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (filter === 'upcoming') return new Date(b.booking_date) > new Date();
      if (filter === 'past') return b.status === 'completed';
      return true;
    });
  }, [bookings, filter]);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <SEO title="My Dashboard" description="Manage bookings" type="article" />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">My Dashboard</h1>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div><p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-bold">{stats.total}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Anchor className="w-8 h-8 text-green-600" />
              <div><p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold">{stats.upcoming}</p></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div><p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-bold">${stats.spent}</p></div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="bookings">
          <TabsList><TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger></TabsList>

          <TabsContent value="bookings" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
              <Button variant={filter === 'upcoming' ? 'default' : 'outline'} onClick={() => setFilter('upcoming')}>Upcoming</Button>
              <Button variant={filter === 'past' ? 'default' : 'outline'} onClick={() => setFilter('past')}>Past</Button>
            </div>
            {loading ? <Card className="p-12 text-center"><p>Loading...</p></Card> : 
            filteredBookings.length === 0 ? <EmptyState icon={<Anchor className="w-16 h-16" />}
              title="No Bookings" description="Book your first charter!" /> :
            filteredBookings.map(b => <BookingCardMemo key={b.id} booking={b} 
              onContactCaptain={() => setSelectedCaptain({ id: b.captain_id, name: b.captain_name })} />)}
          </TabsContent>

          <TabsContent value="messages">
            {selectedCaptain ? <EnhancedMessenger currentUserId={userId} 
              recipientId={selectedCaptain.id} recipientName={selectedCaptain.name} /> :
            <EmptyState icon={<MessageSquare className="w-16 h-16" />} 
              title="No Conversation Selected" description="Select a booking to message the captain" />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
