import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, MessageCircle, Download, Share2, Tag, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PhotoDetailModalProps {
  photo: any;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  eventAttendees: any[];
  onPhotoUpdate: (photo: any) => void;
}

export default function PhotoDetailModal({
  photo,
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  eventAttendees,
  onPhotoUpdate
}: PhotoDetailModalProps) {
  const [comment, setComment] = useState('');
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [isLiked, setIsLiked] = useState(photo.likes?.some((l: any) => l.userId === currentUserId));

  const handleLike = async () => {
    try {
      const { data } = await supabase.functions.invoke('event-photo-manager', {
        body: {
          action: isLiked ? 'unlike' : 'like',
          photoId: photo.id,
          userId: currentUserId,
          userName: currentUserName
        }
      });

      if (data?.success) {
        setIsLiked(!isLiked);
        onPhotoUpdate({ ...photo, likes: data.likes });
        toast.success(isLiked ? 'Photo unliked' : 'Photo liked!');
      }
    } catch (error) {
      toast.error('Failed to update like');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    try {
      const { data } = await supabase.functions.invoke('event-photo-manager', {
        body: {
          action: 'comment',
          photoId: photo.id,
          userId: currentUserId,
          userName: currentUserName,
          comment: comment.trim()
        }
      });

      if (data?.success) {
        onPhotoUpdate({ ...photo, comments: data.comments });
        setComment('');
        toast.success('Comment added!');
      }
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleTag = async (attendee: any) => {
    try {
      const { data } = await supabase.functions.invoke('event-photo-manager', {
        body: {
          action: 'tag',
          photoId: photo.id,
          userId: currentUserId,
          taggedUserId: attendee.user_id,
          taggedUserName: attendee.user_name
        }
      });

      if (data?.success) {
        onPhotoUpdate({ ...photo, tags: data.tags });
        setShowTagMenu(false);
        toast.success(`Tagged ${attendee.user_name}`);
      }
    } catch (error) {
      toast.error('Failed to tag user');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.photo_url;
    link.download = `event-photo-${photo.id}.jpg`;
    link.click();
    toast.success('Photo downloaded!');
  };

  const handleShare = async (platform: string) => {
    const url = encodeURIComponent(photo.photo_url);
    const text = encodeURIComponent(photo.caption || 'Check out this photo!');
    
    const urls: any = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <img src={photo.photo_url} alt={photo.caption} className="w-full rounded-lg" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant={isLiked ? "default" : "outline"} size="sm" onClick={handleLike}>
                  <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                  {photo.likes?.length || 0}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setShowTagMenu(!showTagMenu)}>
                  <Tag className="h-4 w-4 mr-1" />
                  Tag
                </Button>
                {showTagMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {eventAttendees.map((attendee) => (
                      <button
                        key={attendee.user_id}
                        onClick={() => handleTag(attendee)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                      >
                        {attendee.user_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleShare('facebook')}>
                <Share2 className="h-4 w-4 mr-1" />
                Facebook
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleShare('twitter')}>
                <Share2 className="h-4 w-4 mr-1" />
                Twitter
              </Button>
            </div>

            {photo.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photo.tags.map((tag: any, idx: number) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    @{tag.userName}
                  </span>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Comments ({photo.comments?.length || 0})</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {photo.comments?.map((c: any) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-semibold">{c.userName}</span>
                    <p className="text-gray-600">{c.comment}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                />
                <Button onClick={handleComment}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
