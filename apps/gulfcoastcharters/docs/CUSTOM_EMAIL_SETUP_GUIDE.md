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

### Purchase Function
`supabase/functions/purchase-custom-email/index.ts`:
- **Auth**: Bearer token required (user must be signed in).
- **Body**: `emailPrefix`, `paymentMethod` (`points` | `cash`), `userType` (`captain` | `customer`).
- **Points**: Deducts 5,000 via `award_points` (negative), then inserts into `custom_emails`. Uses `get_user_points` to check balance.
- **Cash**: Returns error directing user to Stripe checkout in the app; actual cash purchases are completed via Stripe and `stripe-webhook` inserts the record.

### Grant Prize Function
`supabase/functions/grant-custom-email-prize/index.ts`:
- **Auth**: Bearer token required.
- **Body**: `userId`, `emailPrefix`, optional `userType` (default `customer`).
- Validates prefix and uniqueness, then inserts with `payment_method: 'prize'`. Limit of 1 per user type enforced by DB trigger.

### Deploy
```bash
supabase functions deploy purchase-custom-email
supabase functions deploy grant-custom-email-prize
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
await supabase.functions.invoke('grant-custom-email-prize', {
  body: { userId: 'uuid', emailPrefix: 'jane.doe', userType: 'customer' }
});
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
In `src/contexts/FeatureFlagContext.tsx` (or your feature-flag source):
- Add a flag e.g. `customEmails: true` when ready to show the feature.

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
5. Grant prize email to user (via function or future UI)

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

---

## Implementation status (no-BS)

**Migration:** `20240121_custom_emails.sql` – table `custom_emails` (id, user_id, email_address, email_prefix, user_type, payment_method, amount_paid, points_spent, forward_to_email, is_active, purchased_at, expires_at, created_at, updated_at). Trigger `enforce_custom_email_limit` limits 1 active custom email per (user_id, user_type). View `custom_emails_admin_view` joins `auth.users` for admin list. RLS: users see own rows; admin policies depend on `user_roles`.

**Edge functions:**
- **purchase-custom-email** – Auth via Bearer. Validates prefix (3–30 chars, [a-z0-9-], no leading/trailing hyphen). Points: checks `get_user_points`, deducts via `award_points(..., -5000, 'custom_email_purchase', ...)`, inserts `custom_emails`. Cash: returns 400 telling client to use Stripe; Stripe flow is handled in **stripe-webhook** (metadata.type === 'custom_email', inserts after checkout).
- **grant-custom-email-prize** – Auth via Bearer. Body: userId, emailPrefix, optional userType. Validates prefix and uniqueness; inserts with payment_method `prize`. DB trigger enforces one per user/type.

**UI:** **CustomEmailPurchase** (Customer Dashboard profile, Captain Dashboard documents) – validates prefix, offers cash (opens StripeEmailCheckout) or points (calls purchase-custom-email). **CustomEmailManager** (Admin Panel) – reads `custom_emails_admin_view`, toggle is_active, calls grant-custom-email-prize (grant form can be added for userId + emailPrefix). **StripeEmailCheckout** used for $25 cash; success path and webhook set custom email record.

**Points:** Balance from `get_user_points` (from `point_transactions` in 20240128_points_avatar_system). Deduction is negative `award_points` in purchase-custom-email.

**Feature flag:** Guide mentions a feature flag; app may show CustomEmailPurchase based on route/dashboard. Add a flag in your FeatureFlagContext or localStorage if you want to hide until launch.
