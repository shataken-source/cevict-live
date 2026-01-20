# Referral Challenges System Guide

## Overview
The Referral Challenges system adds gamification and time-limited competitions to boost referral engagement through challenges, leaderboards, and special badges.

## Features Implemented

### 1. Challenge Types
- **Flash Challenges**: Short-term (24-48 hours) high-reward challenges
- **Weekly Challenges**: 7-day challenges with multiplier rewards
- **Monthly Competitions**: Top referrers win premium prizes
- **Seasonal/Holiday**: Themed challenges for special occasions

### 2. Challenge Components

#### ReferralChallenges Component
- Displays active challenges with countdown timers
- Progress tracking with visual progress bars
- Reward multipliers (2x, 3x rewards)
- Challenge cards with themed icons
- Real-time countdown timers

#### ChallengeLeaderboard Component
- Live rankings for active challenges
- Top 3 highlighting with special badges
- Trend indicators (up/down/same)
- Timeframe filters (weekly/monthly/all-time)
- Winner badges for top performers

#### ChallengeBadges Component
- 4 rarity tiers: Common, Rare, Epic, Legendary
- Visual badge display with gradient backgrounds
- Progress tracking for locked badges
- Tooltips with badge requirements
- Earned date tracking

### 3. Challenge Examples

**Weekend Warrior (Flash)**
- Target: Refer 5 friends in 48 hours
- Reward: 2x multiplier + $50 bonus
- Icon: Lightning bolt

**Monthly Champion (Competition)**
- Target: Top 10 referrers
- Reward: 1 year premium + $500
- Icon: Trophy

**Holiday Special (Seasonal)**
- Target: Share on 3 platforms
- Reward: 500 bonus points + badge
- Icon: Gift

### 4. Badge System

**Rarity Levels:**
- Common (gray): Basic achievements
- Rare (blue): Moderate difficulty
- Epic (purple): Challenging goals
- Legendary (gold): Elite achievements

**Sample Badges:**
- Weekend Warrior: Complete 3 weekend challenges
- Champion: Win a monthly challenge
- Social Butterfly: Share on all platforms
- Legendary Referrer: Refer 100 friends
- Hot Streak: Complete 5 challenges in a row
- Holiday Hero: Complete all seasonal challenges

## Integration

### In ReferralDashboard
```tsx
import ReferralChallenges from './referral/ReferralChallenges';
import ChallengeLeaderboard from './referral/ChallengeLeaderboard';
import ChallengeBadges from './referral/ChallengeBadges';

<ReferralChallenges userId={userEmail} />
<div className="grid md:grid-cols-2 gap-6">
  <ChallengeLeaderboard />
  <ChallengeBadges userId={userEmail} />
</div>
```

## Edge Function

**Function Name:** `referral-challenges`

**Actions:**
- `get_challenges`: Fetch active challenges
- `get_leaderboard`: Get challenge rankings
- `update_progress`: Update user progress

**Usage:**
```typescript
const { data } = await supabase.functions.invoke('referral-challenges', {
  body: { action: 'get_challenges', userId: 'user@example.com' }
});
```

## Push Notifications Integration

Challenges can trigger push notifications for:
- New challenge launched
- Challenge ending soon (24h warning)
- Progress milestones reached
- Challenge completed
- Leaderboard position changes
- Badge earned

Use the existing `push-notification-service` edge function:
```typescript
await supabase.functions.invoke('push-notification-service', {
  body: {
    action: 'send',
    userId: userEmail,
    title: 'New Challenge Available!',
    body: 'Weekend Warrior: Refer 5 friends for 2x rewards',
    data: { challengeId: '1', type: 'challenge_start' }
  }
});
```

## Customization

### Adding New Challenges
Edit `ReferralChallenges.tsx` challenges array:
```typescript
{
  id: '4',
  title: 'Spring Break Special',
  description: 'Refer 10 friends during spring break',
  type: 'seasonal',
  target: 10,
  reward: '$100 Bonus + Free Trip',
  multiplier: 1.5,
  endsAt: '2024-04-01T00:00:00Z',
  theme: 'spring',
  icon: 'sun'
}
```

### Adding New Badges
Edit `ChallengeBadges.tsx` badges array:
```typescript
{
  id: '7',
  name: 'Speed Demon',
  description: 'Complete a challenge in under 1 hour',
  icon: 'rocket',
  rarity: 'epic',
  earned: false,
  progress: { current: 0, total: 1 }
}
```

## Best Practices

1. **Challenge Duration**: Keep flash challenges under 72 hours
2. **Reward Balance**: Higher targets = better rewards
3. **Seasonal Timing**: Align with holidays and events
4. **Notification Timing**: Send reminders at optimal times
5. **Leaderboard Updates**: Refresh every 5-10 minutes
6. **Badge Progression**: Create clear achievement paths

## Future Enhancements

1. **Team Challenges**: Group competitions
2. **Challenge Chains**: Complete one to unlock next
3. **Dynamic Rewards**: AI-adjusted based on performance
4. **Social Proof**: Share achievements on social media
5. **Challenge Marketplace**: Users create custom challenges
6. **Streak Bonuses**: Consecutive challenge completion rewards

## Testing

Test challenges with different scenarios:
- Active challenges display correctly
- Countdown timers update in real-time
- Progress bars reflect accurate completion
- Leaderboard rankings update properly
- Badges unlock at correct thresholds
- Push notifications trigger appropriately

## Support

For issues or questions about the referral challenges system, check:
- Component files in `src/components/referral/`
- Edge function: `referral-challenges`
- Push notification service integration
- Existing referral system documentation
