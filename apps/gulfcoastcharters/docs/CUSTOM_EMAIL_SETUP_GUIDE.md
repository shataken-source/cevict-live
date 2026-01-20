# Custom @gulfcoastcharters.com Email Setup Guide

## Overview
Users and captains can purchase professional @gulfcoastcharters.com email addresses using either cash or rewards points. Limited to 1 email per user type.

## Features Implemented

### 1. **Purchase Options**
- **Cash Payment**: $25 one-time fee
- **Rewards Points**: 5,000 points
- **Prize/Giveaway**: Admin can grant for free

### 2. **User Limits**
- Captains: 1 custom email per account
- Customers: 1 custom email per account
- Enforced at database level with triggers

### 3. **Email Validation**
- Minimum 3 characters
- Maximum 30 characters
- Lowercase letters, numbers, and hyphens only
- Cannot start or end with hyphen
- Unique across all users

### 4. **Integration Points**
- Customer Dashboard → Profile Tab
- Captain Dashboard → Documents Tab
- Admin Panel → Custom Email Manager

## Database Setup

### Run Migration
```bash
# Apply the custom emails migration
supabase migration up 20240121_custom_emails
```

### Tables Created
- `custom_emails`: Stores all purchased emails
- Includes RLS policies for security
- Admin view for management

## Edge Function Setup

### Create Purchase Function
Create `supabase/functions/purchase-custom-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { emailPrefix, paymentMethod, userType } = await req.json()
  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Check if email prefix is available
  const { data: existing } = await supabase
    .from('custom_emails')
    .select('id')
    .eq('email_prefix', emailPrefix)
    .single()

  if (existing) {
    return new Response(
      JSON.stringify({ error: 'Email prefix already taken' }), 
      { status: 400 }
    )
  }

  if (paymentMethod === 'points') {
    // Deduct points
    const { data: points } = await supabase
      .from('user_points')
      .select('total_points')
      .eq('user_id', user.id)
      .single()

    if (!points || points.total_points < 5000) {
      return new Response(
        JSON.stringify({ error: 'Insufficient points' }), 
        { status: 400 }
      )
    }

    await supabase
      .from('user_points')
      .update({ total_points: points.total_points - 5000 })
      .eq('user_id', user.id)

    // Create email record
    await supabase.from('custom_emails').insert({
      user_id: user.id,
      email_address: `${emailPrefix}@gulfcoastcharters.com`,
      email_prefix: emailPrefix,
      user_type: userType,
      payment_method: 'points',
      points_spent: 5000,
      is_active: true
    })

    return new Response(
      JSON.stringify({ success: true, email: `${emailPrefix}@gulfcoastcharters.com` }), 
      { status: 200 }
    )
  }

  if (paymentMethod === 'cash') {
    // In production, integrate with Stripe
    // For now, return success
    await supabase.from('custom_emails').insert({
      user_id: user.id,
      email_address: `${emailPrefix}@gulfcoastcharters.com`,
      email_prefix: emailPrefix,
      user_type: userType,
      payment_method: 'cash',
      amount_paid: 25,
      is_active: true
    })

    return new Response(
      JSON.stringify({ success: true, email: `${emailPrefix}@gulfcoastcharters.com` }), 
      { status: 200 }
    )
  }

  return new Response(JSON.stringify({ error: 'Invalid payment method' }), { status: 400 })
})
```

### Deploy Function
```bash
supabase functions deploy purchase-custom-email
```

## Email Forwarding Setup

### Using Google Workspace (Recommended)
1. Add domain: gulfcoastcharters.com
2. Create email routing rules
3. Forward to user's personal email

### Using Cloudflare Email Routing (Free)
1. Go to Cloudflare Dashboard
2. Add gulfcoastcharters.com domain
3. Enable Email Routing
4. Create catch-all rule or individual forwards

### Using AWS SES
1. Verify domain in SES
2. Create receipt rules
3. Forward to user's email via Lambda

## Admin Features

### Grant Email as Prize
```typescript
// In admin panel
const grantEmailPrize = async (userId: string, emailPrefix: string) => {
  await supabase.from('custom_emails').insert({
    user_id: userId,
    email_address: `${emailPrefix}@gulfcoastcharters.com`,
    email_prefix: emailPrefix,
    user_type: 'customer', // or 'captain'
    payment_method: 'prize',
    is_active: true
  })
}
```

### Deactivate Email
```typescript
await supabase
  .from('custom_emails')
  .update({ is_active: false })
  .eq('id', emailId)
```

## Feature Flag (Hidden by Default)

### Enable Feature
In `src/contexts/FeatureFlagContext.tsx`:
```typescript
const defaultFlags = {
  customEmails: false, // Set to true when ready
  // ... other flags
}
```

### Conditional Rendering
```typescript
{featureFlags.customEmails && (
  <CustomEmailPurchase 
    userId={userId}
    userType="customer"
    currentPoints={userPoints}
  />
)}
```

## Testing

### Test Purchase Flow
1. Login as customer/captain
2. Navigate to Profile/Documents tab
3. Enter desired email prefix
4. Select payment method (points or cash)
5. Complete purchase
6. Verify email appears in dashboard

### Test Admin Panel
1. Login as admin
2. Go to Custom Email Manager
3. View all purchased emails
4. Test activate/deactivate
5. Grant prize email to user

## Giveaway Integration

### Contest Prize
- Announce custom email as prize
- Winner provides desired prefix
- Admin grants via admin panel
- User receives notification

### Referral Reward
- Add to referral tiers
- Auto-grant when milestone reached
- Track in referral dashboard

## Best Practices

1. **Email Validation**: Always validate prefix before purchase
2. **Uniqueness Check**: Verify availability in real-time
3. **Payment Verification**: Confirm payment before creating email
4. **User Notification**: Send confirmation email after purchase
5. **Forwarding Setup**: Configure within 24 hours of purchase

## Pricing Strategy

### Current Pricing
- Cash: $25 (one-time)
- Points: 5,000 points

### Recommended Adjustments
- Early bird: $15 for first 100 users
- Bundle: $40 for 2 emails (captain + customer)
- Annual renewal: $10/year after first year

## Support & Troubleshooting

### Common Issues
1. **Prefix taken**: User must choose different prefix
2. **Insufficient points**: User needs to earn more points
3. **Payment failed**: Retry or use different method
4. **Email not forwarding**: Check DNS/routing setup

### Contact Support
- Email: support@gulfcoastcharters.com
- Include: User ID, desired prefix, error message
