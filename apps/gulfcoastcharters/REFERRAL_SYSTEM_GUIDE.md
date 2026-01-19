# Comprehensive Referral System Guide

## Overview
Gulf Coast Charters now features a complete referral system that rewards users for inviting friends. The system includes unique referral codes, tiered rewards, automated email invitations, leaderboards, and achievement badges.

## Features Implemented

### 1. Unique Referral Codes
- Each user gets a unique referral code (format: GCC + 8 random characters)
- Codes are automatically generated on first access
- Shareable URL format: `https://yoursite.com?ref=GCCXXXXXXXX`

### 2. Tiered Rewards System
Users unlock bonus rewards at different milestones:
- **3 Referrals**: Bronze Ambassador Badge + $75 Bonus
- **10 Referrals**: Silver Captain Badge + $300 Bonus
- **25 Referrals**: Gold Legend Badge + $1000 Bonus
- **50 Referrals**: Platinum Elite Badge + Lifetime VIP Status

Base rewards:
- Referrer earns $25 per completed referral
- New user gets $10 off their first booking

### 3. Achievement Badges
Six achievement badges available:
- First Referral (1 referral)
- Bronze Ambassador (3 referrals)
- Silver Captain (10 referrals)
- Gold Legend (25 referrals)
- Platinum Elite (50 referrals)
- Big Earner ($500+ earned)

### 4. Email Invitation System
- Send invites to multiple friends at once
- Customizable personal message
- Automatic tracking of sent invitations
- Email templates with referral code embedded

### 5. Referral Dashboard
Displays:
- Available credits balance
- Total lifetime earnings
- Number of successful referrals
- Pending referrals count
- Progress toward next tier
- Referral history with status
- Copy buttons for code and share URL

### 6. Referral Leaderboard
- Top 10 referrers displayed
- Shows referral count and total earnings
- Special styling for top 3 positions
- Badge display for tier achievements
- Real-time updates

## Components Created

### Frontend Components
1. **ReferralTiers** (`src/components/referral/ReferralTiers.tsx`)
   - Visual progress bars for tier advancement
   - Display of all tier rewards
   - Unlock status indicators

2. **ReferralEmailInvite** (`src/components/referral/ReferralEmailInvite.tsx`)
   - Email invitation form
   - Multiple recipient support
   - Custom message field

3. **ReferralBadges** (`src/components/referral/ReferralBadges.tsx`)
   - Achievement badge display
   - Unlock status visualization
   - Badge descriptions

4. **ReferralDashboard** (Enhanced)
   - Complete referral management interface
   - Stats cards with credits, earnings, and referral counts
   - Integration with all sub-components

5. **ReferralLeaderboard** (Enhanced)
   - Top referrers ranking
   - Badge display for achievements
   - Earnings visualization

## Database Schema Required

```sql
-- Referral Codes Table
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Referrals Table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_email TEXT NOT NULL,
  referee_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  reward_amount DECIMAL DEFAULT 25.00,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Referral Invites Table
CREATE TABLE referral_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_email TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_referrals_referrer ON referrals(referrer_email);
CREATE INDEX idx_referrals_code ON referrals(referral_code);
CREATE INDEX idx_referral_codes_email ON referral_codes(user_email);
```

## Edge Function Setup

Create a Supabase edge function `referral-rewards`:

```bash
supabase functions new referral-rewards
```

The function handles:
- `generate_code`: Creates unique referral code for user
- `get_referrals`: Fetches user's referral history and stats
- `send_invites`: Processes email invitations
- `get_leaderboard`: Returns top 10 referrers

## Integration Points

### Community Page
The referral system is integrated into the Community Hub:
- New "Referrals" tab in the main navigation
- Displays both ReferralDashboard and ReferralLeaderboard
- Requires user authentication

### Customer Dashboard
Already integrated in the "Referrals" tab of the customer dashboard.

## Usage Flow

1. **User Accesses Referrals Tab**
   - System generates unique code if none exists
   - Dashboard loads with current stats

2. **User Shares Code**
   - Copy referral code or share URL
   - Or send email invitations to friends

3. **Friend Signs Up**
   - Uses referral code during registration
   - Gets $10 credit applied to account

4. **Friend Completes First Booking**
   - Referral status changes to "completed"
   - Referrer receives $25 credit
   - Progress toward tier rewards updates

5. **Tier Rewards Unlock**
   - Automatic bonus applied at milestones
   - Achievement badges awarded
   - Leaderboard position updates

## Email Templates

Email invitations should include:
- Referrer's name and personal message
- Referral code prominently displayed
- Sign-up link with code pre-filled
- Benefit explanation ($10 off first booking)
- Call-to-action button

## Analytics & Tracking

Track these metrics:
- Total referrals per user
- Conversion rate (invites → signups)
- Revenue generated through referrals
- Most active referrers
- Tier distribution
- Average time to first referral

## Future Enhancements

Consider adding:
- Social media sharing integration
- Referral contest campaigns
- Limited-time bonus multipliers
- Team/group referral challenges
- Referral analytics dashboard for admins
- Automated reminder emails for pending referrals
- Referral expiration dates
- Custom referral codes (vanity codes)

## Testing

Test scenarios:
1. Generate referral code for new user
2. Send email invitations
3. Track referral through signup and booking
4. Verify credit application
5. Test tier progression
6. Verify leaderboard updates
7. Check badge unlocking

## Support & Troubleshooting

Common issues:
- **Code not generating**: Check edge function deployment
- **Credits not applied**: Verify referral status is "completed"
- **Leaderboard not updating**: Check database query in edge function
- **Emails not sending**: Verify email service configuration
