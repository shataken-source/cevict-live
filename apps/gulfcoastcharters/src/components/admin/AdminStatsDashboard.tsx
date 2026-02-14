import { Card } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Anchor, TrendingUp, DollarSign } from 'lucide-react';

const stats = [
  { label: 'New Users', value: '234', change: '+12%', icon: Users, iconClass: 'text-blue-500' },
  { label: 'New Captains', value: '18', change: '+8%', icon: Anchor, iconClass: 'text-green-500' },
  { label: 'Revenue', value: '$12,450', change: '+23%', icon: DollarSign, iconClass: 'text-purple-500' },
  { label: 'Active Ads', value: '67', change: '+5%', icon: TrendingUp, iconClass: 'text-orange-500' }
];

const chartData = [
  { name: 'Mon', users: 45, captains: 3, revenue: 1200 },
  { name: 'Tue', users: 52, captains: 5, revenue: 1800 },
  { name: 'Wed', users: 48, captains: 2, revenue: 1500 },
  { name: 'Thu', users: 61, captains: 4, revenue: 2100 },
  { name: 'Fri', users: 55, captains: 6, revenue: 2400 },
  { name: 'Sat', users: 67, captains: 8, revenue: 3200 },
  { name: 'Sun', users: 58, captains: 4, revenue: 2800 }
];

export default function AdminStatsDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-8 h-8 ${stat.iconClass}`} />
              <span className="text-green-600 text-sm font-semibold">{stat.change}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-4">Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
