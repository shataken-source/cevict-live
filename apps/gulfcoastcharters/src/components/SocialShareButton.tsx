import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Facebook, Twitter, Instagram, Linkedin, Copy, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SocialShareButtonProps {
  type: 'avatar' | 'achievement' | 'catch' | 'booking' | 'review';
  data: any;
  userId?: string;
}

export function SocialShareButton({ type, data, userId }: SocialShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateShareImage = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('share-image-generator', {
        body: { type, data }
      });

      if (error) throw error;
      return result.imageUrl;
    } catch (error) {
      console.error('Image generation failed:', error);
      return null;
    }
  };

  const trackShare = async (platform: string, shareUrl: string, imageUrl?: string) => {
    if (!userId) return;

    try {
      await supabase.from('social_shares').insert({
        user_id: userId,
        share_type: type,
        platform,
        share_url: shareUrl,
        image_url: imageUrl,
        content_id: data.id,
        metadata: { data }
      });
    } catch (error) {
      console.error('Share tracking failed:', error);
    }
  };

  const handleShare = async (platform: string) => {
    setLoading(true);
    
    const shareUrl = `${window.location.origin}/share/${type}/${data.id}`;
    const shareText = data.shareText || `Check this out on Gulf Coast Charters!`;
    
    let imageUrl: string | null = null;
    if (platform !== 'copy_link') {
      imageUrl = await generateShareImage();
    }

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
    };

    if (platform === 'copy_link') {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Link copied!', description: 'Share link copied to clipboard' });
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }

    await trackShare(platform, shareUrl, imageUrl || undefined);
    setLoading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleShare('facebook')}>
          <Facebook className="w-4 h-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('twitter')}>
          <Twitter className="w-4 h-4 mr-2" />
          Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('linkedin')}>
          <Linkedin className="w-4 h-4 mr-2" />
          LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('copy_link')}>
          {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
          {copied ? 'Copied!' : 'Copy Link'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}