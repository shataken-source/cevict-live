/**
 * PWA & Media Strategy: Photos free, videos premium.
 * FREE = max 5 photos/post, no video. PRO = unlimited photos + video. CAPTAIN = higher video limits.
 */

export type MediaTier = 'free' | 'pro' | 'captain';

export const MEDIA_LIMITS_FREE = {
  photos: {
    max_per_post: 5,
    max_size_mb: 5,
    total_uploads: 'unlimited' as const,
    auto_compress: true,
    target_width: 1920,
    formats: ['jpg', 'png', 'webp'],
  },
  videos: { allowed: false, message: 'Videos require PRO ($9.99/mo)' },
  storage: { photos: 'unlimited', total: '10GB' },
};

export const MEDIA_LIMITS_PRO = {
  photos: {
    max_per_post: 999,
    max_size_mb: 10,
    total_uploads: 'unlimited' as const,
    auto_compress: false,
    formats: ['jpg', 'png', 'webp', 'gif'],
  },
  videos: {
    allowed: true,
    max_per_post: 1,
    max_size_mb: 100,
    max_duration_sec: 120,
    formats: ['mp4', 'mov', 'avi'],
  },
  storage: { photos: 'unlimited', videos: '5GB/month', total: '5GB video rollover' },
};

export const MEDIA_LIMITS_CAPTAIN = {
  photos: {
    max_per_post: 999,
    max_size_mb: 20,
    total_uploads: 'unlimited' as const,
    raw_upload: true,
    formats: ['jpg', 'png', 'webp', 'gif', 'raw'],
  },
  videos: {
    allowed: true,
    max_per_post: 3,
    max_size_mb: 500,
    max_duration_sec: 600,
    formats: ['mp4', 'mov', 'avi', 'mkv'],
  },
  storage: { photos: 'unlimited', videos: 'unlimited', total: 'unlimited' },
};

export const MEDIA_LIMITS: Record<MediaTier, typeof MEDIA_LIMITS_FREE | typeof MEDIA_LIMITS_PRO | typeof MEDIA_LIMITS_CAPTAIN> = {
  free: MEDIA_LIMITS_FREE,
  pro: MEDIA_LIMITS_PRO,
  captain: MEDIA_LIMITS_CAPTAIN,
};

/**
 * Server-side: resolve media tier for a user.
 * - Captain with active elite -> captain
 * - Captain with active pro -> pro
 * - Else -> free (including customers; customer PRO subscription can be added later)
 */
export function getMediaTierFromCaptainSubscription(planType: string | null, status: string | null): MediaTier {
  if (status !== 'active' || !planType) return 'free';
  if (planType === 'elite') return 'captain';
  if (planType === 'pro') return 'pro';
  return 'free';
}
