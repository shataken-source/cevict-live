import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Download, Upload, Plus, Trash2, MapPin } from 'lucide-react';

export default function GPSWaypointManager({ captainId }: { captainId: string }) {
  const [waypoints, setWaypoints] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadWaypoints();
  }, [captainId]);

  const loadWaypoints = async () => {
    const { data } = await supabase.functions.invoke('gps-waypoints', {
      body: { action: 'list', captainId }
    });
    if (data?.waypoints) setWaypoints(data.waypoints);
  };

  const handleAdd = async () => {
    if (!name || !lat || !lng) return;
    await supabase.functions.invoke('gps-waypoints', {
      body: { action: 'create', captainId, waypoint: { name, latitude: parseFloat(lat), longitude: parseFloat(lng), description } }
    });
    setName(''); setLat(''); setLng(''); setDescription('');
    loadWaypoints();
  };

  const handleExport = async (format: string) => {
    const { data } = await supabase.functions.invoke('gps-waypoints', {
      body: { action: 'export', captainId, format }
    });
    const blob = new Blob([format === 'gpx' ? data : JSON.stringify(data, null, 2)], { type: format === 'gpx' ? 'application/gpx+xml' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waypoints.${format}`;
    a.click();
  };

  const handleDelete = async (id: string) => {
    await supabase.functions.invoke('gps-waypoints', {
      body: { action: 'delete', captainId, waypoint: { id } }
    });
    loadWaypoints();
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2" />GPS Waypoints</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
        <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
        <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex gap-2 mb-4">
        <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add</Button>
        <Button variant="outline" onClick={() => handleExport('gpx')}><Download className="w-4 h-4 mr-2" />Export GPX</Button>
        <Button variant="outline" onClick={() => handleExport('json')}><Download className="w-4 h-4 mr-2" />Export JSON</Button>
      </div>
      <div className="space-y-2">
        {waypoints.map(wp => (
          <div key={wp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div>
              <p className="font-semibold">{wp.name}</p>
              <p className="text-sm text-gray-600">{wp.latitude}, {wp.longitude}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(wp.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
