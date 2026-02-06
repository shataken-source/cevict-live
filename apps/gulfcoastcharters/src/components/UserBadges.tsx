/**
 * User Badges Component
 * Displays user's earned badges
 */

import { useState, useEffect } from 'react';
import { getUserBadges } from '@/lib/badges';

interface UserBadgesProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  maxDisplay?: number;
}

export default function UserBadges({ userId, size = 'md', maxDisplay = 5 }: UserBadgesProps) {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      // Skip invalid user IDs
      if (!userId || userId === 'system' || userId === 'anonymous' || userId.length < 10) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userBadges = await getUserBadges(userId);
        setBadges(userBadges);
      } catch (error) {
        console.error('Error loading badges:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadBadges();
    }
  }, [userId]);

  if (loading) {
    return <span className="text-xs text-gray-400">...</span>;
  }

  if (badges.length === 0) {
    return null;
  }

  const displayBadges = badges.slice(0, maxDisplay);
  const remaining = badges.length - maxDisplay;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayBadges.map((badge) => (
        <span
          key={badge.id}
          className={`${sizeClasses[size]} inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300`}
          title={badge.badge_description || badge.badge_name}
        >
          <span>{badge.badge_icon || '🏅'}</span>
          <span className="hidden sm:inline">{badge.badge_name.replace(/^[^\s]+\s/, '')}</span>
        </span>
      ))}
      {remaining > 0 && (
        <span className={`${sizeClasses[size]} text-gray-500`}>
          +{remaining} more
        </span>
      )}
    </div>
  );
}
