import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EventPhotoUploadProps {
  eventId: string;
  userId: string;
  onUploadComplete: () => void;
}

export function EventPhotoUpload({ eventId, userId, onUploadComplete }: EventPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${eventId}/${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('review-photos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('review-photos')
        .getPublicUrl(fileName);

      const { error: functionError } = await supabase.functions.invoke('event-photo-manager', {
        body: { action: 'upload', eventId, userId, photoUrl: publicUrl, caption }
      });

      if (functionError) throw functionError;

      toast({ title: 'Photo uploaded!', description: 'Awaiting organizer approval.' });
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      onUploadComplete();
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6 text-center">
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded" />
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={() => { setPreview(null); setSelectedFile(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="cursor-pointer">
            <Upload className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Click to upload photo</p>
            <Input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </label>
        )}
      </div>
      {selectedFile && (
        <>
          <Textarea
            placeholder="Add a caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </>
      )}
    </div>
  );
}
