import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MultiDayCalendar from './trip/MultiDayCalendar';
import AccommodationSelector from './trip/AccommodationSelector';
import FishingSpotPlanner from './trip/FishingSpotPlanner';
import PackingListManager from './trip/PackingListManager';
import CompanionInviter from './trip/CompanionInviter';
import TripWeatherForecast from './trip/TripWeatherForecast';
import HourlyWeatherDisplay from './trip/HourlyWeatherDisplay';
import WeatherAlertNotifier from './trip/WeatherAlertNotifier';


import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Ship, Calendar as CalendarIcon, Save } from 'lucide-react';

export default function MultiDayTripPlanner() {
  const [step, setStep] = useState(1);
  const [tripData, setTripData] = useState({
    title: '',
    description: '',
    captain_id: '',
    start_date: new Date(),
    end_date: new Date(),
    total_days: 0,
    latitude: 28.5383,
    longitude: -81.3792
  });
  const [accommodations, setAccommodations] = useState<any[]>([]);
  const [spots, setSpots] = useState<any[]>([]);
  const [packingItems, setPackingItems] = useState<any[]>([]);
  const [companions, setCompanions] = useState<any[]>([]);
  const [hourlyWeather, setHourlyWeather] = useState<any[]>([]);
  const { toast } = useToast();


  const handleDatesSelected = (start: Date, end: Date, days: number) => {
    setTripData({ ...tripData, start_date: start, end_date: end, total_days: days });
    setStep(2);
  };

  const handleSaveTrip = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('multi-day-trip-manager', {
        body: { action: 'create', tripData }
      });

      if (error) throw error;

      toast({ title: 'Trip created successfully!' });
      // Save accommodations, spots, packing items
    } catch (error) {
      toast({ title: 'Failed to create trip', variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Ship className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Multi-Day Trip Planner</h1>
        </div>
        <p className="text-muted-foreground">Plan your perfect fishing adventure</p>
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Trip Details</h2>
            <div className="space-y-4">
              <div>
                <Label>Trip Title</Label>
                <Input
                  value={tripData.title}
                  onChange={(e) => setTripData({ ...tripData, title: e.target.value })}
                  placeholder="Florida Keys Adventure"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={tripData.description}
                  onChange={(e) => setTripData({ ...tripData, description: e.target.value })}
                  placeholder="3-day offshore fishing trip"
                />
              </div>
            </div>
          </Card>
          <MultiDayCalendar onDatesSelected={handleDatesSelected} />
        </div>
      )}

      {step === 2 && (
        <>
          <WeatherAlertNotifier
            tripId="temp-trip-id"
            organizerEmail="organizer@example.com"
            latitude={tripData.latitude}
            longitude={tripData.longitude}
            startDate={tripData.start_date}
            endDate={tripData.end_date}
          />

          <TripWeatherForecast
            startDate={tripData.start_date}
            endDate={tripData.end_date}
            latitude={tripData.latitude}
            longitude={tripData.longitude}
            fishingSpots={spots}
          />


          <Tabs defaultValue="spots" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="spots">Fishing Spots</TabsTrigger>
              <TabsTrigger value="accommodations">Hotels</TabsTrigger>
              <TabsTrigger value="packing">Packing List</TabsTrigger>
              <TabsTrigger value="companions">Companions</TabsTrigger>
              <TabsTrigger value="hourly">Hourly Weather</TabsTrigger>
            </TabsList>

          <TabsContent value="spots" className="mt-6">
            <FishingSpotPlanner
              spots={spots}
              totalDays={tripData.total_days}
              onAdd={(spot) => setSpots([...spots, spot])}
              onRemove={(id) => setSpots(spots.filter(s => s.id !== id))}
            />
          </TabsContent>
          <TabsContent value="accommodations" className="mt-6">
            <AccommodationSelector
              accommodations={accommodations}
              onAdd={(acc) => setAccommodations([...accommodations, acc])}
              onRemove={(id) => setAccommodations(accommodations.filter(a => a.id !== id))}
            />
          </TabsContent>
          <TabsContent value="packing" className="mt-6">
            <PackingListManager
              items={packingItems}
              onAdd={(item) => setPackingItems([...packingItems, item])}
              onToggle={(id, packed) => setPackingItems(packingItems.map(i => i.id === id ? { ...i, packed } : i))}
              onRemove={(id) => setPackingItems(packingItems.filter(i => i.id !== id))}
            />
          </TabsContent>
          <TabsContent value="companions" className="mt-6">
            <CompanionInviter
              companions={companions}
              onInvite={async (email) => setCompanions([...companions, { email, status: 'invited' }])}
              onRemove={(id) => setCompanions(companions.filter(c => c.id !== id))}
            />
          </TabsContent>
          <TabsContent value="hourly" className="mt-6">
            <HourlyWeatherDisplay hourlyData={hourlyWeather} />
          </TabsContent>
        </Tabs>
        </>

      )}

      {step === 2 && (
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          <Button onClick={handleSaveTrip}>
            <Save className="w-4 h-4 mr-2" />
            Save Trip
          </Button>
        </div>
      )}
    </div>
  );
}
