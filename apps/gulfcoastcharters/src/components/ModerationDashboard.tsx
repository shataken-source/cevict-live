import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Flag, TrendingUp } from 'lucide-react';

export function ModerationDashboard() {
  const stats = {
    pending: 24,
    approved_today: 156,
    rejected_today: 12,
    flagged: 8,
    avg_quality: 82,
    duplicate_detected: 5
  };

  const recentReports = [
    { id: '1', photo_id: 'P123', reason: 'Inappropriate content', reporter: 'User456', time: '10 mins ago' },
    { id: '2', photo_id: 'P124', reason: 'Spam', reporter: 'User789', time: '25 mins ago' },
    { id: '3', photo_id: 'P125', reason: 'Poor quality', reporter: 'User321', time: '1 hour ago' }
  ];

  const topModerators = [
    { name: 'Admin Sarah', approved: 245, rejected: 18 },
    { name: 'Admin Mike', approved: 198, rejected: 22 },
    { name: 'Admin Lisa', approved: 167, rejected: 15 }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Moderation Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-gray-500">Photos awaiting moderation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved_today}</div>
            <p className="text-xs text-gray-500">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flagged Content</CardTitle>
            <Flag className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.flagged}</div>
            <p className="text-xs text-gray-500">Requires immediate attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent User Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentReports.map(report => (
                <div key={report.id} className="flex justify-between items-start border-b pb-2">
                  <div>
                    <div className="font-semibold text-sm">Photo {report.photo_id}</div>
                    <div className="text-sm text-gray-600">{report.reason}</div>
                    <div className="text-xs text-gray-400">By {report.reporter}</div>
                  </div>
                  <Badge variant="outline">{report.time}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Moderators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topModerators.map((mod, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="font-medium">{mod.name}</span>
                  <div className="flex gap-2">
                    <Badge variant="default">{mod.approved} approved</Badge>
                    <Badge variant="outline">{mod.rejected} rejected</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
