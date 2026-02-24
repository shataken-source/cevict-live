'use client';

import { Facebook, Twitter, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface SocialShareButtonsProps {
  pet: {
    pet_name: string | null;
    pet_type: string;
    breed: string;
    color: string;
    date_lost: string;
    location_city: string;
    location_state: string;
    location_zip?: string | null;
    location_detail?: string | null;
    description?: string | null;
  };
  petUrl: string;
}

export default function SocialShareButtons({ pet, petUrl }: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // Format date like "October 29, 2025"
  const formattedDate = new Date(pet.date_lost).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Create location string
  const location = pet.location_zip 
    ? `${pet.location_city}, ${pet.location_state} ${pet.location_zip}`
    : `${pet.location_city}, ${pet.location_state}`;
  
  const locationDetail = pet.location_detail ? ` near ${pet.location_detail}` : '';

  // Get origin for report link
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Create PawBoost-style share text
  const shareText = `Please spread the word for this lost ${pet.pet_type.toLowerCase()}. ${pet.pet_name || 'This pet'} was LOST on ${formattedDate} in ${location}${locationDetail}

${pet.description ? `Description: ${pet.description}` : `Description: ${pet.color} ${pet.breed}`}

For more info or to contact ${pet.pet_name ? `${pet.pet_name}'s` : 'the'} owner, click here: ${petUrl}

Lost or found a pet? Report it to PetReunion here: ${origin}/petreunion/report

⚠️ WARNING: Please be cautious of users offering 'pet tracking services' in comments. We recommend only working with local shelters and verified organizations. Never send money to unknown services.`;

  const shareTitle = `Lost ${pet.pet_type}: ${pet.pet_name || 'Help Find This Pet'}`;

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(petUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    const twitterText = `Lost ${pet.pet_type}: ${pet.pet_name || 'Help find this pet'} - Lost on ${formattedDate} in ${location}. ${petUrl}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(petUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Share text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy text');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(petUrl);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: petUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleFacebookShare}
          className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
          size="sm"
        >
          <Facebook className="w-4 h-4 mr-2" />
          Share on Facebook
        </Button>
        
        <Button
          onClick={handleTwitterShare}
          className="bg-[#1DA1F2] hover:bg-[#1a91da] text-white"
          size="sm"
        >
          <Twitter className="w-4 h-4 mr-2" />
          Share on Twitter
        </Button>

        {"share" in navigator && (
          <Button
            onClick={handleNativeShare}
            variant="outline"
            size="sm"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        )}

        <Button
          onClick={handleCopyText}
          variant="outline"
          size="sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Text
            </>
          )}
        </Button>

        <Button
          onClick={handleCopyLink}
          variant="outline"
          size="sm"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Link
        </Button>
      </div>

      {/* Preview of share text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
        <p className="font-semibold mb-2 text-gray-700">Share Preview:</p>
        <div className="text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
          {shareText}
        </div>
      </div>
    </div>
  );
}

