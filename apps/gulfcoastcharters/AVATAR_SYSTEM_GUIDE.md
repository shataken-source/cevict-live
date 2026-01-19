# Enterprise Avatar System - Implementation Guide

## Overview
A comprehensive, enterprise-grade avatar customization and shop system with gamification, analytics, and security features.

## Features
- **Avatar Customization**: Gender, skin tone, hair style/color, body type
- **Avatar Shop**: Purchase items (hats, sunglasses, accessories, clothing) with points
- **Inventory Management**: Track owned and equipped items
- **Points Economy**: 2 points per item, incentivizes user engagement
- **Analytics Tracking**: Monitor shop views, purchases, and user behavior
- **Audit Logging**: Complete transaction history with IP and user agent
- **Rate Limiting**: Prevents abuse (max 10 purchases per minute)
- **Security**: RLS policies, transaction validation, fraud detection

## Database Schema

### Tables
1. **user_avatars**: Stores avatar customization data
2. **avatar_shop_items**: Available items for purchase
3. **user_avatar_inventory**: User-owned items
4. **avatar_purchase_log**: Audit trail of all transactions
5. **avatar_analytics**: Event tracking for business intelligence

### Key Indexes
- User lookups optimized with user_id indexes
- Category filtering for shop items
- Purchase history queries optimized
- Analytics event type queries indexed

## Setup Instructions

### 1. Run Database Migration
```bash
# Apply the avatar system migration
psql -h your-db-host -U postgres -d your-database -f supabase/migrations/20240120_avatar_system.sql
```

### 2. Deploy Edge Function
```bash
# Deploy the avatar shop manager function
supabase functions deploy avatar-shop-manager
```

### 3. Configure Environment Variables
Ensure these are set in your Supabase project:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Integration

### Create Avatar on Signup
```typescript
// In UserAuth.tsx or registration flow
const { data: avatar } = await supabase
  .from('user_avatars')
  .insert({
    user_id: user.id,
    sex: 'male',
    skin_color: '#f5d0a9',
    hair_style: 'short',
    hair_color: '#4a3728'
  });
```

### Display Avatar
```typescript
import AvatarDisplay from '@/components/avatar/AvatarDisplay';

<AvatarDisplay
  sex={userData.sex}
  skinColor={userData.skin_color}
  hairStyle={userData.hair_style}
  hairColor={userData.hair_color}
  equippedItems={userInventory}
  size={120}
/>
```

### Avatar Shop
```typescript
import AvatarShop from '@/components/avatar/AvatarShop';

<AvatarShop
  userId={user.id}
  userPoints={userPoints}
  onPointsChange={(newPoints) => setUserPoints(newPoints)}
/>
```

## Points Economy

### Earning Points
Users earn points through:
- Posting photos: 5 points
- Writing reviews: 3 points
- Booking charters: 10 points
- Referring friends: 20 points
- Daily login: 1 point

### Spending Points
- All avatar items: 2 points each
- Creates incentive to engage with platform

## Security Features

### Rate Limiting
- Max 10 purchases per minute per user
- Prevents automated abuse

### Transaction Validation
- Verifies item exists and price matches
- Checks for duplicate purchases
- Validates sufficient points before deduction

### Audit Trail
- Logs all purchases with timestamp
- Records IP address and user agent
- Enables fraud detection and dispute resolution

### RLS Policies
- Users can only view/modify their own avatars
- Users can only view their own inventory
- All users can view active shop items
- Purchase logs are private to each user

## Analytics & Monitoring

### Tracked Events
- `shop_viewed`: User opens avatar shop
- `item_purchased`: Item successfully purchased
- `item_equipped`: User equips an item
- `avatar_updated`: User modifies avatar appearance

### Analytics Queries
```sql
-- Most popular items
SELECT item_id, COUNT(*) as purchases
FROM avatar_purchase_log
GROUP BY item_id
ORDER BY purchases DESC
LIMIT 10;

-- Revenue by category
SELECT asi.category, SUM(apl.points_spent) as total_points
FROM avatar_purchase_log apl
JOIN avatar_shop_items asi ON apl.item_id = asi.id
GROUP BY asi.category;

-- User engagement
SELECT DATE(created_at) as date, COUNT(DISTINCT user_id) as active_users
FROM avatar_analytics
WHERE event_type = 'shop_viewed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Admin Management

### Add New Items
```sql
INSERT INTO avatar_shop_items (name, category, price_points, rarity, description)
VALUES ('Pirate Hat', 'hat', 5, 'rare', 'Arr matey!');
```

### Adjust Prices
```sql
UPDATE avatar_shop_items
SET price_points = 3
WHERE rarity = 'rare';
```

### Disable Items
```sql
UPDATE avatar_shop_items
SET is_active = false
WHERE id = 'item-uuid';
```

### Grant Points (Admin)
```sql
UPDATE profiles
SET points = points + 50
WHERE id = 'user-uuid';
```

## Performance Optimization

### Caching Strategy
- Cache shop items (rarely change): 1 hour TTL
- Cache user inventory: 5 minutes TTL
- Real-time updates on purchases

### Database Optimization
- Indexes on all foreign keys
- Composite index on (user_id, is_equipped)
- Partitioning on purchase_log by date (for high volume)

## Testing

### Test Purchase Flow
```typescript
// 1. Check initial points
// 2. Purchase item
// 3. Verify points deducted
// 4. Verify item in inventory
// 5. Check purchase log entry
```

### Test Rate Limiting
```typescript
// Attempt 11 purchases in rapid succession
// 11th should fail with rate limit error
```

### Test Security
```typescript
// Attempt to purchase with insufficient points
// Attempt to purchase already-owned item
// Attempt to modify another user's avatar
```

## Troubleshooting

### Issue: Purchase fails silently
- Check user has sufficient points
- Verify item is active
- Check rate limit not exceeded
- Review purchase_log for errors

### Issue: Avatar not displaying items
- Verify items are marked as equipped
- Check equippedItems array passed to AvatarDisplay
- Ensure item IDs match shop items

### Issue: Points not updating
- Check profiles table has points column
- Verify transaction completed successfully
- Check for database triggers that might interfere

## Future Enhancements
- Seasonal/limited edition items
- Item trading between users
- Avatar animations
- 3D avatar rendering
- Social features (avatar contests, showcases)
- Premium items (real money purchases)
