import { Card } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp } from 'lucide-react';

interface EarningsData {
  monthlyEarnings: { month: string; amount: number }[];
  bookingRevenue: { charter: string; revenue: number }[];
  totalEarnings: number;
  thisMonth: number;
}

export function EarningsChartPanel({ data }: { data: EarningsData }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold">${data.totalEarnings}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold">${data.thisMonth}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Monthly Earnings Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.monthlyEarnings}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Revenue by Charter</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.bookingRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="charter" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="revenue" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
