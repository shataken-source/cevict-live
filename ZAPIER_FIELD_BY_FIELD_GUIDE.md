# Zapier Field-by-Field Configuration Guide

**Quick reference for filling in each step's right-side panel**

---

## STEP 1: STRIPE TRIGGER (Current Step)

### Right Side Panel Fields:

**App:** 
- ✅ Already set to "Stripe"
- No change needed

**Trigger event:**
- Select: **"New Payment"** or **"checkout.session.completed"** (if available)
- If "New Payment" is selected, that's fine - it will catch payment completions

**Account:**
- Click the purple **"Sign in"** button
- This will open Stripe OAuth
- Sign in with your Stripe account credentials
- Authorize Zapier to access your Stripe account
- Once connected, your account email will appear here

**Filter (Optional - Add after connecting):**
- Click "Add filter" or "Only continue if..."
- Field: `metadata.bookingId`
- Condition: "exists" or "is not empty"
- This ensures only booking payments trigger the Zap

---

## STEP 2: RESEND EMAIL ACTION

### Right Side Panel Fields:

**App:**
- Select: **"Resend"** (if available) OR **"Webhooks by Zapier"**

**If using Resend App:**
- **Event:** "Send Email"
- **Account:** Click "Sign in" → Connect Resend account with API key
- **To:** `{{1.Customer Email}}` (from Stripe step)
- **From:** `noreply@gulfcoastcharters.com`
- **Subject:** `Booking Confirmed - Your Gulf Coast Charter is Ready! 🎣`
- **HTML Body:** (paste the HTML template from setup guide)

**If using Webhooks by Zapier (Alternative):**
- **Event:** "POST"
- **URL:** `https://api.resend.com/emails`
- **Method:** `POST`
- **Headers:**
  - Key: `Authorization`, Value: `Bearer [YOUR-RESEND-API-KEY]`
  - Key: `Content-Type`, Value: `application/json`
- **Data (JSON):**
  ```json
  {
    "from": "Gulf Coast Charters <noreply@gulfcoastcharters.com>",
    "to": ["{{1.Customer Email}}"],
    "subject": "Booking Confirmed - Your Gulf Coast Charter is Ready! 🎣",
    "html": "[PASTE HTML TEMPLATE]"
  }
  ```

---

## STEP 3: SINCH SMS ACTION

### Right Side Panel Fields:

**App:**
- Select: **"Webhooks by Zapier"**

**Event:**
- Select: **"POST"**

**URL:**
```
https://us.sms.api.sinch.com/xms/v1/5ead1f97ab94481c80d3a52e13de95bb/batches
```

**Method:**
- Select: **"POST"**

**Headers:**
- Click "Add Header"
  - Key: `Authorization`
  - Value: `Bearer 78f84e980220406892c2cfccf515e755`
- Click "Add Header"
  - Key: `Content-Type`
  - Value: `application/json`

**Data (JSON):**
- Select: **"JSON"** format
- Paste:
  ```json
  {
    "from": "+12085812971",
    "to": ["{{1.Metadata Customer Phone}}"],
    "body": "🎣 Booking Confirmed! Hi {{1.Metadata Customer Name}}, your {{1.Metadata Charter Name}} booking is confirmed for {{1.Metadata Booking Date}} at {{1.Metadata Booking Time}}. Booking ID: {{1.Metadata Booking Id}}. - Gulf Coast Charters"
  }
  ```

**Note:** Adjust field names based on what Zapier shows from Stripe (e.g., `{{1.Metadata.bookingId}}` or `{{1.Metadata Booking Id}}`)

---

## STEP 4: SUPABASE DATABASE UPDATE

### Right Side Panel Fields:

**App:**
- Select: **"Webhooks by Zapier"**

**Event:**
- Select: **"POST"** or **"PATCH"**

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{1.Metadata Booking Id}}
```

**Method:**
- Select: **"PATCH"** (to update existing record)

**Headers:**
- Click "Add Header"
  - Key: `apikey`
  - Value: `[GET FROM SUPABASE DASHBOARD - Settings → API → anon/public key]`
- Click "Add Header"
  - Key: `Authorization`
  - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg`
- Click "Add Header"
  - Key: `Content-Type`
  - Value: `application/json`
- Click "Add Header"
  - Key: `Prefer`
  - Value: `return=minimal`

**Data (JSON):**
- Select: **"JSON"** format
- Paste:
  ```json
  {
    "status": "confirmed",
    "payment_status": "paid",
    "stripe_checkout_session_id": "{{1.Id}}",
    "updated_at": "{{1.Created}}"
  }
  ```

---

## FIELD MAPPING REFERENCE

### How Zapier Names Fields from Stripe:

When you connect Stripe, Zapier will show available fields. Common names:

| What You Need | Zapier Field Name (Example) |
|--------------|----------------------------|
| Customer Email | `{{1.Customer Email}}` or `{{1.Customer Email Address}}` |
| Customer Name | `{{1.Customer Name}}` or `{{1.Customer Details Name}}` |
| Booking ID | `{{1.Metadata Booking Id}}` or `{{1.Metadata.bookingId}}` |
| Customer Phone | `{{1.Metadata Customer Phone}}` or `{{1.Metadata.customerPhone}}` |
| Charter Name | `{{1.Metadata Charter Name}}` or `{{1.Metadata.charterName}}` |
| Booking Date | `{{1.Metadata Booking Date}}` or `{{1.Metadata.bookingDate}}` |
| Booking Time | `{{1.Metadata Booking Time}}` or `{{1.Metadata.bookingTime}}` |
| Amount | `{{1.Amount Total}}` (divide by 100 for dollars) |
| Session ID | `{{1.Id}}` or `{{1.Checkout Session Id}}` |

**Tip:** After connecting Stripe, click the field dropdown to see all available fields from the test data.

---

## QUICK TIPS

1. **Connecting Accounts:**
   - Click "Sign in" buttons to connect each service
   - Zapier uses OAuth (secure, no passwords stored)

2. **Field Names:**
   - Use the dropdown (📋 icon) next to fields to select from previous steps
   - Zapier auto-suggests available fields

3. **Testing:**
   - After each step, click "Test" to verify it works
   - Fix errors before moving to next step

4. **Metadata Fields:**
   - Stripe metadata fields might be nested
   - Look for `Metadata` section in field picker
   - Format might be `{{1.Metadata.bookingId}}` or `{{1.Metadata Booking Id}}`

---

## CURRENT STEP: STRIPE CONNECTION

**What to do RIGHT NOW:**

1. **Click the purple "Sign in" button** in the Account field
2. **Sign in to Stripe** (use your Stripe account credentials)
3. **Authorize Zapier** to access your Stripe account
4. **Select the account** if you have multiple Stripe accounts
5. **Choose trigger event:** "New Payment" (or "checkout.session.completed" if available)
6. **Click "Continue"** or "Test" to proceed

Once Stripe is connected, you'll see test data and can map fields to the next steps!

---

**Need help with a specific field?** Let me know which step and field you're stuck on!
