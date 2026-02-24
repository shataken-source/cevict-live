import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarIcon, DollarSign, Settings } from 'lucide-react';
import RealTimeAvailabilityCalendar from './RealTimeAvailabilityCalendar';
import SeasonalPricingManager from './SeasonalPricingManager';
import MaintenanceBlockManager from './captain/MaintenanceBlockManager';
import GoogleCalendarSync from './GoogleCalendarSync';

interface CaptainAvailabilityCalendarProps {
  captainId: string;
}

export default function CaptainAvailabilityCalendar({ captainId }: CaptainAvailabilityCalendarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability & Pricing Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calendar">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              <Settings className="h-4 w-4 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="sync">
              <Settings className="h-4 w-4 mr-2" />
              Sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <RealTimeAvailabilityCalendar captainId={captainId} mode="manage" />
          </TabsContent>

          <TabsContent value="pricing">
            <SeasonalPricingManager captainId={captainId} />
          </TabsContent>

          <TabsContent value="maintenance">
            <MaintenanceBlockManager captainId={captainId} />
          </TabsContent>

          <TabsContent value="sync">
            <GoogleCalendarSync captainId={captainId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

