# SMS Reminder System - Test Plan

**Feature:** SMS Reminder System  
**Date:** January 19, 2026  
**Status:** ✅ Code Complete - Ready for Testing

---

## Overview

The SMS Reminder System allows users to:
- Verify their phone number with 6-digit SMS codes
- Opt-in to receive SMS booking reminders
- Receive automated 24-hour booking reminders via SMS

---

## Components Implemented

### 1. Database Migration
- ✅ `supabase/migrations/20260119_sms_reminder_system.sql`
- Tables: `phone_verification_codes`, `booking_reminders` (updated)
- Profile fields: `phone_number`, `phone_verified`, `sms_opt_in`

### 2. Edge Functions
- ✅ `supabase/functions/sms-verification/index.ts` - Phone verification
- ✅ `supabase/functions/sms-booking-reminders/index.ts` - Send reminder SMS
- ✅ `supabase/functions/booking-reminder-scheduler/index.ts` - Automated scheduler

### 3. UI Components
- ✅ `src/components/PhoneVerification.tsx` - Phone verification UI
- ✅ `pages/settings.tsx` - Updated with phone verification integration

---

## Testing Checklist

### Phase 1: Phone Verification

#### Test 1.1: Send Verification Code
1. Navigate to Settings → Notifications tab
2. Enter phone number (e.g., +15551234567)
3. Click "Send Verification Code"
4. **Expected:** 
   - Success toast: "Verification code sent! Check your phone."
   - SMS received with 6-digit code
   - UI switches to verification step

#### Test 1.2: Verify Code
1. Enter the 6-digit code from SMS
2. Click "Verify Code"
3. **Expected:**
   - Success toast: "Phone number verified!"
   - Phone number shows as verified
   - SMS opt-in toggle becomes available

#### Test 1.3: Invalid Code
1. Enter incorrect verification code
2. Click "Verify Code"
3. **Expected:**
   - Error toast: "Invalid verification code"
   - Code input remains for retry

#### Test 1.4: Expired Code
1. Wait 10+ minutes after receiving code
2. Try to verify
3. **Expected:**
   - Error toast: "Verification code has expired"
   - Option to request new code

#### Test 1.5: Resend Code
1. Click "Resend Code" button
2. **Expected:**
   - New code sent
   - Previous code invalidated

---

### Phase 2: SMS Opt-In

#### Test 2.1: Enable SMS Reminders
1. After phone verification, toggle "SMS Booking Reminders" ON
2. **Expected:**
   - Success toast: "SMS notifications enabled"
   - Toggle shows as ON
   - Profile updated in database

#### Test 2.2: Disable SMS Reminders
1. Toggle "SMS Booking Reminders" OFF
2. **Expected:**
   - Success toast: "SMS notifications disabled"
   - Toggle shows as OFF

#### Test 2.3: Opt-In Without Verification
1. Without verifying phone, try to enable SMS
2. **Expected:**
   - Error toast: "Please verify your phone number first"
   - Toggle remains OFF

---

### Phase 3: Booking Reminders

#### Test 3.1: Create Booking with SMS Reminder
1. Create a booking for tomorrow
2. Enable SMS reminder in booking form
3. Ensure user has verified phone and SMS opt-in
4. **Expected:**
   - Booking created successfully
   - Reminder scheduled in database

#### Test 3.2: Manual Reminder Trigger
1. Create test booking for tomorrow
2. Manually trigger scheduler:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/booking-reminder-scheduler
   ```
3. **Expected:**
   - SMS reminder sent 24 hours before booking
   - Reminder recorded in `booking_reminders` table
   - SMS received with booking details

#### Test 3.3: Reminder Message Content
1. Receive SMS reminder
2. **Expected Message Format:**
   ```
   Hi [Customer Name]! Reminder: Your [Charter Name] booking is tomorrow at [Time]. See you soon! - Gulf Coast Charters
   ```

---

### Phase 4: Scheduler Functionality

#### Test 4.1: Automated Scheduler
1. Set up cron job (every 6 hours) or use external service
2. Create bookings at various time points:
   - 7 days out (1 week reminder)
   - 24 hours out (24h reminder)
   - 1 day after (follow-up)
3. **Expected:**
   - Scheduler runs automatically
   - Appropriate reminders sent
   - No duplicate reminders

#### Test 4.2: Scheduler Statistics
1. Check scheduler response after run
2. **Expected:**
   ```json
   {
     "success": true,
     "stats": {
       "email_1week": 2,
       "email_24h": 5,
       "email_followup": 3,
       "sms_24h": 4,
       "errors": []
     }
   }
   ```

---

### Phase 5: Edge Cases

#### Test 5.1: Invalid Phone Format
1. Enter phone without country code (e.g., "5551234567")
2. **Expected:**
   - Validation error
   - Cannot send code

#### Test 5.2: Unverified Phone Booking
1. Create booking with SMS reminder enabled
2. User has not verified phone
3. **Expected:**
   - Booking created
   - SMS reminder not sent (only email if enabled)

#### Test 5.3: Opted-Out User
1. User opts out of SMS
2. Create booking with SMS reminder
3. **Expected:**
   - Booking created
   - SMS reminder not sent

#### Test 5.4: Duplicate Reminders
1. Trigger scheduler multiple times for same booking
2. **Expected:**
   - Only one reminder sent per booking per type
   - Duplicate prevention works

---

## Environment Variables Required

### Supabase Edge Functions
```bash
SINCH_API_TOKEN=your_sinch_api_token
SINCH_SERVICE_PLAN_ID=your_service_plan_id
SINCH_PHONE_NUMBER=+1234567890
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Database Verification

### Check Phone Verification
```sql
SELECT * FROM phone_verification_codes 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC;
```

### Check Booking Reminders
```sql
SELECT * FROM booking_reminders 
WHERE user_id = 'user-uuid' 
ORDER BY scheduled_for DESC;
```

### Check Profile SMS Settings
```sql
SELECT phone_number, phone_verified, sms_opt_in 
FROM profiles 
WHERE id = 'user-uuid';
```

---

## Manual Testing Steps

1. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy sms-verification
   supabase functions deploy sms-booking-reminders
   supabase functions deploy booking-reminder-scheduler
   ```

2. **Run Database Migration:**
   - Execute `20260119_sms_reminder_system.sql` in Supabase SQL Editor

3. **Configure Sinch:**
   - Add environment variables to Supabase Edge Functions secrets

4. **Test Phone Verification:**
   - Use real phone number
   - Verify code delivery
   - Test verification flow

5. **Test Booking Reminders:**
   - Create test booking
   - Trigger scheduler manually
   - Verify SMS delivery

---

## Success Criteria

- ✅ Phone verification codes sent successfully
- ✅ Codes verified correctly
- ✅ SMS reminders sent 24 hours before booking
- ✅ Opt-in/opt-out preferences respected
- ✅ No duplicate reminders sent
- ✅ Scheduler runs automatically
- ✅ Error handling works correctly
- ✅ Database records created properly

---

## Known Limitations

1. **Sinch Configuration Required:**
   - Must configure Sinch API credentials
   - Phone number must be verified in Sinch

2. **Scheduler Setup:**
   - Requires external cron service or GitHub Actions
   - Manual trigger available for testing

3. **Email Reminders:**
   - Email reminder functionality referenced but not fully implemented
   - Focus on SMS for this feature

---

## Next Steps

1. Deploy edge functions to Supabase
2. Configure Sinch credentials
3. Run database migration
4. Test with real phone numbers
5. Set up automated scheduler (cron/GitHub Actions)
6. Monitor SMS delivery rates
7. Track costs in Sinch dashboard

---

**Status:** ✅ **READY FOR DEPLOYMENT AND TESTING**
