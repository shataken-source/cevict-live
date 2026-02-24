import { Share2, Facebook, Twitter, Mail, Link as LinkIcon } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';
import { useState } from 'react';

interface SocialShareProps {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  hashtags?: string[];
  type?: 'booking' | 'charter' | 'review' | 'general';
}

export default function SocialShare({ 
  title, 
  description, 
  url, 
  imageUrl,
  hashtags = [],
  type = 'general'
}: SocialShareProps) {
  const [showMenu, setShowMenu] = useState(false);
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description);
  const hashtagString = hashtags.length > 0 ? hashtags.join(',') : 'CharterBooking,BoatLife,OceanAdventure';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link Copied!', description: 'Link copied to clipboard' });
    setShowMenu(false);
  };

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${hashtagString}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
  };

  const handleShare = (platform: keyof typeof shareLinks) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    setShowMenu(false);
    toast({ 
      title: 'Shared!', 
      description: `Shared to ${platform.charAt(0).toUpperCase() + platform.slice(1)}` 
    });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        className="gap-2"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
            <button
              onClick={() => handleShare('facebook')}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 text-sm transition"
            >
              <Facebook className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Share to Facebook</span>
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="w-full px-4 py-3 text-left hover:bg-sky-50 flex items-center gap-3 text-sm transition"
            >
              <Twitter className="w-5 h-5 text-sky-500" />
              <span className="font-medium">Share to Twitter</span>
            </button>
            <button
              onClick={() => handleShare('email')}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm transition"
            >
              <Mail className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Share via Email</span>
            </button>
            <div className="border-t border-gray-200 my-1" />
            <button
              onClick={copyToClipboard}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm transition"
            >
              <LinkIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Copy Link</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
