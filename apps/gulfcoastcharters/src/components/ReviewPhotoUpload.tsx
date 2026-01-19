import { useState } from 'react';
import { Button } from './ui/button';
import { Camera, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ReviewPhotoUploadProps {
  onPhotosChange: (urls: string[]) => void;
}

export default function ReviewPhotoUpload({ onPhotosChange }: ReviewPhotoUploadProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('review-photos')
        .upload(filePath, file);

      if (!error) {
        const { data } = supabase.storage.from('review-photos').getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      }
    }

    const newPhotos = [...photos, ...uploadedUrls];
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
    setUploading(false);
    toast.success(`${uploadedUrls.length} photo(s) uploaded`);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
        <Button type="button" variant="outline" disabled={uploading || photos.length >= 5} className="w-full">
          <Camera className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : `Add Photos (${photos.length}/5)`}
        </Button>
      </label>
      {photos.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative group">
              <img src={url} alt="" className="w-full h-20 object-cover rounded" />
              <button onClick={() => removePhoto(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
