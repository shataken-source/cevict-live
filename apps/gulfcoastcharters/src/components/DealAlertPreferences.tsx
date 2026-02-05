import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MessageSquare, MapPin, DollarSign, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const POPULAR_LOCATIONS = [
  'Gulf Shores, AL',
  'Orange Beach, AL',
  'Destin, FL',
  'Panama City Beach, FL',
  'Pensacola, FL',
  'Fort Myers, FL',
  'Naples, FL',
  'Tampa, FL'
];

export default function DealAlertPreferences() {
  const { toast } = useToast();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState(20);
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    const saved = localStorage.getItem('dealAlertPreferences');
    if (saved) {
      const prefs = JSON.parse(saved);
      setEmailEnabled(prefs.emailEnabled ?? true);
      setSmsEnabled(prefs.smsEnabled ?? false);
      setPhoneNumber(prefs.phoneNumber ?? '');
      setSelectedLocations(prefs.selectedLocations ?? []);
      setMinDiscount(prefs.minDiscount ?? 20);
      setMaxPrice(prefs.maxPrice ?? '');
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      const preferences = {
        emailEnabled,
        smsEnabled,
        phoneNumber,
        selectedLocations,
        minDiscount,
        maxPrice
      };

      localStorage.setItem('dealAlertPreferences', JSON.stringify(preferences));

      toast({
        title: 'Preferences Saved',
        description: 'Your deal alert preferences have been updated.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Deal Alert Preferences
        </CardTitle>
        <CardDescription>
          Get notified when new last-minute deals match your preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Methods */}
        <div className="space-y-4">
          <h3 className="font-semibold">Notification Methods</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="email-alerts">Email Alerts</Label>
            </div>
            <Switch
              id="email-alerts"
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="sms-alerts">SMS Alerts</Label>
            </div>
            <Switch
              id="sms-alerts"
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>

          {smsEnabled && (
            <div className="ml-6">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Location Preferences */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Preferred Locations</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Select locations where you'd like to receive deal alerts
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_LOCATIONS.map(location => (
              <Badge
                key={location}
                variant={selectedLocations.includes(location) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleLocation(location)}
              >
                {location}
                {selectedLocations.includes(location) && (
                  <X className="w-3 h-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* Deal Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold">Deal Filters</h3>
          </div>

          <div>
            <Label htmlFor="min-discount">Minimum Discount (%)</Label>
            <Input
              id="min-discount"
              type="number"
              min="0"
              max="100"
              value={minDiscount}
              onChange={(e) => setMinDiscount(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="max-price">Maximum Price ($)</Label>
            <Input
              id="max-price"
              type="number"
              min="0"
              placeholder="No limit"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <Button onClick={savePreferences} disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}