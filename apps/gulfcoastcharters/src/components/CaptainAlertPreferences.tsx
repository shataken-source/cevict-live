import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Bell, Plus, Trash2, Save } from 'lucide-react';

const GULF_COAST_BUOYS = [
  { id: '42040', name: 'Luke Offshore, LA' },
  { id: '42039', name: 'Pensacola, FL' },
  { id: '42036', name: 'West Tampa, FL' },
  { id: '42001', name: 'Mid Gulf' },
  { id: '42002', name: 'West Gulf' },
  { id: '42019', name: 'Freeport, TX' },
  { id: '42020', name: 'Corpus Christi, TX' },
  { id: '42035', name: 'Galveston, TX' },
  { id: '42012', name: 'Orange Beach, AL' },
  { id: '42007', name: 'South Tampa, FL' }
];

const VESSEL_TYPES = [
  'Small Fishing Boat',
  'Medium Charter',
  'Large Charter',
  'Sailboat',
  'Catamaran',
  'Yacht'
];

export default function CaptainAlertPreferences() {
  const [preferences, setPreferences] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPref, setNewPref] = useState({
    vesselType: '',
    buoyId: '',
    maxWaveHeight: '',
    maxWindSpeed: '',
    minWaterTemp: '',
    maxWaterTemp: '',
    alertViaEmail: true,
    alertViaSms: true
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data } = await supabase.functions.invoke('captain-weather-alerts', {
      body: { action: 'getPreferences', captainId: 'current-captain' }
    });
    if (data?.preferences) setPreferences(data.preferences);
  };

  const savePreference = async () => {
    await supabase.functions.invoke('captain-weather-alerts', {
      body: { action: 'savePreference', preference: newPref }
    });
    setShowAddForm(false);
    loadPreferences();
  };

  const deletePreference = async (id: string) => {
    await supabase.functions.invoke('captain-weather-alerts', {
      body: { action: 'deletePreference', preferenceId: id }
    });
    loadPreferences();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Weather Alert Preferences
            </CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Alert
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card className="bg-blue-50">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Vessel Type</Label>
                    <Select value={newPref.vesselType} onValueChange={(v) => setNewPref({...newPref, vesselType: v})}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {VESSEL_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Buoy Station</Label>
                    <Select value={newPref.buoyId} onValueChange={(v) => setNewPref({...newPref, buoyId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select buoy" /></SelectTrigger>
                      <SelectContent>
                        {GULF_COAST_BUOYS.map(buoy => (
                          <SelectItem key={buoy.id} value={buoy.id}>{buoy.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Max Wave Height (ft)</Label>
                    <Input type="number" step="0.1" value={newPref.maxWaveHeight} 
                      onChange={(e) => setNewPref({...newPref, maxWaveHeight: e.target.value})} />
                  </div>
                  <div>
                    <Label>Max Wind Speed (kt)</Label>
                    <Input type="number" step="0.1" value={newPref.maxWindSpeed}
                      onChange={(e) => setNewPref({...newPref, maxWindSpeed: e.target.value})} />
                  </div>
                  <div>
                    <Label>Min Water Temp (°F)</Label>
                    <Input type="number" value={newPref.minWaterTemp}
                      onChange={(e) => setNewPref({...newPref, minWaterTemp: e.target.value})} />
                  </div>
                  <div>
                    <Label>Max Water Temp (°F)</Label>
                    <Input type="number" value={newPref.maxWaterTemp}
                      onChange={(e) => setNewPref({...newPref, maxWaterTemp: e.target.value})} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={newPref.alertViaEmail} 
                      onCheckedChange={(c) => setNewPref({...newPref, alertViaEmail: c})} />
                    <Label>Email Alerts</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={newPref.alertViaSms}
                      onCheckedChange={(c) => setNewPref({...newPref, alertViaSms: c})} />
                    <Label>SMS Alerts</Label>
                  </div>
                </div>
                <Button onClick={savePreference} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save Alert Preference
                </Button>
              </CardContent>
            </Card>
          )}

          {preferences.map(pref => (
            <Card key={pref.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{pref.vesselType} - {pref.buoyName}</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {pref.maxWaveHeight && <div>Max Wave: {pref.maxWaveHeight}ft</div>}
                      {pref.maxWindSpeed && <div>Max Wind: {pref.maxWindSpeed}kt</div>}
                      {pref.minWaterTemp && <div>Min Temp: {pref.minWaterTemp}°F</div>}
                      {pref.maxWaterTemp && <div>Max Temp: {pref.maxWaterTemp}°F</div>}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600">
                      {pref.alertViaEmail && <span>✓ Email</span>}
                      {pref.alertViaSms && <span>✓ SMS</span>}
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deletePreference(pref.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
