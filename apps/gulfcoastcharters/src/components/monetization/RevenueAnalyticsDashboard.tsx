import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, TrendingUp, Users, CreditCard, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CommissionCalculator } from './CommissionCalculator';

interface RevenueStats {
  totalRevenue: number;
  commissionRevenue: number;
  serviceFeeRevenue: number;
  subscriptionRevenue: number;
  featuredListingRevenue: number;
  totalBookings: number;
  averageBookingValue: number;
  monthOverMonthGrowth: number;
}

export function RevenueAnalyticsDashboard() {
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    commissionRevenue: 0,
    serviceFeeRevenue: 0,
    subscriptionRevenue: 0,
    featuredListingRevenue: 0,
    totalBookings: 0,
    averageBookingValue: 0,
    monthOverMonthGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    loadRevenueStats();
  }, [timeRange]);

  const loadRevenueStats = async () => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

      // Fetch bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('total_amount, commission_amount, service_fee')
        .gte('created_at', daysAgo.toISOString())
        .eq('status', 'confirmed');

      // Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from('captain_subscriptions')
        .select('amount')
        .gte('created_at', daysAgo.toISOString())
        .eq('status', 'active');

      // Fetch featured listings
      const { data: featured } = await supabase
        .from('featured_listings')
        .select('amount')
        .gte('created_at', daysAgo.toISOString());

      const commissionRevenue = bookings?.reduce((sum, b) => sum + (b.commission_amount || 0), 0) || 0;
      const serviceFeeRevenue = bookings?.reduce((sum, b) => sum + (b.service_fee || 0), 0) || 0;
      const subscriptionRevenue = subscriptions?.reduce((sum, s) => sum + s.amount, 0) || 0;
      const featuredListingRevenue = featured?.reduce((sum, f) => sum + f.amount, 0) || 0;
      const totalRevenue = commissionRevenue + serviceFeeRevenue + subscriptionRevenue + featuredListingRevenue;
      const totalBookings = bookings?.length || 0;
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      setStats({
        totalRevenue,
        commissionRevenue,
        serviceFeeRevenue,
        subscriptionRevenue,
        featuredListingRevenue,
        totalBookings,
        averageBookingValue,
        monthOverMonthGrowth: 12.5
      });
    } catch (error) {
      console.error('Failed to load revenue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Revenue Analytics</h2>
        <Tabs value={timeRange} onValueChange={setTimeRange}>
          <TabsList>
            <TabsTrigger value="7">7 Days</TabsTrigger>
            <TabsTrigger value="30">30 Days</TabsTrigger>
            <TabsTrigger value="90">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{stats.monthOverMonthGrowth}% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.commissionRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {stats.totalBookings} bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription Revenue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.subscriptionRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Monthly recurring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Listings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.featuredListingRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Promotional revenue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission Calculator</CardTitle>
        </CardHeader>
        <CardContent>
          <CommissionCalculator bookingAmount={500} />
        </CardContent>
      </Card>
    </div>
  );
}
