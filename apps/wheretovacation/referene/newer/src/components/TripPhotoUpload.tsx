import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TripPhotoUploadProps {
  albumId?: string;
  onUploadComplete?: (photos: any[]) => void;
}

export default function TripPhotoUpload({ albumId, onUploadComplete }: TripPhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    setUploading(true);
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    onUploadComplete?.(files.map(f => ({ name: f.name, size: f.size })));
    setFiles([]);
    setUploading(false);
  };

  return (
    <Card className="p-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg mb-2">Drag & drop photos here</p>
        <p className="text-sm text-gray-500 mb-4">or</p>
        <Label htmlFor="file-upload" className="cursor-pointer">
          <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
            <ImageIcon className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
        </Label>
        <Input id="file-upload" type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">{files.length} photo(s) ready</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {files.map((file, idx) => (
              <div key={idx} className="relative group">
                <img src={URL.createObjectURL(file)} alt="" className="w-full h-24 object-cover rounded" />
                <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </Button>
        </div>
      )}
    </Card>
  );
}
