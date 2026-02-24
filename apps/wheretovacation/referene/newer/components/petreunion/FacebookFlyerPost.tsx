'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Facebook, Heart, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface FacebookFlyerPostProps {
  pet: {
    pet_name?: string | null;
    pet_type: string;
    breed: string;
    color: string;
    size?: string | null;
    date_lost: string;
    location_city: string;
    location_state: string;
    location_zip?: string | null;
    location_detail?: string | null;
    markings?: string | null;
    description?: string | null;
    owner_name: string;
    owner_phone?: string | null;
    owner_email?: string | null;
    reward_amount?: number | null;
    photo_url?: string | null;
  };
  petUrl: string;
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
};

export default function FacebookFlyerPost({ pet, petUrl }: FacebookFlyerPostProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const formatFacebookPost = () => {
    const petName = pet.pet_name || 'This lost pet';
    const lostDate = new Date(pet.date_lost).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    const stateAbbr = STATE_ABBREVIATIONS[pet.location_state] || pet.location_state;
    const location = pet.location_zip
      ? `${pet.location_city}, ${stateAbbr} ${pet.location_zip}`
      : `${pet.location_city}, ${stateAbbr}`;
    const locationDetail = pet.location_detail ? ` near ${pet.location_detail}` : '';

    // Build description
    let description = '';
    if (pet.description) {
      description = pet.description;
    } else {
      description = `${pet.color} ${pet.breed}`;
      if (pet.size) {
        description += ` (${pet.size})`;
      }
    }

    if (pet.markings) {
      description += `\nMarkings: ${pet.markings}`;
    }

    // Format reward if available
    const rewardText = pet.reward_amount
      ? `\n\n💰 REWARD: $${pet.reward_amount.toLocaleString()}`
      : '';

    // Format contact info
    const contactInfo: string[] = [];
    if (pet.owner_phone) {
      contactInfo.push(`📞 ${pet.owner_phone}`);
    }
    if (pet.owner_email) {
      contactInfo.push(`✉️ ${pet.owner_email}`);
    }
    const contactText = contactInfo.length > 0
      ? `\n\n📞 CONTACT:\n${contactInfo.join('\n')}`
      : '';

    // Custom message from owner (if provided)
    const customMessageText = customMessage.trim()
      ? `\n\nMessage From Owner:\n\n${customMessage.trim()}\n`
      : '';

    // Create Facebook post in flyer format (PawBoost style)
    const facebookPost = `Please spread the word for this lost ${pet.pet_type.toLowerCase()}. ${petName} was LOST on ${lostDate} in ${location}${locationDetail}${customMessageText}

Description: ${description}${rewardText}${contactText}

For more info or to contact ${pet.pet_name ? `${pet.pet_name}'s` : 'the'} owner, click here: ${petUrl}

Lost or found a pet? Report it to PetReunion here: ${typeof window !== 'undefined' ? window.location.origin : ''}/petreunion/report

⚠️ WARNING: Please be cautious of users offering 'pet tracking services' in comments. We recommend only working with local shelters and verified organizations. Never send money to unknown services.

#LostPet #PetReunion #${pet.location_city.replace(/\s+/g, '')} #${stateAbbr}LostPets`;

    return facebookPost;
  };

  const handlePostToFacebook = () => {
    setIsOpening(true);

    const postText = formatFacebookPost();

    // Facebook Share Dialog with pre-filled text
    // Note: Facebook's share dialog doesn't support pre-filling text directly,
    // but we can use the quote parameter and also provide the URL
    // The user will need to copy/paste or we can use a workaround

    // Method 1: Use Facebook Share Dialog (opens in popup)
    // This will show the URL preview, user can add text manually
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(petUrl)}&quote=${encodeURIComponent(postText)}`;

    // Open in popup
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      shareUrl,
      'facebook-share',
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,location=0,status=0,scrollbars=1,resizable=1`
    );

    // Fallback: If popup blocked, open in new tab
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.open(shareUrl, '_blank');
    }

    // Also copy text to clipboard so user can paste it
    if (navigator.clipboard) {
      navigator.clipboard.writeText(postText).catch(() => {
        // Ignore clipboard errors
      });
    }

    setIsOpening(false);

    // Show instructions
    setTimeout(() => {
      alert(`Facebook is opening! Here's what to do:\n\n1. Login to Facebook if needed\n2. The post text has been copied to your clipboard\n3. Paste it into the Facebook post (Ctrl+V or Cmd+V)\n4. Add the pet's photo if you'd like\n5. Click "Post" to share!`);
    }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Custom Message Input */}
      <div className="space-y-2">
        <Label htmlFor="custom-message" className="text-base font-semibold flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          Customize River's Facebook Post
        </Label>
        <p className="text-sm text-gray-600 mb-2">
          Add your custom message to {pet.pet_name || 'your pet'}'s Facebook Post
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
          <p className="text-sm text-yellow-800 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <span>
              <strong>Pro Tip:</strong> Make it personal - if it comes from the heart, it will get shared more!
            </span>
          </p>
        </div>
        <Textarea
          id="custom-message"
          placeholder="e.g. We miss our baby so much. Please be on the lookout and help spread the word! We want our family to be whole again."
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="min-h-[100px] text-base"
          maxLength={500}
        />
        <p className="text-xs text-gray-500 text-right">
          {customMessage.length}/500 characters
        </p>
      </div>

      <Button
        onClick={handlePostToFacebook}
        disabled={isOpening}
        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-lg py-6"
        size="lg"
      >
        {isOpening ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Opening Facebook...
          </>
        ) : (
          <>
            <Facebook className="w-6 h-6 mr-3" />
            Post Flyer to Facebook
          </>
        )}
      </Button>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">📋 What happens:</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>Facebook will open in a new window</li>
          <li>Login to Facebook if needed</li>
          <li>The flyer text is copied to your clipboard</li>
          <li>Paste it into the post (Ctrl+V or Cmd+V)</li>
          <li>Add the pet photo if available</li>
          <li>Click "Post" to share!</li>
        </ol>
      </div>

      {/* Preview of what will be posted */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="font-semibold mb-3 text-gray-700 text-sm">📄 Facebook Post Preview:</p>
        <div className="bg-white border border-gray-300 rounded p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto font-sans">
          {formatFacebookPost()}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: This text is automatically copied to your clipboard when you click the button above.
        </p>
      </div>
    </div>
  );
}

