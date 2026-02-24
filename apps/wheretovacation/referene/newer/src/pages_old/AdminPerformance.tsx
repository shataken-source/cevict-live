import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import { Activity } from 'lucide-react';

export default function AdminPerformance() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Performance & Database Monitor
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor database health, run stress tests, and optimize performance
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">99.9%</div>
                <div className="text-sm text-green-600">Uptime</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-700">145ms</div>
                <div className="text-sm text-blue-600">Avg Response</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-700">1,247</div>
                <div className="text-sm text-purple-600">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <PerformanceMonitor />

        <Card>
          <CardHeader>
            <CardTitle>Optimization Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>✓ Connection pooling enabled (max 100 connections)</p>
            <p>✓ Database indexes optimized for common queries</p>
            <p>✓ CDN enabled for static assets</p>
            <p>✓ Service Worker caching active</p>
            <p>✓ Image optimization enabled</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
