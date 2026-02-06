# Response for Zapier AI - Supabase Schema

**Supabase Project:** `nqkbqtiramecvmmpaxzk`  
**URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co`  
**Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg`

---

## 1. ALL TABLE NAMES (Public Schema)

Based on migration files, here are the main tables:
- `bookings` ⭐ (most important for this automation)
- `profiles`
- `captain_profiles`
- `payments`
- `charters`
- `booking_reminders`
- `phone_verification_codes`
- `sms_notifications`
- `sms_campaigns`
- `fishing_licenses`
- `captain_subscriptions`
- `featured_listings`
- `weather_alert_logs`
- `fishy_conversations`
- `fishy_learning_patterns`
- And many more...

---

## 2. BOOKINGS TABLE - Complete Schema

### Table: `bookings`

| Column Name | Data Type | Primary Key | Nullable | Default | Notes |
|-------------|-----------|-------------|----------|---------|-------|
| `id` | UUID | ✅ yes | no | `gen_random_uuid()` | **Use for WHERE clause: `id=eq.{{1.Metadata Booking Id}}`** |
| `user_id` | UUID | no | yes | - | Customer user ID |
| `captain_id` | UUID | no | yes | - | Captain user ID |
| `charter_id` | UUID | no | yes | - | Charter listing ID |
| `booking_date` | TIMESTAMPTZ | no | yes | - | Date/time of booking |
| `status` | TEXT | no | yes | - | **UPDATE TO: `'confirmed'`** |
| `payment_status` | TEXT | no | yes | `'pending'` | **UPDATE TO: `'paid'`** |
| `stripe_checkout_session_id` | TEXT | no | yes | - | **UPDATE TO: `{{1.Id}}` from Stripe** |
| `stripe_payment_intent_id` | TEXT | no | yes | - | Stripe payment intent |
| `amount` | DECIMAL(10,2) | no | yes | - | Booking total |
| `commission_amount` | DECIMAL(10,2) | no | yes | - | Platform commission |
| `service_fee` | DECIMAL(10,2) | no | yes | - | Service fee |
| `captain_payout` | DECIMAL(10,2) | no | yes | - | Captain payout |
| `location` | TEXT | no | yes | - | Booking location |
| `latitude` | DECIMAL(10,7) | no | yes | - | Location latitude |
| `longitude` | DECIMAL(10,7) | no | yes | - | Location longitude |
| `created_at` | TIMESTAMPTZ | no | yes | `NOW()` | Creation time |
| `updated_at` | TIMESTAMPTZ | no | yes | - | **UPDATE TO: `{{1.Created}}` from Stripe** |

---

## 3. ZAPIER STEP 4 - Supabase Update Configuration

**App:** Webhooks by Zapier  
**Event:** POST  
**Method:** PATCH

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{1.Metadata Booking Id}}
```

**Headers (Add 4 headers):**
1. **Key:** `apikey`  
   **Value:** `[GET FROM: Supabase Dashboard → Settings → API → anon/public key]`

2. **Key:** `Authorization`  
   **Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg`

3. **Key:** `Content-Type`  
   **Value:** `application/json`

4. **Key:** `Prefer`  
   **Value:** `return=minimal`

**Data (JSON):**
```json
{
  "status": "confirmed",
  "payment_status": "paid",
  "stripe_checkout_session_id": "{{1.Id}}",
  "updated_at": "{{1.Created}}"
}
```

---

## 4. FIELD MAPPING FROM STRIPE

After connecting Stripe, use these Zapier field variables:

| What You Need | Zapier Variable | Used In |
|--------------|----------------|---------|
| Booking ID | `{{1.Metadata Booking Id}}` or `{{1.Metadata.bookingId}}` | Database WHERE clause |
| Customer Email | `{{1.Customer Email}}` or `{{1.Customer Email Address}}` | Resend email action |
| Customer Name | `{{1.Customer Name}}` or `{{1.Customer Details Name}}` | Email/SMS greeting |
| Customer Phone | `{{1.Metadata Customer Phone}}` or `{{1.Metadata.customerPhone}}` | Sinch SMS action |
| Charter Name | `{{1.Metadata Charter Name}}` or `{{1.Metadata.charterName}}` | Email/SMS content |
| Booking Date | `{{1.Metadata Booking Date}}` or `{{1.Metadata.bookingDate}}` | Email/SMS content |
| Booking Time | `{{1.Metadata Booking Time}}` or `{{1.Metadata.bookingTime}}` | Email/SMS content |
| Amount | `{{1.Amount Total}}` | Email content (divide by 100 for dollars) |
| Session ID | `{{1.Id}}` | Database `stripe_checkout_session_id` |
| Created Time | `{{1.Created}}` | Database `updated_at` |

**Note:** After connecting Stripe, click the field picker (📋) to see exact field names from test data.

---

## 5. STATUS FIELD VALUES

**`status` field accepts:**
- `'pending'`
- `'confirmed'` ⭐ **Use this**
- `'cancelled'`
- `'completed'`

**`payment_status` field accepts:**
- `'pending'`
- `'paid'` ⭐ **Use this**
- `'failed'`
- `'refunded'`

---

## 6. GET SUPABASE ANON KEY

1. Go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/settings/api
2. Find **"Project API keys"** section
3. Copy the **"anon"** or **"public"** key (starts with `eyJ...`)
4. Use it in the `apikey` header

---

## SUMMARY FOR ZAPIER AI

**Table to update:** `bookings`  
**Primary key:** `id` (UUID)  
**WHERE clause:** `id=eq.{{1.Metadata Booking Id}}`  
**Fields to update:**
- `status` → `'confirmed'`
- `payment_status` → `'paid'`
- `stripe_checkout_session_id` → `{{1.Id}}`
- `updated_at` → `{{1.Created}}`

**URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{1.Metadata Booking Id}}`  
**Method:** `PATCH`  
**Service Role Key:** (provided above)

---

**Status:** ✅ Ready to configure Step 4 in Zapier!
