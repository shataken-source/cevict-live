// Simple analytics chart using recharts (already in package.json)
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsChartProps {
  type: 'line' | 'bar';
  data: any;
  title: string;
}

export default function AnalyticsChart({ type, data, title }: AnalyticsChartProps) {
  // Transform data for recharts format
  const chartData = data.labels.map((label: string, index: number) => ({
    name: label,
    Impressions: data.datasets[0].data[index],
    Clicks: data.datasets[1].data[index]
  }));

  return (
    <div className="h-[300px]">
      <h4 className="text-lg font-bold mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Impressions" stroke="#3b82f6" />
            <Line type="monotone" dataKey="Clicks" stroke="#22c55e" />
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Impressions" fill="#3b82f6" />
            <Bar dataKey="Clicks" fill="#22c55e" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
