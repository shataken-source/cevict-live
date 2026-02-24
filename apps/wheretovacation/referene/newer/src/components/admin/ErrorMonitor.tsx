import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

const errors = [
  { id: 1, level: 'critical', message: 'Payment gateway timeout', count: 3, time: '5 min ago' },
  { id: 2, level: 'high', message: 'Database connection slow', count: 12, time: '15 min ago' },
  { id: 3, level: 'medium', message: 'Image upload failed', count: 5, time: '1 hour ago' },
  { id: 4, level: 'low', message: 'Cache miss rate high', count: 45, time: '2 hours ago' }
];

export default function ErrorMonitor() {
  const getIcon = (level: string) => {
    if (level === 'critical') return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (level === 'high') return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    return <Info className="w-5 h-5 text-blue-500" />;
  };

  const getBadgeVariant = (level: string) => {
    if (level === 'critical') return 'destructive';
    if (level === 'high') return 'secondary';
    return 'outline';
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4">System Errors</h3>
      <div className="space-y-3">
        {errors.map(error => (
          <div key={error.id} className="flex items-center gap-3 p-3 border rounded-lg">
            {getIcon(error.level)}
            <div className="flex-1">
              <div className="font-semibold">{error.message}</div>
              <div className="text-sm text-gray-600">{error.time}</div>
            </div>
            <div className="text-right">
              <Badge variant={getBadgeVariant(error.level)}>{error.level}</Badge>
              <div className="text-sm text-gray-600 mt-1">{error.count}x</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
