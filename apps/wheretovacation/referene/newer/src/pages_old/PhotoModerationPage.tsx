import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhotoModerationQueue } from '@/components/PhotoModerationQueue';
import { ModerationDashboard } from '@/components/ModerationDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileCheck, BarChart } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export default function PhotoModerationPage() {
  const { user } = useUser();

  if (user?.level !== 1) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-500">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Photo Gallery Moderation
        </h1>
        <p className="text-gray-600 mt-2">
          Review and moderate user-uploaded fishing trip photos
        </p>
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Moderation Queue
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <PhotoModerationQueue />
        </TabsContent>

        <TabsContent value="dashboard">
          <ModerationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
