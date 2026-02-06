# Supabase Database Schema for Zapier

**Project:** `nqkbqtiramecvmmpaxzk`  
**URL:** `https://nqkbqtiramecvmmpaxzk.supabase.co`  
**Date:** January 18, 2026

---

## SQL Query to Get Full Schema

Run this in **Supabase SQL Editor** (https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/sql):

```sql
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'yes'
        ELSE 'no'
    END AS is_primary_key,
    CASE 
        WHEN c.is_nullable = 'YES' THEN 'yes'
        ELSE 'no'
    END AS is_nullable,
    c.column_default,
    c.udt_name AS postgres_type
FROM 
    information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
        SELECT 
            ku.table_name,
            ku.column_name
        FROM 
            information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku 
                ON tc.constraint_name = ku.constraint_name
        WHERE 
            tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name,
    c.ordinal_position;
```

**Copy the results and paste them here!**

---

## BOOKINGS TABLE (Most Important for Zapier)

Based on migration files, here's the `bookings` table structure:

### Table: `bookings`

| Column Name | Data Type | Primary Key | Nullable | Default | Notes |
|-------------|-----------|-------------|----------|---------|-------|
| `id` | UUID | ✅ yes | no | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | no | yes | - | References `auth.users(id)` |
| `captain_id` | UUID | no | yes | - | References captain profile |
| `charter_id` | UUID | no | yes | - | References charter |
| `booking_date` | TIMESTAMPTZ | no | yes | - | Date/time of booking |
| `status` | TEXT | no | yes | - | Values: 'pending', 'confirmed', 'cancelled', 'completed' |
| `payment_status` | TEXT | no | yes | - | Values: 'pending', 'paid', 'failed', 'refunded' |
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

### Key Fields for Zapier:

**To Update:**
- `status` → Set to `'confirmed'`
- `payment_status` → Set to `'paid'`
- `stripe_checkout_session_id` → From Stripe session ID
- `updated_at` → Set to current timestamp

**To Query:**
- `id` → Match with `metadata.bookingId` from Stripe
- `user_id` → For customer lookup
- `captain_id` → For captain notifications

---

## OTHER IMPORTANT TABLES

### Table: `profiles`
- `id` (UUID, PK) - User ID
- `email` (TEXT) - User email
- `phone_number` (TEXT) - User phone
- `phone_verified` (BOOLEAN) - Phone verification status
- `sms_opt_in` (BOOLEAN) - SMS opt-in status

### Table: `captain_profiles`
- `id` (UUID, PK) - Captain ID
- `user_id` (UUID) - Links to auth.users
- `phone_number` (TEXT) - Captain phone
- `home_port` (TEXT) - Captain location

### Table: `payments`
- `id` (UUID, PK)
- `booking_id` (UUID) - Links to bookings
- `user_id` (UUID) - Customer
- `amount` (DECIMAL)
- `status` (TEXT) - 'completed', 'failed', etc.
- `stripe_payment_intent_id` (TEXT)

---

## ZAPIER UPDATE QUERY

For Step 4 (Supabase Update), use this:

**URL:**
```
https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/bookings?id=eq.{{1.Metadata Booking Id}}
```

**Method:** `PATCH`

**Headers:**
- `apikey`: [Your anon key]
- `Authorization`: `Bearer [Service Role Key]`
- `Content-Type`: `application/json`
- `Prefer`: `return=minimal`

**Body:**
```json
{
  "status": "confirmed",
  "payment_status": "paid",
  "stripe_checkout_session_id": "{{1.Id}}",
  "updated_at": "{{1.Created}}"
}
```

---

**Next Step:** Run the SQL query above in Supabase SQL Editor and paste the full results here for complete schema documentation!
