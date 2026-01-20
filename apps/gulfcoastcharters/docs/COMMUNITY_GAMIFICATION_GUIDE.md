# Community Gamification System - Gulf Coast Charters

## Overview
Complete points, ranks, achievements, and leaderboard system to drive community engagement and reward active users.

## Features Implemented

### 1. **Points System**
Users earn points for various actions:
- **Booking**: 100 points
- **Review**: 50 points  
- **Photo Upload**: 25 points
- **Message Post**: 10 points
- **Referral**: 200 points
- **Profile Complete**: 75 points
- **Video Upload**: 50 points
- **Event Attend**: 30 points
- **Daily Login**: 5 points
- **Achievement Unlock**: 150 points

### 2. **Rank System**
Four tiers based on total points:
- **Bronze**: 0-999 points (starting rank)
- **Silver**: 1,000-2,999 points
- **Gold**: 3,000-6,999 points
- **Platinum**: 7,000+ points (maximum rank)

### 3. **Achievement Badges**
Nine milestone achievements with progress tracking:
- **First Voyage**: Complete first booking (+100 pts)
- **Critic**: Leave 10 reviews (+500 pts)
- **Rising Star**: Earn 1,000 points (+150 pts)
- **Legend**: Earn 5,000 points (+500 pts)
- **Ambassador**: Refer 5 friends (+250 pts)
- **Photographer**: Upload 25 photos (+200 pts)
- **Social Butterfly**: Post 50 messages (+150 pts)
- **Seasoned Sailor**: Complete 10 bookings (+300 pts)
- **Reward Hunter**: Redeem first reward (+100 pts)

### 4. **Rewards Catalog**
Points can be redeemed for:
- **500 pts**: 10% discount on next booking
- **1,000 pts**: Free 1-month membership
- **2,000 pts**: 50% off advertising
- **3,500 pts**: Free 3-month membership
- **5,000 pts**: Free annual membership

### 5. **Community Leaderboard**
- View top users by points
- Filter by: Week / Month / All-Time
- See user ranks, avatars, and point totals
- Top 3 positions highlighted with trophy icons

## Components

### CommunityLeaderboard
- Displays top 20 users
- Time period filters (week/month/all-time)
- Rank badges with color coding
- Trophy/medal icons for top 3

### UserRankDisplay
- Shows current rank with crown icon
- Displays total points
- Progress bar to next rank
- Points needed for next tier

### AchievementBadgesEnhanced
- Grid of 9 achievement cards
- Progress tracking for locked achievements
- Visual distinction for unlocked achievements
- Point rewards displayed

### PointsRewardsDisplay
- Current points balance
- Available rewards catalog
- Redeem button (disabled if insufficient points)
- Gulf Coast themed design

## Integration Points

### Community Page (`/community`)
New tabs added:
1. **Leaderboard** (default view)
2. **Achievements**
3. **Events**
4. **Live Chat**
5. **Message Board**

User rank and points displayed prominently at top of page.

### Edge Function: `points-rewards-system`
Handles:
- `get_leaderboard`: Returns top users
- `get_user_rank`: Calculates rank and progress
- `get_achievements`: Returns achievement definitions
- `award_points`: Awards points for actions
- `get_rewards`: Returns rewards catalog
- `redeem_reward`: Processes reward redemption

## Usage Examples

### Award Points
```typescript
const { data } = await supabase.functions.invoke('points-rewards-system', {
  body: { 
    action: 'award_points', 
    userId: 'user-123',
    actionType: 'booking' 
  }
});
// Returns: { success: true, points: 100, actionType: 'booking' }
```

### Get User Rank
```typescript
const { data } = await supabase.functions.invoke('points-rewards-system', {
  body: { 
    action: 'get_user_rank',
    userId: 'user-123',
    metadata: { totalPoints: 2450 }
  }
});
// Returns: { rank: 'Silver', nextRank: 'Gold', pointsToNext: 550, progress: 72.5 }
```

## Future Enhancements

1. **Database Integration**: Store points/achievements in Supabase tables
2. **Real-time Updates**: Use Supabase realtime for live leaderboard
3. **Seasonal Leaderboards**: Reset weekly/monthly with special prizes
4. **Team Challenges**: Group competitions for bonus points
5. **Streak Bonuses**: Consecutive daily login rewards
6. **Social Sharing**: Share achievements on social media
7. **Push Notifications**: Alert users when achievements unlock
8. **Referral Tracking**: Detailed referral analytics
9. **Custom Avatars**: Unlock special avatars at rank milestones
10. **Exclusive Perks**: Platinum members get priority booking

## Design Theme
All components use Gulf Coast water/sand color palette:
- Ocean blues: `from-blue-500 via-cyan-400 to-teal-500`
- Sandy ambers: `from-amber-50 to-orange-50`
- Rank colors: Bronze (#CD7F32), Silver (#C0C0C0), Gold (#FFD700), Platinum (blue-purple gradient)

## Testing
Visit `/community` to see:
- Mock user with 2,450 points (Silver rank)
- Progress bar showing 72.5% to Gold
- 20 mock users in leaderboard
- 9 achievements with varying progress
- 5 redeemable rewards

All components are fully functional and ready for database integration.
