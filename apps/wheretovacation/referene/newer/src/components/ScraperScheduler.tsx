import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Play, Pause, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Schedule {
  id: string;
  name: string;
  cron: string;
  enabled: boolean;
  lastRun?: string;
  urlCount: number;
}

export default function ScraperScheduler() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    name: 'Daily Charter Scrape',
    preset: 'daily'
  });

  const cronPresets = {
    hourly: '0 * * * *',
    daily: '0 2 * * *',
    weekly: '0 2 * * 0',
    monthly: '0 2 1 * *'
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = () => {
    const saved = localStorage.getItem('scraper_schedules');
    if (saved) setSchedules(JSON.parse(saved));
  };

  const saveSchedules = (updated: Schedule[]) => {
    setSchedules(updated);
    localStorage.setItem('scraper_schedules', JSON.stringify(updated));
  };

  const addSchedule = () => {
    const schedule: Schedule = {
      id: crypto.randomUUID(),
      name: newSchedule.name,
      cron: cronPresets[newSchedule.preset as keyof typeof cronPresets],
      enabled: true,
      urlCount: 100
    };
    saveSchedules([...schedules, schedule]);
    toast.success('Schedule created');
  };

  const toggleSchedule = (id: string) => {
    const updated = schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveSchedules(updated);
    toast.success('Schedule updated');
  };

  const deleteSchedule = (id: string) => {
    saveSchedules(schedules.filter(s => s.id !== id));
    toast.success('Schedule deleted');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Create New Schedule</h3>
        <div className="grid gap-4">
          <div>
            <Label>Schedule Name</Label>
            <Input
              value={newSchedule.name}
              onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
              placeholder="Daily Charter Scrape"
            />
          </div>
          <div>
            <Label>Frequency</Label>
            <Select value={newSchedule.preset} onValueChange={(v) => setNewSchedule({ ...newSchedule, preset: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Daily at 2 AM</SelectItem>
                <SelectItem value="weekly">Weekly (Sunday 2 AM)</SelectItem>
                <SelectItem value="monthly">Monthly (1st at 2 AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={addSchedule}>
            <Clock className="w-4 h-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">Active Schedules</h3>
        {schedules.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No schedules configured
          </Card>
        ) : (
          schedules.map(schedule => (
            <Card key={schedule.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold">{schedule.name}</h4>
                    <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                      {schedule.enabled ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Cron: {schedule.cron} • {schedule.urlCount} URLs
                  </p>
                  {schedule.lastRun && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last run: {new Date(schedule.lastRun).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleSchedule(schedule.id)}
                  >
                    {schedule.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
