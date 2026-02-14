import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { supabase } from "@/lib/supabase";
import { DollarSign, TrendingUp, Calendar, Users } from "lucide-react";

export default function AdvancedAnalyticsDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    bookingsThisMonth: 0,
    averageBookingValue: 0,
    activeCustomers: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, payments(*)")
      .gte("created_at", startOfMonth.toISOString());

    if (bookings) {
      const revenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const avgValue = bookings.length > 0 ? revenue / bookings.length : 0;

      setStats({
        totalRevenue: revenue,
        bookingsThisMonth: bookings.length,
        averageBookingValue: avgValue,
        activeCustomers: new Set(bookings.map(b => b.user_id)).size,
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bookingsThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.averageBookingValue.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCustomers}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Revenue analytics and trends will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
