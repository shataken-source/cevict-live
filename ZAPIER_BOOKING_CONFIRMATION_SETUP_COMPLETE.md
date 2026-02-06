# Zapier Booking Confirmation Automation - Complete Setup

**Date:** January 18, 2026  
**Projects:** Gulf Coast Charters (GCC) & Where To Vacation (WTV)  
**Status:** ✅ Ready to configure in Zapier

---

## YOUR CONFIGURATION

### Supabase
- **Project URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co`
- **Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg`
- **Anon Key:** Get from Supabase Dashboard → Settings → API (needed for REST API calls)

### Sinch SMS
- **Service Plan ID:** `5ead1f97ab94481c80d3a52e13de95bb`
- **API Token:** `78f84e980220406892c2cfccf515e755`
- **Phone Number:** `+12085812971`

### Resend Email
- **API Key:** Get from https://resend.com
- **From Email:** `noreply@gulfcoastcharters.com` (or your verified domain)
- **From Name:** `Gulf Coast Charters`

---

## ZAPIER SETUP STEPS

### Step 1: Create New Zap

1. Go to Zapier → Create Zap
2. Name it: **"GCC & WTV - Booking Confirmation Automation"**

---

### Step 2: Set Trigger

**Trigger App:** Stripe  
**Trigger Event:** New Payment (or `checkout.session.completed`)

**Settings:**
- Connect your Stripe account
- Event: `checkout.session.completed`
- **Filter:** Only continue if `metadata.bookingId` exists

---

### Step 3: Action 1 - Send Confirmation Email (Resend)

**Option A: Use Resend App (if available)**
- **App:** Resend
- **Event:** Send Email
- **To:** `{{customer_email}}` (from Stripe session)
- **From:** `noreply@gulfcoastcharters.com`
- **Subject:** `Booking Confirmed - Your Gulf Coast Charter is Ready! 🎣`
- **HTML Body:** (see template below)

**Option B: Use Webhooks by Zapier**
- **App:** Webhooks by Zapier
- **Event:** POST
- **URL:** `https://api.resend.com/emails`
- **Method:** POST
- **Headers:**
  ```
  Authorization: Bearer [YOUR-RESEND-API-KEY]
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "from": "Gulf Coast Charters <noreply@gulfcoastcharters.com>",
    "to": ["{{customer_email}}"],
    "subject": "Booking Confirmed - Your Gulf Coast Charter is Ready! 🎣",
    "html": "[HTML_TEMPLATE_BELOW]"
  }
  ```

**Email HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 20px; background: #f9fafb; }
    .booking-details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #1e40af; }
    .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎣 Booking Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi {{customer_name}},</p>
      
      <p>Your booking has been confirmed! We're excited to have you join us for an amazing fishing experience.</p>
      
      <div class="booking-details">
        <h2>Booking Details</h2>
        <p><strong>Charter:</strong> {{charter_name}}</p>
        <p><strong>Date:</strong> {{booking_date}}</p>
        <p><strong>Time:</strong> {{booking_time}}</p>
        <p><strong>Guests:</strong> {{guests}}</p>
        <p><strong>Total Paid:</strong> ${{amount_total}}</p>
        <p><strong>Booking ID:</strong> {{booking_id}}</p>
      </div>
      
      <p><strong>What's Next?</strong></p>
      <ul>
        <li>You'll receive a reminder 24 hours before your trip</li>
        <li>Check your booking details anytime in your dashboard</li>
        <li>If you have questions, reply to this email</li>
      </ul>
      
      <a href="https://gulfcoastcharters.com/bookings/{{booking_id}}" class="button">View Booking Details</a>
      
      <p>We can't wait to see you on the water!</p>
      
      <p>Best regards,<br>
      The Gulf Coast Charters Team</p>
    </div>
    <div class="footer">
      <p>Gulf Coast Charters | <a href="https://gulfcoastcharters.com">gulfcoastcharters.com</a></p>
    </div>
  </div>
</body>
</html>
```

---

### Step 4: Action 2 - Send Confirmation SMS (Sinch)

**App:** Webhooks by Zapier  
**Event:** POST

**URL:**
```
https://us.sms.api.sinch.com/xms/v1/5ead1f97ab94481c80d3a52e13de95bb/batches
```

**Method:** POST

**Headers:**
```
Authorization: Bearer 78f84e980220406892c2cfccf515e755
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "from": "+12085812971",
  "to": ["{{customer_phone}}"],
  "body": "🎣 Booking Confirmed! Hi {{customer_name}}, your {{charter_name}} booking is confirmed for {{booking_date}} at {{booking_time}}. Booking ID: {{booking_id}}. You'll receive a reminder 24h before. - Gulf Coast Charters"
}
```

**Note:** Make sure `customer_phone` is in Stripe metadata or booking record. Format: `+1234567890`

---

### Step 5: Action 3 - Update Supabase Booking Status

**App:** Webhooks by Zapier  
**Event:** POST

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{booking_id}}
```

**Method:** PATCH (or POST with proper filtering)

**Headers:**
```
apikey: [GET-FROM-SUPABASE-DASHBOARD]
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg
Content-Type: application/json
Prefer: return=minimal
```

**Body (JSON):**
```json
{
  "status": "confirmed",
  "payment_status": "paid",
  "stripe_checkout_session_id": "{{checkout_session_id}}",
  "updated_at": "{{now}}"
}
```

**Alternative: Use Supabase Edge Function**
Instead of direct REST API, you could call your existing edge function:

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/functions/v1/stripe-webhook
```

**Method:** POST

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg
Content-Type: application/json
```

**Body:** Forward the entire Stripe webhook payload

---

### Step 6: Action 4 (Optional) - Update Availability on Sister Platform

If this is a cross-platform booking (GCC ↔ WTV):

**App:** Webhooks by Zapier  
**Event:** POST

**URL (WTV):**
```
https://[wtv-project-ref].supabase.co/functions/v1/update-availability
```

**Method:** POST

**Headers:**
```
Authorization: Bearer [WTV-SERVICE-ROLE-KEY]
Content-Type: application/json
```

**Body:**
```json
{
  "booking_id": "{{booking_id}}",
  "platform": "gcc",
  "action": "block_availability"
}
```

---

## DATA MAPPING

### From Stripe Webhook:

| Stripe Field | Zapier Variable | Used For |
|-------------|----------------|----------|
| `customer_email` | `{{customer_email}}` | Email recipient |
| `customer_details.name` | `{{customer_name}}` | Email/SMS greeting |
| `metadata.bookingId` | `{{booking_id}}` | Database update |
| `metadata.customerPhone` | `{{customer_phone}}` | SMS recipient |
| `metadata.charterName` | `{{charter_name}}` | Email/SMS content |
| `metadata.bookingDate` | `{{booking_date}}` | Email/SMS content |
| `metadata.bookingTime` | `{{booking_time}}` | Email/SMS content |
| `metadata.guests` | `{{guests}}` | Email content |
| `amount_total` | `{{amount_total}}` | Email content (divide by 100 for dollars) |
| `id` | `{{checkout_session_id}}` | Database update |

---

## TESTING

### Test the Zap:

1. **Create a test booking** in Stripe (use test mode)
2. **Complete payment** with test card: `4242 4242 4242 4242`
3. **Check Zapier history** to see if all actions ran
4. **Verify:**
   - ✅ Email sent to customer
   - ✅ SMS sent to customer (if phone in metadata)
   - ✅ Booking status updated in Supabase
   - ✅ Availability updated (if cross-platform)

### Test Queries:

**Check booking status:**
```sql
SELECT id, status, payment_status, stripe_checkout_session_id, updated_at
FROM bookings
WHERE id = 'YOUR-BOOKING-ID';
```

**Check recent confirmations:**
```sql
SELECT id, status, payment_status, created_at
FROM bookings
WHERE status = 'confirmed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## TROUBLESHOOTING

### Email Not Sending
- ✅ Check Resend API key is correct
- ✅ Verify domain is verified in Resend
- ✅ Check Zapier logs for errors
- ✅ Verify `customer_email` is in Stripe session

### SMS Not Sending
- ✅ Check Sinch credentials are correct
- ✅ Verify `customer_phone` is in Stripe metadata
- ✅ Phone format must be E.164: `+1234567890`
- ✅ Check Zapier logs for Sinch API errors

### Database Not Updating
- ✅ Verify Service Role Key is correct
- ✅ Check booking ID exists in database
- ✅ Verify table name is `bookings` (not `booking`)
- ✅ Check Supabase logs for errors
- ✅ Verify RLS policies allow updates

### Zap Not Triggering
- ✅ Verify Stripe webhook is connected
- ✅ Check Stripe webhook events in dashboard
- ✅ Verify filter condition (`metadata.bookingId` exists)
- ✅ Test with Stripe test mode first

---

## ALTERNATIVE: USE EXISTING EDGE FUNCTION

**Simpler Option:** Instead of Zapier doing everything, just point Stripe webhooks to your existing edge function:

**Stripe Webhook URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/functions/v1/stripe-webhook
```

**Webhook Secret:** Use your `STRIPE_WEBHOOK_SECRET` from environment variables

**Benefits:**
- ✅ Uses your existing code
- ✅ Already handles emails, SMS, and database updates
- ✅ Less Zapier tasks = lower cost
- ✅ Easier to maintain

**Your existing `stripe-webhook` function already:**
- Updates booking status to `confirmed`
- Updates payment status to `paid`
- Creates payment records
- Can be extended to send emails/SMS

---

## SECURITY NOTES

⚠️ **Important:**
- Service Role Key has full database access - keep it secret!
- Never commit keys to git
- Use Zapier's secure storage for sensitive values
- Rotate keys regularly
- Monitor Zapier logs for unauthorized access

---

## NEXT STEPS

1. ✅ **Connect Stripe** to Zapier
2. ⚠️ **Get Resend API Key** from https://resend.com
3. ✅ **Set up Actions 1-3** (Email, SMS, Database)
4. ⚠️ **Test with Stripe test mode**
5. ✅ **Turn on Zap** when ready
6. ⚠️ **Monitor first few real bookings**

---

**Status:** ✅ Ready to configure! Just need Resend API key and you're good to go!
