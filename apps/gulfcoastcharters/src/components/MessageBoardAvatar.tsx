/**
 * Message Board Avatar Component
 * Displays user avatar next to username on message board posts
 */

import { useState, useEffect } from 'react';
import AvatarDisplay from './avatar/AvatarDisplay';
import { getUserAvatar, UserAvatarData } from '@/lib/avatar-helpers';

interface MessageBoardAvatarProps {
  userId: string;
  size?: number;
}

export default function MessageBoardAvatar({ userId, size = 40 }: MessageBoardAvatarProps) {
  const [avatarData, setAvatarData] = useState<UserAvatarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAvatar = async () => {
      // Skip if userId is invalid (not a UUID)
      if (!userId || userId === 'system' || userId === 'anonymous' || userId.length < 10) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getUserAvatar(userId);
        setAvatarData(data);
      } catch (error) {
        console.error('Error loading avatar:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadAvatar();
    }
  }, [userId]);

  if (loading) {
    return (
      <div 
        className="rounded-full bg-gray-200 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-400">...</span>
      </div>
    );
  }

  if (!avatarData) {
    // Default avatar
    return (
      <AvatarDisplay
        size={size}
      />
    );
  }

  return (
    <AvatarDisplay
      sex={avatarData.sex}
      skinColor={avatarData.skin_color}
      hairStyle={avatarData.hair_style}
      hairColor={avatarData.hair_color}
      bodyType={avatarData.body_type}
      equippedItems={avatarData.equipped_items}
      size={size}
    />
  );
}
