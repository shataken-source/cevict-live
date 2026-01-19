import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Star, DollarSign, Users, Calendar, Award } from 'lucide-react';

export default function CaptainPerformanceTracker() {
  const metrics = [
    { label: 'Total Trips', value: '127', change: '+12%', icon: Calendar, color: 'text-blue-600' },
    { label: 'Avg Rating', value: '4.9', change: '+0.2', icon: Star, color: 'text-yellow-600' },
    { label: 'Total Revenue', value: '$45,280', change: '+18%', icon: DollarSign, color: 'text-green-600' },
    { label: 'Repeat Customers', value: '68%', change: '+5%', icon: Users, color: 'text-purple-600' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, idx) => (
            <div key={idx} className="text-center p-4 bg-gray-50 rounded-lg">
              <metric.icon className={`w-8 h-8 mx-auto mb-2 ${metric.color}`} />
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
              <div className="text-xs text-green-600 mt-1">{metric.change}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
