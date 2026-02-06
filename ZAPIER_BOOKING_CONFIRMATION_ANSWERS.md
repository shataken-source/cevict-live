# Zapier Booking Confirmation Automation - Answers

**Date:** January 18, 2026  
**Projects:** Gulf Coast Charters (GCC) & Where To Vacation (WTV)

---

## 1. STRIPE

### Do you have a Stripe account connected to Zapier?
**Answer:** Not yet connected to Zapier. You'll need to connect it.

### Stripe Configuration:
- **Account:** Your Stripe account (connect in Zapier)
- **Webhook Event:** `checkout.session.completed` or `payment_intent.succeeded`
- **Metadata Fields Available:**
  - `bookingId` - Links to booking record
  - `customerEmail` - Customer email address
  - `customerName` - Customer name
  - `charterName` - Charter/booking name
  - `bookingDate` - Booking date
  - `amount` - Payment amount

**Action:** Connect your Stripe account in Zapier (if not already connected)

---

## 2. RESEND (Email Service)

### Do you have a Resend API key?
**Answer:** Resend is configured in the codebase, but you'll need to provide the API key.

### Resend Configuration:
- **API Key:** `RESEND_API_KEY` (get from https://resend.com)
- **From Email:** `noreply@gulfcoastcharters.com` (or your verified domain)
- **From Name:** `Gulf Coast Charters`
- **Reply-To:** `shataken@gmail.com` (or your support email)

### Email Template:

**Subject:**
```
Booking Confirmed - Your Gulf Coast Charter is Ready! 🎣
```

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
    .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎣 Booking Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi {{customerName}},</p>
      
      <p>Your booking has been confirmed! We're excited to have you join us for an amazing fishing experience.</p>
      
      <div class="booking-details">
        <h2>Booking Details</h2>
        <p><strong>Charter:</strong> {{charterName}}</p>
        <p><strong>Date:</strong> {{bookingDate}}</p>
        <p><strong>Time:</strong> {{bookingTime}}</p>
        <p><strong>Guests:</strong> {{guests}}</p>
        <p><strong>Total Paid:</strong> ${{amount}}</p>
        <p><strong>Booking ID:</strong> {{bookingId}}</p>
      </div>
      
      <p><strong>What's Next?</strong></p>
      <ul>
        <li>You'll receive a reminder 24 hours before your trip</li>
        <li>Check your booking details anytime in your dashboard</li>
        <li>If you have questions, reply to this email</li>
      </ul>
      
      <a href="{{bookingUrl}}" class="button">View Booking Details</a>
      
      <p>We can't wait to see you on the water!</p>
      
      <p>Best regards,<br>
      The Gulf Coast Charters Team</p>
    </div>
  </div>
</body>
</html>
```

**Action:** 
1. Get Resend API key from https://resend.com
2. Verify your domain or use their test domain
3. Add API key to Zapier

---

## 3. SINCH (SMS Service)

### Do you have a Sinch account connected to Zapier?
**Answer:** Sinch is configured in the codebase, but you'll need to connect it to Zapier.

### Sinch Configuration:
- **Service Plan ID:** `5ead1f97ab94481c80d3a52e13de95bb` (found in codebase)
- **API Token:** `78f84e980220406892c2cfccf515e755` (found in codebase)
- **Phone Number:** `+12085812971` (found in codebase)
- **API Endpoint:** `https://us.sms.api.sinch.com/xms/v1/{service_plan_id}/batches`

**Action:** Connect Sinch to Zapier (if available) or use Webhooks by Zapier to call Sinch API directly

### SMS Message Template:

```
🎣 Booking Confirmed!

Hi {{customerName}}, your {{charterName}} booking is confirmed for {{bookingDate}} at {{bookingTime}}.

Booking ID: {{bookingId}}
Total: ${{amount}}

You'll receive a reminder 24 hours before your trip. See you on the water!

- Gulf Coast Charters
```

**Action:** 
1. Connect Sinch to Zapier (if app available)
2. Or use Webhooks by Zapier to POST to Sinch API
3. Use the phone number: `+12085812971`

---

## 4. SUPABASE WEBHOOK

### What's your Supabase project URL?
**Answer:** You need to provide this. Format: `https://[your-project-ref].supabase.co`

**How to find:**
- Go to Supabase Dashboard
- Your project URL is in the top left or Settings → API

### What's your Supabase Service Role Key?
**Answer:** You need to provide this.

**How to find:**
- Supabase Dashboard → Settings → API → Service Role Key
- ⚠️ Keep this secret! Never share publicly

### Which table should we update?
**Answer:** `bookings` table

### What field indicates "confirmed" status?
**Answer:** 
- **Status field:** `status` = `'confirmed'`
- **Payment status field:** `payment_status` = `'paid'`

### Database Update Query:
```sql
UPDATE bookings
SET 
  status = 'confirmed',
  payment_status = 'paid',
  stripe_checkout_session_id = '{{stripe_session_id}}',
  updated_at = NOW()
WHERE id = '{{bookingId}}';
```

### Should we also update availability on the sister platform?
**Answer:** Yes, if it's a cross-platform booking.

**WTV Webhook URL (if needed):**
```
https://[wtv-project-ref].supabase.co/functions/v1/update-availability
```

**GCC Webhook URL (if needed):**
```
https://[gcc-project-ref].supabase.co/functions/v1/update-availability
```

**Action:** 
1. Provide your Supabase project URL
2. Provide your Supabase Service Role Key
3. Decide if you want cross-platform sync (GCC ↔ WTV)

---

## 5. SMS DETAILS

### What Sinch phone number should SMS come from?
**Answer:** `+12085812971` (from codebase)

### What should the SMS message say?
**Answer:** See template above in Section 3.

**Alternative Shorter Version:**
```
🎣 Booking confirmed! {{charterName}} on {{bookingDate}} at {{bookingTime}}. Booking ID: {{bookingId}}. Reminder sent 24h before. - Gulf Coast Charters
```

---

## SUMMARY FOR ZAPIER

### Trigger:
- **App:** Stripe
- **Event:** `checkout.session.completed` or `payment_intent.succeeded`
- **Filter:** Only when `metadata.bookingId` exists

### Actions (in order):

1. **Send Email (Resend)**
   - App: Resend (or Webhooks by Zapier)
   - To: `{{customerEmail}}` (from Stripe session)
   - Subject: "Booking Confirmed - Your Gulf Coast Charter is Ready! 🎣"
   - Body: Use HTML template above

2. **Send SMS (Sinch)**
   - App: Webhooks by Zapier (POST to Sinch API)
   - URL: `https://us.sms.api.sinch.com/xms/v1/5ead1f97ab94481c80d3a52e13de95bb/batches`
   - Headers:
     - `Authorization: Bearer 78f84e980220406892c2cfccf515e755`
     - `Content-Type: application/json`
   - Body:
     ```json
     {
       "from": "+12085812971",
       "to": ["{{customerPhone}}"],
       "body": "🎣 Booking Confirmed! Hi {{customerName}}, your {{charterName}} booking is confirmed for {{bookingDate}} at {{bookingTime}}. Booking ID: {{bookingId}}. - Gulf Coast Charters"
     }
     ```

3. **Update Supabase (Webhook)**
   - App: Webhooks by Zapier
   - Method: POST
   - URL: `https://[your-project].supabase.co/rest/v1/bookings?id=eq.{{bookingId}}`
   - Headers:
     - `apikey: [YOUR-SUPABASE-ANON-KEY]`
     - `Authorization: Bearer [YOUR-SUPABASE-SERVICE-ROLE-KEY]`
     - `Content-Type: application/json`
     - `Prefer: return=minimal`
   - Body:
     ```json
     {
       "status": "confirmed",
       "payment_status": "paid",
       "stripe_checkout_session_id": "{{stripe_session_id}}",
       "updated_at": "{{now}}"
     }
     ```

---

## WHAT YOU NEED TO PROVIDE

1. ✅ **Stripe Account** - Connect in Zapier
2. ⚠️ **Resend API Key** - Get from https://resend.com
3. ✅ **Sinch Credentials** - Already have (see above)
4. ⚠️ **Supabase Project URL** - From your dashboard
5. ⚠️ **Supabase Service Role Key** - From Settings → API
6. ⚠️ **Customer Phone Number** - Should be in Stripe metadata or booking record

---

## ALTERNATIVE: USE EXISTING EDGE FUNCTIONS

Instead of Zapier doing everything, you could:

1. **Stripe Webhook** → Calls your existing `stripe-webhook` edge function
2. **Edge Function** handles:
   - Updates booking status
   - Sends email (via Resend/Brevo)
   - Sends SMS (via Sinch)
   - Updates availability

This is simpler and uses your existing infrastructure!

**Edge Function URL:**
```
https://[your-project].supabase.co/functions/v1/stripe-webhook
```

**Webhook Secret:** Use your `STRIPE_WEBHOOK_SECRET`

---

**Status:** ✅ Ready to configure once you provide Supabase URL and Service Role Key!
