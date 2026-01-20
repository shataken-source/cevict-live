# Enterprise Social Sharing System - Setup Guide

## Overview
Gulf Coast Charters now has enterprise-level social sharing functionality allowing users to share avatars, achievements, and catches on Facebook, Twitter, LinkedIn, and more with custom branded images and analytics tracking.

## Components Created

### 1. SocialShareButton Component
**Location:** `src/components/SocialShareButton.tsx`
- Dropdown menu with Facebook, Twitter, LinkedIn, WhatsApp, Copy Link options
- Generates custom branded share images via edge function
- Tracks all shares in database for analytics
- Loading states and success feedback

**Usage:**
```tsx
<SocialShareButton
  type="avatar"
  data={{
    id: user.id,
    username: user.name,
    points: userPoints,
    level: Math.floor(userPoints / 100),
    shareText: "Check out my avatar!"
  }}
  userId={user.id}
/>
```

### 2. Share Image Generator Edge Function
**Function:** `share-image-generator`
- Uses AI Gateway with Gemini Flash Image model
- Generates 1200x630px social media optimized images
- Supports avatar, achievement, and catch share types
- Branded with Gulf Coast Charters theme

### 3. ViralGrowthDashboard Component
**Location:** `src/components/ViralGrowthDashboard.tsx`
- Admin analytics dashboard
- Tracks total shares, viral coefficient, click rates
- Charts by platform, type, and daily trends
- Real-time metrics

### 4. Database Tables
**Note:** Create these manually in Supabase SQL Editor:

```sql
-- Social shares tracking
CREATE TABLE social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  share_type TEXT,
  platform TEXT,
  share_url TEXT,
  image_url TEXT,
  content_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_shares_user_id ON social_shares(user_id);
CREATE INDEX idx_social_shares_created_at ON social_shares(created_at);

ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own shares" ON social_shares
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create shares" ON social_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Integration Points

### Community Page
- Avatar sharing button in profile header
- Share achievements when unlocked
- Integrated with points system

### Admin Dashboard
Add ViralGrowthDashboard to admin panel:
```tsx
import ViralGrowthDashboard from '@/components/ViralGrowthDashboard';

<ViralGrowthDashboard />
```

## Share Types

1. **Avatar Shares**: User profile with points and level
2. **Achievement Shares**: Unlocked badges with celebration design
3. **Catch Shares**: Fishing catches with weight and location
4. **Booking Shares**: Charter bookings (future)
5. **Review Shares**: User reviews (future)

## Analytics Tracking

All shares are tracked with:
- User ID
- Share type
- Platform
- Timestamp
- Generated image URL
- Metadata (custom data per share type)

## Viral Growth Metrics

Dashboard tracks:
- Total shares
- Shares by platform (pie chart)
- Shares by type (bar chart)
- Daily trends (line chart)
- Viral coefficient
- Click-through rates
- New user conversions

## Testing

1. **Test Avatar Sharing:**
   - Go to Community page
   - Click "Share" button on profile
   - Select platform
   - Verify image generation and share URL

2. **Test Achievement Sharing:**
   - Unlock an achievement
   - Click share button on achievement card
   - Verify custom achievement image

3. **Test Analytics:**
   - Share multiple items
   - Check ViralGrowthDashboard
   - Verify metrics update

## Security Features

- RLS policies on all tables
- User can only view/create own shares
- Rate limiting on image generation
- Secure edge function with CORS
- API Gateway for AI image generation

## Performance

- Images generated on-demand
- Cached share URLs
- Optimized 1200x630px format
- Fast social media previews
- Analytics aggregated daily

## Future Enhancements

1. Click tracking with UTM parameters
2. A/B testing different share images
3. Referral rewards for shares
4. Share leaderboards
5. Instagram Stories integration
6. Automated share campaigns

## Troubleshooting

**Images not generating:**
- Check GATEWAY_API_KEY is set
- Verify edge function deployed
- Check browser console for errors

**Shares not tracking:**
- Verify social_shares table exists
- Check RLS policies
- Ensure user is authenticated

**Analytics not showing:**
- Run manual query to verify data
- Check date filters
- Refresh dashboard

## Support

For issues, check:
1. Supabase logs for edge function errors
2. Browser console for frontend errors
3. Database logs for RLS policy issues
4. Network tab for API call failures
