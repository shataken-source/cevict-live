import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActiveUsersChartProps {
  data: Array<{ date: string; daily: number; weekly: number; monthly: number }>;
}

export default function ActiveUsersChart({ data }: ActiveUsersChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Users Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="daily" stroke="#3b82f6" name="Daily Active" />
            <Line type="monotone" dataKey="weekly" stroke="#10b981" name="Weekly Active" />
            <Line type="monotone" dataKey="monthly" stroke="#8b5cf6" name="Monthly Active" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}