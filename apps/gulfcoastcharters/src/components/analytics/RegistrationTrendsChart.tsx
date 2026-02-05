import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RegistrationTrendsChartProps {
  data: Array<{ date: string; registrations: number }>;
}

export default function RegistrationTrendsChart({ data }: RegistrationTrendsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Registration Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="registrations" fill="#3b82f6" name="New Registrations" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}