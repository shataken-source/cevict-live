# SMS Notifications System Guide

## Overview
Gulf Coast Charters now has a comprehensive SMS notification system using Twilio, allowing users to receive critical notifications via text message.

## Features

### 1. Phone Verification
- **SMS Verification Codes**: 6-digit codes sent via Twilio
- **10-Minute Expiration**: Codes expire after 10 minutes
- **Secure Storage**: Verification codes stored in database
- **One-Time Use**: Codes are marked as used after verification

### 2. SMS Notification Types
Users can opt-in to receive SMS for:
- **Booking Confirmations**: Instant confirmation when booking is made
- **Booking Reminders**: Reminders before charter departure
- **Cancellations**: Immediate notification of cancellations
- **Urgent Messages**: Critical updates from captains or admin

### 3. Rate Limiting
- **10 messages per hour** per user/phone number
- **Automatic window reset** after 60 minutes
- **429 error** returned when limit exceeded
- **Database tracking** of rate limits

### 4. Cost Tracking
- **Per-message cost**: ~$0.0075 per SMS
- **30-day statistics**: Total sent, failed, and cost
- **User dashboard**: View SMS usage and costs
- **Admin monitoring**: Track total SMS costs

## Database Schema

### Tables Created
1. **phone_verification_codes**
   - Stores verification codes with expiration
   - Links to user_id
   - Tracks verification status

2. **sms_notifications**
   - Logs all SMS sent
   - Tracks status (pending, sent, failed)
   - Records Twilio SID and cost
   - Stores error messages

3. **sms_rate_limits**
   - Tracks messages sent per user
   - Manages rate limiting windows
   - Resets after time window

4. **notification_preferences** (updated)
   - Added phone_number field
   - Added phone_verified boolean
   - Added sms_notifications toggle
   - Added individual SMS type preferences

## Edge Functions

### twilio-sms-service
**Endpoint**: `/functions/v1/twilio-sms-service`

**Actions**:

1. **Send Verification Code**
```typescript
{
  action: 'send_verification',
  userId: 'user-uuid',
  phoneNumber: '+15551234567'
}
```

2. **Verify Code**
```typescript
{
  action: 'verify_code',
  userId: 'user-uuid',
  phoneNumber: '+15551234567',
  verificationCode: '123456'
}
```

3. **Send SMS Notification**
```typescript
{
  action: 'send_sms',
  userId: 'user-uuid',
  phoneNumber: '+15551234567',
  message: 'Your booking is confirmed!',
  notificationType: 'booking_confirmed'
}
```

4. **Get SMS Statistics**
```typescript
{
  action: 'get_stats',
  userId: 'user-uuid'
}
```

### notification-manager (updated)
Now automatically sends SMS notifications for critical events when:
- User has SMS notifications enabled
- Phone number is verified
- Event type matches user preferences

## React Components

### SMSPhoneVerification
**Location**: `src/components/SMSPhoneVerification.tsx`

**Features**:
- Phone number input with validation
- Send verification code button
- 6-digit code input
- Real-time error handling
- Success feedback

**Usage**:
```tsx
<SMSPhoneVerification
  userId={user.id}
  onVerified={() => {
    // Handle successful verification
  }}
/>
```

### SMSPreferences
**Location**: `src/components/SMSPreferences.tsx`

**Features**:
- Enable/disable SMS notifications
- Individual notification type toggles
- Change phone number
- View SMS usage statistics
- Cost tracking display

**Usage**:
```tsx
<SMSPreferences userId={user.id} />
```

### NotificationPreferences (updated)
Now includes SMS preferences section with full phone verification and settings management.

## User Flow

### 1. Initial Setup
1. User goes to Notification Preferences
2. Clicks "Enable SMS Notifications"
3. Enters phone number
4. Clicks "Send Verification Code"
5. Receives SMS with 6-digit code
6. Enters code to verify
7. Phone is now verified

### 2. Receiving Notifications
1. User opts into specific notification types
2. When event occurs (booking, cancellation, etc.)
3. System checks user preferences
4. If SMS enabled and phone verified, sends SMS
5. User receives text message instantly

### 3. Managing Preferences
1. User can toggle individual notification types
2. Can change phone number (requires re-verification)
3. Can view SMS usage and costs
4. Can disable SMS at any time

## Twilio Configuration

### Required Environment Variables
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

### Twilio Setup
1. Create Twilio account at twilio.com
2. Get a phone number with SMS capability
3. Copy Account SID and Auth Token
4. Add to Supabase secrets (already configured)

## Rate Limiting Details

### Limits
- **10 SMS per hour** per user
- **Rolling window**: Resets 60 minutes after first message
- **Automatic reset**: No manual intervention needed

### How It Works
1. First SMS: Creates rate limit entry with window_start
2. Subsequent SMS: Increments messages_sent counter
3. After 60 minutes: Window resets, counter goes to 0
4. Exceeded limit: Returns 429 error, SMS not sent

## Cost Management

### Pricing
- **Approximate cost**: $0.0075 per SMS
- **Actual cost**: Varies by country and carrier
- **Tracked in database**: Real costs logged per message

### Monitoring
- **User dashboard**: Shows 30-day usage and costs
- **Admin panel**: Can view total platform costs
- **Budget alerts**: Can set up alerts for high usage

## Testing

### Test Phone Verification
```bash
# 1. Send verification code
curl -X POST https://your-project.supabase.co/functions/v1/twilio-sms-service \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_verification",
    "userId": "user-uuid",
    "phoneNumber": "+15551234567"
  }'

# 2. Verify code
curl -X POST https://your-project.supabase.co/functions/v1/twilio-sms-service \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "verify_code",
    "userId": "user-uuid",
    "phoneNumber": "+15551234567",
    "verificationCode": "123456"
  }'
```

### Test SMS Notification
```bash
curl -X POST https://your-project.supabase.co/functions/v1/twilio-sms-service \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send_sms",
    "userId": "user-uuid",
    "phoneNumber": "+15551234567",
    "message": "Test notification",
    "notificationType": "booking_confirmed"
  }'
```

## Security Considerations

### Phone Number Validation
- Format validation before sending
- Verification required before enabling SMS
- One phone per user account

### Rate Limiting
- Prevents SMS spam
- Protects against abuse
- Reduces costs

### Data Privacy
- Phone numbers encrypted at rest
- Only visible to user and admin
- Can be deleted by user

## Troubleshooting

### SMS Not Received
1. Check phone number format (must include country code)
2. Verify Twilio credentials are correct
3. Check Twilio account balance
4. Review sms_notifications table for errors

### Verification Code Expired
- Codes expire after 10 minutes
- Request new code
- Check system time is synchronized

### Rate Limit Exceeded
- Wait 60 minutes for window reset
- Or contact admin to manually reset

### High Costs
- Review notification preferences
- Disable unnecessary notification types
- Consider reducing reminder frequency

## Best Practices

### For Users
- Only enable SMS for critical notifications
- Keep phone number up to date
- Monitor usage in preferences

### For Admins
- Monitor total SMS costs regularly
- Set up budget alerts
- Review failed messages
- Clean up expired verification codes

### For Developers
- Always check rate limits before sending
- Log all SMS attempts
- Handle Twilio errors gracefully
- Test with real phone numbers

## Future Enhancements

### Planned Features
- [ ] International SMS support
- [ ] SMS templates for different events
- [ ] Bulk SMS for announcements
- [ ] SMS reply handling
- [ ] Two-way conversations via SMS
- [ ] SMS scheduling
- [ ] A/B testing for SMS content

## Support

### Common Issues
- **Invalid phone number**: Must include country code (+1 for US)
- **Twilio error 21211**: Invalid 'To' phone number
- **Twilio error 21608**: Unverified 'From' number (trial accounts)
- **Rate limit error**: Wait for window reset

### Getting Help
1. Check sms_notifications table for error messages
2. Review Twilio dashboard for delivery status
3. Check edge function logs
4. Contact support with Twilio SID

## Conclusion

The SMS notification system provides instant, reliable communication with users for critical events. With proper configuration, rate limiting, and cost tracking, it's a powerful addition to the notification system.
