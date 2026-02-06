# Check Webhook Logs for Tip Update

## Problem
- ✅ Webhook received `checkout.session.completed` event (200 OK)
- ❌ Tip still `pending` with `stripe_payment_intent_id` = NULL
- ❌ Tip not updated in database

## Check Supabase Logs

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click on `stripe-webhook` function**
3. **Click "Logs" tab**
4. **Look for entries around 8:05 PM** (when the webhook event was received)

**What to look for:**

### Success Indicators:
- ✅ `✅ Tip payment completed: <tip_id>`
- ✅ `✅ Payment completed: <session_id> for tip <tip_id>`

### Error Indicators:
- ❌ `Error updating tip:` (followed by error details)
- ❌ `Webhook signature verification failed`
- ❌ Any database errors

## Common Issues

### Issue 1: Tip ID Mismatch
**Symptom:** Webhook processes but tip_id in metadata doesn't match database

**Check:**
- Compare `tip_id` in Stripe event metadata vs database
- Make sure the checkout session includes the correct `tip_id` in metadata

### Issue 2: Database Update Error
**Symptom:** Logs show "Error updating tip" with database error

**Possible causes:**
- RLS (Row Level Security) blocking the update
- Foreign key constraint violation
- Tip doesn't exist in database

### Issue 3: Metadata Missing
**Symptom:** Webhook processes but doesn't find `metadata.type === 'tip'`

**Check:**
- Verify checkout session metadata includes `type: 'tip'` and `tip_id`
- Check the `stripe-checkout` function to ensure it's setting metadata correctly

## Next Steps

1. **Check Supabase logs** for specific error messages
2. **Verify tip_id** in Stripe event matches database
3. **Check checkout session metadata** to ensure it includes tip information
