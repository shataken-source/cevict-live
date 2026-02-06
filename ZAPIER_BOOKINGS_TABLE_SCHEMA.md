# Bookings Table Schema for Zapier

**Table:** `bookings`  
**Project:** `nqkbqtiramecvmmpaxzk`  
**URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co`

---

## BOOKINGS TABLE STRUCTURE

Based on migration files and code references, here's the `bookings` table schema:

### Complete Column List:

| Column Name | Data Type | Primary Key | Nullable | Default | Notes |
|-------------|-----------|-------------|----------|---------|-------|
| `id` | UUID | ✅ yes | no | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | no | yes | - | References `auth.users(id)` |
| `captain_id` | UUID | no | yes | - | References captain profile |
| `charter_id` | UUID | no | yes | - | References charter |
| `booking_date` | TIMESTAMPTZ | no | yes | - | Date/time of booking |
| `status` | TEXT | no | yes | - | Values: 'pending', 'confirmed', 'cancelled', 'completed' |
| `payment_status` | TEXT | no | yes | `'pending'` | Values: 'pending', 'paid', 'failed', 'refunded' |
| `stripe_checkout_session_id` | TEXT | no | yes | - | Stripe session ID |
| `stripe_payment_intent_id` | TEXT | no | yes | - | Stripe payment intent |
| `amount` | DECIMAL(10,2) | no | yes | - | Total booking amount |
| `commission_amount` | DECIMAL(10,2) | no | yes | - | Platform commission |
| `service_fee` | DECIMAL(10,2) | no | yes | - | Service fee |
| `captain_payout` | DECIMAL(10,2) | no | yes | - | Amount to pay captain |
| `location` | TEXT | no | yes | - | Booking location |
| `latitude` | DECIMAL(10,7) | no | yes | - | Location latitude |
| `longitude` | DECIMAL(10,7) | no | yes | - | Location longitude |
| `created_at` | TIMESTAMPTZ | no | yes | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | no | yes | - | Last update timestamp |

---

## ZAPIER UPDATE CONFIGURATION

### Step 4: Update Supabase Booking Status

**App:** Webhooks by Zapier  
**Event:** POST

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{1.Metadata Booking Id}}
```

**Method:** `PATCH`

**Headers:**
- `apikey`: `[GET FROM SUPABASE DASHBOARD]`
- `Authorization`: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg`
- `Content-Type`: `application/json`
- `Prefer`: `return=minimal`

**Body (JSON):**
```json
{
  "status": "confirmed",
  "payment_status": "paid",
  "stripe_checkout_session_id": "{{1.Id}}",
  "updated_at": "{{1.Created}}"
}
```

---

## GET SUPABASE ANON KEY

To get the `apikey` header value:

1. Go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/settings/api
2. Copy the **"anon"** or **"public"** key
3. Use it in the `apikey` header

---

## FIELD MAPPING FROM STRIPE

After connecting Stripe, map these fields:

| Zapier Variable | Maps To | Used In |
|----------------|---------|---------|
| `{{1.Metadata Booking Id}}` | `bookings.id` | Database update URL |
| `{{1.Id}}` | `bookings.stripe_checkout_session_id` | Database update body |
| `{{1.Created}}` | `bookings.updated_at` | Database update body |
| `{{1.Customer Email}}` | Email recipient | Resend action |
| `{{1.Metadata Customer Phone}}` | SMS recipient | Sinch action |
| `{{1.Metadata Customer Name}}` | Email/SMS greeting | Resend/Sinch actions |

---

## TEST THE UPDATE

After setting up, test with:

1. Create a test booking in Stripe (test mode)
2. Complete payment
3. Check Supabase:
   ```sql
   SELECT id, status, payment_status, stripe_checkout_session_id, updated_at
   FROM bookings
   WHERE id = 'YOUR-TEST-BOOKING-ID';
   ```

---

**Next:** Run `SUPABASE_SCHEMA_QUERY.sql` in Supabase SQL Editor to get the complete schema for all tables!
