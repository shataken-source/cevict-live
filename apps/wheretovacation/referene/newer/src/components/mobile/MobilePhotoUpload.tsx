import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, Image, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface MobilePhotoUploadProps {
  bookingId?: string;
  onUploadComplete?: (url: string) => void;
}

export default function MobilePhotoUpload({ bookingId, onUploadComplete }: MobilePhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!preview) return;

    setUploading(true);
    try {
      const blob = await fetch(preview).then(r => r.blob());
      const fileName = `${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('trip-photos')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(fileName);

      if (bookingId) {
        await supabase.from('trip_photos').insert({
          booking_id: bookingId,
          photo_url: publicUrl
        });
      }

      toast({ title: 'Photo uploaded successfully!' });
      onUploadComplete?.(publicUrl);
      setPreview(null);
    } catch (err) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Upload Trip Photos</h3>
      
      {!preview ? (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="w-4 h-4 mr-2" />
            Choose from Gallery
          </Button>
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full rounded-lg" />
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={() => setPreview(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button
            className="w-full"
            onClick={uploadPhoto}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>
      )}
    </Card>
  );
}
