import { Facebook, Twitter, Linkedin, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface SocialShareWithPointsProps {
  referralCode?: string;
  shareUrl: string;
  shareText: string;
  itemType?: string;
}

export default function SocialShareWithPoints({ 
  referralCode, 
  shareUrl, 
  shareText,
  itemType = 'charter'
}: SocialShareWithPointsProps) {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sharedPlatforms, setSharedPlatforms] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const shared = localStorage.getItem('shared-platforms');
    if (shared) setSharedPlatforms(new Set(JSON.parse(shared)));
  }, []);

  const handleShare = async (platform: string, url: string) => {
    window.open(url, '_blank', 'width=600,height=400');

    if (user && !sharedPlatforms.has(platform)) {
      try {
        await supabase.functions.invoke('points-rewards-system', {
          body: { 
            action: 'add',
            userId: user.id,
            points: 10,
            reason: `Shared on ${platform}`
          }
        });

        const newShared = new Set(sharedPlatforms).add(platform);
        setSharedPlatforms(newShared);
        localStorage.setItem('shared-platforms', JSON.stringify([...newShared]));

        toast({ 
          title: `+10 Points!`, 
          description: `You earned points for sharing on ${platform}!` 
        });
      } catch (error) {
        console.error('Points error:', error);
      }
    } else {
      toast({ 
        title: `Sharing on ${platform}!`, 
        description: 'Your link is being shared.' 
      });
    }
  };

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        Share & Earn 10 Points Per Platform!
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Button
          onClick={() => handleShare('Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`)}
          className="bg-[#1877F2] hover:bg-[#166FE5] text-white text-xs md:text-sm"
          size="sm"
        >
          <Facebook className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          Facebook
        </Button>

        <Button
          onClick={() => handleShare('Twitter', `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`)}
          className="bg-[#1DA1F2] hover:bg-[#1A8CD8] text-white text-xs md:text-sm"
          size="sm"
        >
          <Twitter className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          Twitter
        </Button>

        <Button
          onClick={() => handleShare('LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)}
          className="bg-[#0A66C2] hover:bg-[#004182] text-white text-xs md:text-sm"
          size="sm"
        >
          <Linkedin className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          LinkedIn
        </Button>

        <Button
          onClick={() => handleShare('WhatsApp', `https://wa.me/?text=${encodedText}%20${encodedUrl}`)}
          className="bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs md:text-sm"
          size="sm"
        >
          <MessageCircle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
          WhatsApp
        </Button>

        <Button
          onClick={() => handleShare('TikTok', `https://www.tiktok.com/share?url=${encodedUrl}&text=${encodedText}`)}
          className="bg-black hover:bg-gray-800 text-white text-xs md:text-sm"
          size="sm"
        >
          <TikTokIcon />
          <span className="ml-1">TikTok</span>
        </Button>
      </div>
    </div>
  );
}
