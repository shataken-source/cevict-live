import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationCenter } from '@/components/NotificationCenter';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { Bell, Settings } from 'lucide-react';

export default function NotificationHistory() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationCenter />
        </TabsContent>

        <TabsContent value="preferences">
          <div className="max-w-2xl">
            <NotificationPreferences />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
