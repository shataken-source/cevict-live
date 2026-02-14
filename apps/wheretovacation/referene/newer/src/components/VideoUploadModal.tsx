import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface VideoUploadModalProps {
  open: boolean;
  onClose: () => void;
  hasMembership: boolean;
}

export default function VideoUploadModal({ open, onClose, hasMembership }: VideoUploadModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const UPLOAD_FEE = 9.99;

  const handleUpload = async () => {
    if (!title || !file) {
      toast.error('Please provide title and video file');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // If no membership, process payment first
      if (!hasMembership) {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        // Create payment session
        toast.info('Redirecting to payment...');
        // Store upload details in localStorage for after payment
        localStorage.setItem('pendingVideoUpload', JSON.stringify({
          title, description, fileName: file.name
        }));
        // Redirect to Stripe checkout
        return;
      }

      // Upload video file
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('video-uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('video-uploads')
        .getPublicUrl(fileName);

      toast.success('Video uploaded successfully!');
      onClose();
      setTitle('');
      setDescription('');
      setFile(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Upload Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!hasMembership && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Video uploads cost ${UPLOAD_FEE} per video. Upgrade to Captain Pro membership for unlimited uploads!
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="title">Video Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your video"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="video">Video File</Label>
            <Input
              id="video"
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={loading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'Uploading...' : hasMembership ? 'Upload Video' : `Pay $${UPLOAD_FEE} & Upload`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}