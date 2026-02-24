import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RetentionChartProps {
  data: Array<{ cohort: string; week1: number; week2: number; week4: number; week8: number }>;
}

export default function RetentionChart({ data }: RetentionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Retention Rates</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="cohort" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="week1" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Week 1" />
            <Area type="monotone" dataKey="week2" stackId="1" stroke="#10b981" fill="#10b981" name="Week 2" />
            <Area type="monotone" dataKey="week4" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Week 4" />
            <Area type="monotone" dataKey="week8" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="Week 8" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}