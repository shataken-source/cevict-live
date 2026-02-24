import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function WeatherEmailReport() {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [includeWaves, setIncludeWaves] = useState(true);
  const [includeTides, setIncludeTides] = useState(true);
  const [includeBuoys, setIncludeBuoys] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async () => {
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('weather_subscriptions').insert({
        email,
        frequency,
        include_waves: includeWaves,
        include_tides: includeTides,
        include_buoys: includeBuoys,
        active: true
      });

      if (error) throw error;
      toast.success('Subscribed! You will receive weather reports via email.');
      setEmail('');
    } catch (error) {
      toast.error('Failed to subscribe');
    }
    setSubmitting(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Mail className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-bold">Weather Email Reports</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">Get marine weather updates delivered to your inbox</p>
      <div className="space-y-4">
        <Input placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex gap-4">
          <Button variant={frequency === 'daily' ? 'default' : 'outline'} onClick={() => setFrequency('daily')} className="flex-1">
            <Clock className="w-4 h-4 mr-2" />Daily
          </Button>
          <Button variant={frequency === 'weekly' ? 'default' : 'outline'} onClick={() => setFrequency('weekly')} className="flex-1">
            <Clock className="w-4 h-4 mr-2" />Weekly
          </Button>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeWaves} onCheckedChange={(c) => setIncludeWaves(!!c)} />
            Wave Heights & Periods
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeTides} onCheckedChange={(c) => setIncludeTides(!!c)} />
            Tide Predictions
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeBuoys} onCheckedChange={(c) => setIncludeBuoys(!!c)} />
            Buoy Data
          </label>
        </div>
        <Button onClick={handleSubscribe} disabled={submitting} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600">
          Subscribe to Reports
        </Button>
      </div>
    </Card>
  );
}
