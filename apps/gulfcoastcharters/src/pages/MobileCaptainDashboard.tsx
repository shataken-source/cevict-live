import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileCaptainDashboard from '@/components/MobileCaptainDashboard';
import MobileBookingManager from '@/components/mobile/MobileBookingManager';
import MobileEarningsTracker from '@/components/mobile/MobileEarningsTracker';
import MobilePhotoUpload from '@/components/mobile/MobilePhotoUpload';
import MobileNotificationSettings from '@/components/MobileNotificationSettings';
import { OfflineDocumentManager } from '@/components/OfflineDocumentManager';
import GPSWaypointManager from '@/components/GPSWaypointManager';
import { EmergencyContacts } from '@/components/EmergencyContacts';
import { SuggestionBox } from '@/components/SuggestionBox';
import { BuoyDataDisplay } from '@/components/BuoyDataDisplay';
import { TideChart } from '@/components/TideChart';
import { WeatherEmailReport } from '@/components/WeatherEmailReport';
import { FileText, Navigation, Phone, MessageCircle, Cloud, DollarSign, Camera, Bell } from 'lucide-react';

export default function MobileCaptainDashboardPage() {
  const captainId = 'captain-123';

  return (
    <div className="min-h-screen bg-gray-50">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full grid grid-cols-8 sticky top-0 z-50 bg-white overflow-x-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="earnings"><DollarSign className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="photos"><Camera className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="weather"><Cloud className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="gps"><Navigation className="w-4 h-4" /></TabsTrigger>
          <TabsTrigger value="emergency"><Phone className="w-4 h-4" /></TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="p-0">
          <MobileCaptainDashboard />
        </TabsContent>

        <TabsContent value="bookings" className="p-4">
          <MobileBookingManager />
        </TabsContent>

        <TabsContent value="earnings" className="p-4">
          <MobileEarningsTracker />
        </TabsContent>

        <TabsContent value="photos" className="p-4">
          <MobilePhotoUpload />
        </TabsContent>

        <TabsContent value="notifications" className="p-4">
          <MobileNotificationSettings />
        </TabsContent>

        <TabsContent value="weather" className="p-4 space-y-4">
          <BuoyDataDisplay stationId="42040" />
          <TideChart stationId="8729108" />
          <WeatherEmailReport />
        </TabsContent>

        <TabsContent value="gps" className="p-4">
          <GPSWaypointManager captainId={captainId} />
        </TabsContent>

        <TabsContent value="emergency" className="p-4">
          <EmergencyContacts />
        </TabsContent>
      </Tabs>
    </div>
  );
}


