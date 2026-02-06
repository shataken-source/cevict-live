# Supabase Schema Response for Zapier AI

**Project:** `nqkbqtiramecvmmpaxzk`  
**URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co`  
**Service Role Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg`

---

## BOOKINGS TABLE SCHEMA

### Table: `bookings`

| Column Name | Data Type | Primary Key | Nullable | Default | Notes |
|-------------|-----------|-------------|----------|---------|-------|
| `id` | UUID | ✅ yes | no | `gen_random_uuid()` | Primary key - use for WHERE clause |
| `user_id` | UUID | no | yes | - | Customer user ID |
| `captain_id` | UUID | no | yes | - | Captain user ID |
| `charter_id` | UUID | no | yes | - | Charter listing ID |
| `booking_date` | TIMESTAMPTZ | no | yes | - | Date/time of booking |
| `status` | TEXT | no | yes | - | **Set to: `'confirmed'`** |
| `payment_status` | TEXT | no | yes | `'pending'` | **Set to: `'paid'`** |
| `stripe_checkout_session_id` | TEXT | no | yes | - | **Set to: `{{1.Id}}` from Stripe** |
| `stripe_payment_intent_id` | TEXT | no | yes | - | Stripe payment intent ID |
| `amount` | DECIMAL(10,2) | no | yes | - | Booking total amount |
| `commission_amount` | DECIMAL(10,2) | no | yes | - | Platform commission |
| `service_fee` | DECIMAL(10,2) | no | yes | - | Service fee |
| `captain_payout` | DECIMAL(10,2) | no | yes | - | Captain payout amount |
| `location` | TEXT | no | yes | - | Booking location string |
| `latitude` | DECIMAL(10,7) | no | yes | - | Location latitude |
| `longitude` | DECIMAL(10,7) | no | yes | - | Location longitude |
| `created_at` | TIMESTAMPTZ | no | yes | `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | no | yes | - | **Set to: `{{1.Created}}` from Stripe** |

---

## ZAPIER STEP 4 CONFIGURATION

### Update Supabase Booking Status

**App:** Webhooks by Zapier  
**Event:** POST  
**Method:** PATCH

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{1.Metadata Booking Id}}
```

**Headers:**
- `apikey`: `[GET FROM SUPABASE DASHBOARD → Settings → API → anon/public key]`
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

## OTHER IMPORTANT TABLES

### `profiles`
- `id` (UUID, PK) - User ID
- `email` (TEXT) - User email
- `phone_number` (TEXT) - User phone
- `phone_verified` (BOOLEAN) - Phone verification status
- `sms_opt_in` (BOOLEAN) - SMS opt-in status

### `captain_profiles`
- `id` (UUID, PK) - Captain ID
- `user_id` (UUID) - Links to auth.users
- `phone_number` (TEXT) - Captain phone

### `payments`
- `id` (UUID, PK)
- `booking_id` (UUID) - Links to bookings
- `user_id` (UUID) - Customer
- `amount` (DECIMAL)
- `status` (TEXT) - 'completed', 'failed', etc.
- `stripe_payment_intent_id` (TEXT)

---

## COMPLETE SCHEMA QUERY

To get ALL tables and columns, run this SQL in Supabase:

**Go to:** https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/sql

**Paste:**
```sql
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    CASE WHEN pk.column_name IS NOT NULL THEN 'yes' ELSE 'no' END AS is_primary_key,
    CASE WHEN c.is_nullable = 'YES' THEN 'yes' ELSE 'no' END AS is_nullable,
    c.column_default,
    c.udt_name AS postgres_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;
```

**Copy results and paste here for complete schema!**

---

**Status:** ✅ Bookings table schema ready for Zapier Step 4!
