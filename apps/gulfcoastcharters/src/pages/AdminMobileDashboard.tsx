import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminStatsDashboard from '@/components/admin/AdminStatsDashboard';
import ErrorMonitor from '@/components/admin/ErrorMonitor';
import ExpirationWarnings from '@/components/admin/ExpirationWarnings';
import ConfigManager from '@/components/admin/ConfigManager';
import { Bell, Settings, BarChart3, AlertCircle } from 'lucide-react';

export default function AdminMobileDashboard() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification('Notifications Enabled', {
          body: 'You will receive alerts for critical errors',
          icon: '/icon-192.png'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-blue-100">Mobile Management</p>
      </div>

      <div className="p-4 space-y-4">
        {!notificationsEnabled && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-orange-600" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Enable Push Notifications</div>
                <div className="text-xs text-gray-600">Get alerts for critical errors</div>
              </div>
              <Button size="sm" onClick={enableNotifications}>Enable</Button>
            </div>
          </Card>
        )}

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stats"><BarChart3 className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="errors"><AlertCircle className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="expiring"><Bell className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="config"><Settings className="w-4 h-4" /></TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-4">
            <AdminStatsDashboard />
          </TabsContent>

          <TabsContent value="errors" className="mt-4">
            <ErrorMonitor />
          </TabsContent>

          <TabsContent value="expiring" className="mt-4">
            <ExpirationWarnings />
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <ConfigManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
