import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AffiliatePayoutManager from '@/components/admin/AffiliatePayoutManager';
import FraudDetectionDashboard from '@/components/admin/FraudDetectionDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Target } from 'lucide-react';


export default function AffiliateAnalytics() {
  const stats = {
    totalAffiliates: 247,
    activeAffiliates: 189,
    totalCommissionsPaid: 45678.50,
    avgCommissionPerAffiliate: 184.92
  };

  const monthlyData = [
    { month: 'Jan', affiliates: 180, commissions: 32450 },
    { month: 'Feb', affiliates: 195, commissions: 36780 },
    { month: 'Mar', affiliates: 210, commissions: 39650 },
    { month: 'Apr', affiliates: 228, commissions: 42340 },
    { month: 'May', affiliates: 247, commissions: 45678 }
  ];

  const tierDistribution = [
    { tier: 'Bronze', count: 98, percentage: 40 },
    { tier: 'Silver', count: 74, percentage: 30 },
    { tier: 'Gold', count: 52, percentage: 21 },
    { tier: 'Platinum', count: 23, percentage: 9 }
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold">Affiliate Program Analytics</h1>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />Total Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAffiliates}</div>
            <p className="text-xs text-gray-500">{stats.activeAffiliates} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCommissionsPaid.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />Avg Per Affiliate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgCommissionPerAffiliate}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />Growth Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+8.3%</div>
            <p className="text-xs text-gray-500">vs last month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
        </TabsList>


        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Growth Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="affiliates" stroke="#3b82f6" name="Affiliates" />
                  <Line yAxisId="right" type="monotone" dataKey="commissions" stroke="#10b981" name="Commissions ($)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tier Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tierDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Affiliates" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <AffiliatePayoutManager />
        </TabsContent>

        <TabsContent value="fraud">
          <FraudDetectionDashboard />
        </TabsContent>

      </Tabs>
    </div>
  );
}
