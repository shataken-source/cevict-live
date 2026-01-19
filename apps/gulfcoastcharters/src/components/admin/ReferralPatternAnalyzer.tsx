import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

export default function ReferralPatternAnalyzer() {
  const [velocityData, setVelocityData] = useState([
    { hour: '00:00', referrals: 2 },
    { hour: '04:00', referrals: 1 },
    { hour: '08:00', referrals: 15 },
    { hour: '12:00', referrals: 8 },
    { hour: '16:00', referrals: 12 },
    { hour: '20:00', referrals: 5 }
  ]);

  const [ipData, setIpData] = useState([
    { ip: '192.168.1.1', count: 1, status: 'normal' },
    { ip: '10.0.0.5', count: 8, status: 'suspicious' },
    { ip: '172.16.0.1', count: 2, status: 'normal' },
    { ip: '192.168.1.100', count: 12, status: 'flagged' }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'flagged': return 'text-red-500';
      case 'suspicious': return 'text-orange-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Referral Velocity Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={velocityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="referrals" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground mt-4">
            Unusual spike detected at 08:00 - 15 referrals in 1 hour (avg: 5/hour)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IP Address Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ipData.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2">
                <span className="font-mono text-sm">{item.ip}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{item.count} referrals</span>
                  <span className={`text-sm font-semibold ${getStatusColor(item.status)}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
