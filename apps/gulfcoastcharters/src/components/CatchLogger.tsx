import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, MapPin, Calendar, Fish, Camera, Sparkles } from 'lucide-react';
import MobileCameraCapture from './MobileCameraCapture';
import FishSpeciesRecognition from './FishSpeciesRecognition';
import { PhotoMetadata } from '@/utils/photoCompression';


interface Species {
  id: string;
  name: string;
  scientific_name: string;
  category: string;
}

export default function CatchLogger({ onSuccess }: { onSuccess?: () => void }) {
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    species_id: '',
    weight: '',
    length: '',
    location: '',
    catch_date: new Date().toISOString().split('T')[0],
    photo_url: '',
    notes: '',
    latitude: null as number | null,
    longitude: null as number | null
  });


  useEffect(() => {
    loadSpecies();
  }, []);

  const loadSpecies = async () => {
    const { data, error } = await supabase.functions.invoke('catch-logger', {
      body: { action: 'get_species' }
    });
    if (!error && data.species) setSpecies(data.species);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('catch-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('catch-photos')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
      toast.success('Photo uploaded!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = (url: string, metadata: PhotoMetadata) => {
    setFormData(prev => ({
      ...prev,
      photo_url: url,
      latitude: metadata.latitude || null,
      longitude: metadata.longitude || null,
      location: metadata.latitude && metadata.longitude 
        ? `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)}`
        : prev.location
    }));
    setShowCamera(false);
    toast.success('Photo captured with location data!');
  };

  const handleAISpeciesSelect = async (speciesName: string, weight: number, length: number) => {
    // Find matching species ID from database
    const matchedSpecies = species.find(s => 
      s.name.toLowerCase().includes(speciesName.toLowerCase()) ||
      speciesName.toLowerCase().includes(s.name.toLowerCase())
    );

    setFormData(prev => ({
      ...prev,
      species_id: matchedSpecies?.id || prev.species_id,
      weight: weight.toString(),
      length: length.toString()
    }));

    // Award points for using AI recognition (gamification)
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.functions.invoke('points-rewards-system', {
          body: {
            action: 'award_points',
            userId: session.user.id,
            actionType: 'ai_recognition_use',
            amount: 5,
          },
        });
        toast.success('AI recognition used! +5 points');
      }
    } catch (pointsError) {
      console.error('Error awarding AI recognition points:', pointsError);
      // Don't block AI usage if points fail
    }

    if (!matchedSpecies) {
      toast.info(`Species "${speciesName}" not found in database. Please select manually.`);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const { data, error } = await supabase.functions.invoke('catch-logger', {
        body: {
          action: 'log_catch',
          ...formData,
          weight: parseFloat(formData.weight),
          length: formData.length ? parseFloat(formData.length) : null,
          catch_date: new Date(formData.catch_date).toISOString()
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (error) throw error;

      // Award points for logging catch (gamification)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.functions.invoke('points-rewards-system', {
            body: {
              action: 'award_points',
              userId: session.user.id,
              actionType: 'catch_logged',
              amount: 25,
            },
          });
        }
      } catch (pointsError) {
        console.error('Error awarding catch points:', pointsError);
        // Don't block catch logging if points fail
      }

      toast.success('Catch logged successfully! +25 points');
      setFormData({
        species_id: '',
        weight: '',
        length: '',
        location: '',
        catch_date: new Date().toISOString().split('T')[0],
        photo_url: '',
        notes: '',
        latitude: null,
        longitude: null
      });
      onSuccess?.();

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showCamera && (
        <MobileCameraCapture
          onPhotoCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
      <Card>

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fish className="w-5 h-5" />
          Log Your Catch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Species *</Label>
            <Select value={formData.species_id} onValueChange={(v) => setFormData(prev => ({ ...prev, species_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select species" />
              </SelectTrigger>
              <SelectContent>
                {species.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Weight (lbs) *</Label>
              <Input type="number" step="0.01" value={formData.weight} onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))} required />
            </div>
            <div>
              <Label>Length (inches)</Label>
              <Input type="number" step="0.1" value={formData.length} onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location *
            </Label>
            <Input value={formData.location} onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))} required />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date *
            </Label>
            <Input type="date" value={formData.catch_date} onChange={(e) => setFormData(prev => ({ ...prev, catch_date: e.target.value }))} required />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photo
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={() => setShowCamera(true)} variant="outline" className="w-full">
                <Camera className="mr-2 w-4 h-4" /> Take Photo
              </Button>
              <Button type="button" onClick={() => document.getElementById('file-upload')?.click()} variant="outline" className="w-full">
                <Upload className="mr-2 w-4 h-4" /> Upload
              </Button>
            </div>
            <Input id="file-upload" type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
            {formData.photo_url && (
              <div className="space-y-3">
                <div className="relative">
                  <img src={formData.photo_url} alt="Catch" className="w-full h-48 object-cover rounded-lg" />
                  {formData.latitude && formData.longitude && (
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
                <FishSpeciesRecognition
                  imageUrl={formData.photo_url}
                  onSpeciesSelect={handleAISpeciesSelect}
                />
              </div>
            )}
          </div>



          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={3} />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Logging...' : 'Log Catch'}
          </Button>
        </form>
      </CardContent>
      </Card>
    </>
  );
}
