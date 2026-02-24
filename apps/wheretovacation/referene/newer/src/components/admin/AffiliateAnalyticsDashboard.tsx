import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, DollarSign, MousePointer, ShoppingCart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
  conversionRate: number;
}

export default function AffiliateAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    clicks: 1247,
    conversions: 89,
    revenue: 12450,
    commission: 1867.50,
    conversionRate: 7.14
  });

  const revenueData = [
    { month: 'Jan', revenue: 8500, commission: 1275 },
    { month: 'Feb', revenue: 9200, commission: 1380 },
    { month: 'Mar', revenue: 11000, commission: 1650 },
    { month: 'Apr', revenue: 10500, commission: 1575 },
    { month: 'May', revenue: 12450, commission: 1867.50 }
  ];

  const retailerData = [
    { retailer: 'Amazon', clicks: 687, conversions: 52, commission: 1245.80 },
    { retailer: 'BoatUS', clicks: 342, conversions: 24, commission: 456.20 },
    { retailer: 'Walmart', clicks: 218, conversions: 13, commission: 165.50 }
  ];

  const topProducts = [
    { name: 'Marine GPS Navigator', clicks: 234, conversions: 18, commission: 432.00 },
    { name: 'Life Jackets Set', clicks: 189, conversions: 15, commission: 225.00 },
    { name: 'Boat Cover', clicks: 156, conversions: 12, commission: 288.00 }
  ];

  const exportReport = () => {
    const csv = [
      ['Metric', 'Value'],
      ['Total Clicks', analytics.clicks],
      ['Conversions', analytics.conversions],
      ['Revenue', `$${analytics.revenue}`],
      ['Commission', `$${analytics.commission}`],
      ['', ''],
      ['Retailer', 'Clicks', 'Conversions', 'Commission'],
      ...retailerData.map(r => [r.retailer, r.clicks, r.conversions, `$${r.commission}`])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliate-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Affiliate Analytics</h2>
        <Button onClick={exportReport}><Download className="w-4 h-4 mr-2" />Export Report</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.clicks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversions}</div>
            <p className="text-xs text-muted-foreground">{analytics.conversionRate}% conversion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.revenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.commission.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" />
              <Line type="monotone" dataKey="commission" stroke="#10b981" name="Commission" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Retailer</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={retailerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="retailer" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="clicks" fill="#3b82f6" name="Clicks" />
                <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.clicks} clicks • {product.conversions} conversions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${product.commission}</p>
                    <p className="text-xs text-muted-foreground">commission</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
