import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Upload, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { compressImage, extractEXIF, PhotoMetadata } from '@/utils/photoCompression';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface MobileCameraCaptureProps {
  onPhotoCapture: (url: string, metadata: PhotoMetadata) => void;
  onClose: () => void;
}

export default function MobileCameraCapture({ onPhotoCapture, onClose }: MobileCameraCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<PhotoMetadata | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      cameraInputRef.current?.click();
    } catch (error) {
      setCameraPermission('denied');
      toast.error('Camera access denied. Please enable in settings.');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const exifData = await extractEXIF(file);
      setMetadata(exifData);

      const compressed = await compressImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch (error) {
      toast.error('Failed to process photo');
    }
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);

    try {
      const blob = await fetch(preview).then(r => r.blob());
      const fileName = `catch-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('catch-photos')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('catch-photos')
        .getPublicUrl(fileName);

      onPhotoCapture(publicUrl, metadata!);
      toast.success('Photo uploaded successfully!');
      onClose();
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="fixed inset-4 z-50 p-4 overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Capture Catch Photo</h3>
        <Button variant="ghost" size="sm" onClick={onClose}><X /></Button>
      </div>

      {!preview ? (
        <div className="space-y-4">
          <Button onClick={requestCameraPermission} className="w-full h-20">
            <Camera className="mr-2" /> Take Photo
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-20">
            <ImageIcon className="mr-2" /> Choose from Gallery
          </Button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          <img src={preview} alt="Preview" className="w-full rounded-lg" />
          {metadata && (
            <div className="text-sm space-y-1">
              {metadata.latitude && <p className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {metadata.latitude.toFixed(6)}, {metadata.longitude?.toFixed(6)}</p>}
              {metadata.timestamp && <p className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {new Date(metadata.timestamp).toLocaleString()}</p>}
            </div>
          )}
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            <Upload className="mr-2" /> {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>
      )}
    </Card>
  );
}
