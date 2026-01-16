'use client';

/**
 * Lost Pet Alert Card
 * Amber Alert-style card for lost pets
 * Competitor feature: PawBoost Alert Card
 */

import { useState } from 'react';
import { trackAlertView, trackAlertShare, LostPetAlert } from '@/lib/alert-service';

interface Props {
  alert: LostPetAlert;
  onContact?: () => void;
  showFullDetails?: boolean;
}

export default function LostPetAlertCard({ alert, onContact, showFullDetails = false }: Props) {
  const [showDetails, setShowDetails] = useState(showFullDetails);
  const [shared, setShared] = useState(false);

  const handleShare = async (platform: 'twitter' | 'facebook' | 'whatsapp' | 'copy') => {
    const shareText = `🚨 LOST PET ALERT: ${alert.petName} (${alert.breed}) last seen near ${alert.lastSeenLocation.address}. ${alert.reward ? `$${alert.reward} reward!` : ''} Please help! #LostPet #PetReunion`;
    const shareUrl = `https://petreunion.com/alert/${alert.id}`;

    const shareLinks: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
    };

    if (platform === 'copy') {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } else {
      window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    }

    trackAlertShare(alert.id, platform);
  };

  const timeSinceLost = () => {
    const hours = Math.floor((Date.now() - new Date(alert.lastSeenDate).getTime()) / 3600000);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getPetIcon = () => {
    switch (alert.petType) {
      case 'dog': return '🐕';
      case 'cat': return '🐱';
      case 'bird': return '🦜';
      default: return '🐾';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-red-500">
      {/* Alert Banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">🚨</span>
            <span className="text-white font-bold uppercase tracking-wide text-sm">Lost Pet Alert</span>
          </div>
          {alert.reward && (
            <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
              ${alert.reward} Reward
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Main Info */}
        <div className="flex gap-4">
          {/* Photo */}
          <div className="w-32 h-32 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-5xl flex-shrink-0">
            {alert.photoUrl ? (
              <img src={alert.photoUrl} alt={alert.petName} className="w-full h-full object-cover rounded-xl" />
            ) : (
              getPetIcon()
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900">{alert.petName}</h2>
            <p className="text-slate-600">{alert.breed} • {alert.color}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                {alert.size}
              </span>
              <span className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                {alert.gender}
              </span>
              <span className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                {alert.age}
              </span>
              {alert.microchipped && (
                <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs">
                  Microchipped ✓
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-start gap-2">
            <span className="text-xl">📍</span>
            <div>
              <div className="font-medium text-slate-900">Last Seen</div>
              <div className="text-slate-700">{alert.lastSeenLocation.address}</div>
              <div className="text-sm text-red-600 font-medium">{timeSinceLost()}</div>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="mt-4 space-y-3">
            {alert.description && (
              <div>
                <div className="text-sm font-medium text-slate-500">Description</div>
                <p className="text-slate-700">{alert.description}</p>
              </div>
            )}
            {alert.collar && alert.collarDescription && (
              <div>
                <div className="text-sm font-medium text-slate-500">Collar</div>
                <p className="text-slate-700">{alert.collarDescription}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700"
        >
          {showDetails ? '▲ Less details' : '▼ More details'}
        </button>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
          <span>👁️ {alert.viewCount.toLocaleString()} views</span>
          <span>📤 {alert.shareCount.toLocaleString()} shares</span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          {/* Contact Button */}
          <button
            onClick={onContact}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>📞</span>
            Contact Owner
          </button>

          {/* Share Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleShare('twitter')}
              className="flex-1 py-2 bg-[#1DA1F2] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all"
            >
              Twitter
            </button>
            <button
              onClick={() => handleShare('facebook')}
              className="flex-1 py-2 bg-[#1877F2] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all"
            >
              Facebook
            </button>
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex-1 py-2 bg-[#25D366] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-all"
            >
              WhatsApp
            </button>
            <button
              onClick={() => handleShare('copy')}
              className="py-2 px-4 bg-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-300 transition-all"
            >
              {shared ? '✓' : '📋'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-500">
          If you see {alert.petName}, please contact the owner immediately. 
          Do not chase - stay calm and call.
        </p>
      </div>
    </div>
  );
}

