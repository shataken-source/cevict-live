# Supabase Schema - Ready for Zapier

**Project:** `nqkbqtiramecvmmpaxzk`  
**URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co`

---

## BOOKINGS TABLE (For Zapier Step 4)

### Table: `bookings`

**Primary Key:** `id` (UUID)

**Key Columns for Zapier:**

| Column | Type | Nullable | Default | Zapier Use |
|--------|------|----------|---------|------------|
| `id` | UUID | no | `gen_random_uuid()` | Match with `{{1.Metadata Booking Id}}` |
| `status` | TEXT | yes | - | Set to `'confirmed'` |
| `payment_status` | TEXT | yes | `'pending'` | Set to `'paid'` |
| `stripe_checkout_session_id` | TEXT | yes | - | Set to `{{1.Id}}` |
| `updated_at` | TIMESTAMPTZ | yes | - | Set to `{{1.Created}}` |
| `user_id` | UUID | yes | - | For customer lookup |
| `captain_id` | UUID | yes | - | For captain notifications |
| `booking_date` | TIMESTAMPTZ | yes | - | Booking date/time |
| `amount` | DECIMAL(10,2) | yes | - | Booking amount |
| `created_at` | TIMESTAMPTZ | yes | `NOW()` | Creation time |

---

## ZAPIER STEP 4 CONFIGURATION (Copy-Paste Ready)

### Supabase Database Update

**App:** Webhooks by Zapier  
**Event:** POST  
**Method:** PATCH

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{1.Metadata Booking Id}}
```

**Headers (Add each one):**
1. Key: `apikey`  
   Value: `[GET FROM SUPABASE DASHBOARD → Settings → API → anon/public key]`

2. Key: `Authorization`  
   Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa2JxdGlyYW1lY3ZtbXBheHprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzYyOTAyMSwiZXhwIjoyMDc5MjA1MDIxfQ.fjAeZYDupPgsOJImWELs30Er9amRMlhvRI2sb7dJfDg`

3. Key: `Content-Type`  
   Value: `application/json`

4. Key: `Prefer`  
   Value: `return=minimal`

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

## GET SUPABASE ANON KEY

1. Go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/settings/api
2. Find **"Project API keys"** section
3. Copy the **"anon"** or **"public"** key (starts with `eyJ...`)
4. Paste it in the `apikey` header in Zapier

---

## COMPLETE SCHEMA QUERY

To get the full schema for all tables, run this in Supabase SQL Editor:

**File:** `SUPABASE_SCHEMA_QUERY.sql` (already created)

Or go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/sql

Paste and run the query from `SUPABASE_SCHEMA_QUERY.sql`

---

**Status:** ✅ Ready to configure Step 4 in Zapier! Just need the anon key from Supabase dashboard.
